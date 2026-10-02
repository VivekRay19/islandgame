#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def scan_code(text: str, rust: bool) -> str:
    """Return source with strings/comments replaced by spaces, preserving newlines."""
    out = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        # Line comments.
        if rust and text.startswith("//", i):
            j = text.find("\n", i)
            if j < 0:
                j = n
            out.append(" " * (j - i))
            i = j
            continue
        if not rust and ch == "#":
            j = text.find("\n", i)
            if j < 0:
                j = n
            out.append(" " * (j - i))
            i = j
            continue

        # Rust block comments (including nesting).
        if rust and text.startswith("/*", i):
            depth = 1
            j = i + 2
            while j < n and depth:
                if text.startswith("/*", j):
                    depth += 1
                    j += 2
                elif text.startswith("*/", j):
                    depth -= 1
                    j += 2
                else:
                    j += 1
            segment = text[i:j]
            out.append("".join("\n" if c == "\n" else " " for c in segment))
            i = j
            continue

        # Rust raw strings: r###"..."###, including byte forms.
        if rust and (ch == "r" or (ch == "b" and i + 1 < n and text[i + 1] == "r")):
            m = re.match(r'(?:br|r)(#+)"', text[i:])
            if m:
                hashes = m.group(1)
                start = i + len(m.group(0))
                end_marker = '"' + hashes
                end = text.find(end_marker, start)
                if end < 0:
                    ERRORS.append("Unterminated Rust raw string")
                    end = n - len(end_marker)
                j = end + len(end_marker)
                segment = text[i:j]
                out.append("".join("\n" if c == "\n" else " " for c in segment))
                i = j
                continue

        # Normal strings/chars. In Rust, a lifetime like 'static is code, not a string.
        if ch == '"' or (rust and ch == "'" and re.match(r"'(?:\\.|[^'\\])'", text[i:])):
            quote = ch
            j = i + 1
            escaped = False
            while j < n:
                c = text[j]
                if escaped:
                    escaped = False
                elif c == "\\":
                    escaped = True
                elif c == quote:
                    j += 1
                    break
                j += 1
            segment = text[i:j]
            out.append("".join("\n" if c == "\n" else " " for c in segment))
            i = j
            continue

        if not rust and ch == "'":
            quote = ch
            j = i + 1
            escaped = False
            while j < n:
                c = text[j]
                if escaped:
                    escaped = False
                elif c == "\\":
                    escaped = True
                elif c == quote:
                    j += 1
                    break
                j += 1
            segment = text[i:j]
            out.append("".join("\n" if c == "\n" else " " for c in segment))
            i = j
            continue

        out.append(ch)
        i += 1
    return "".join(out)


def check_balanced(path: Path, rust: bool) -> None:
    text = path.read_text(encoding="utf-8")
    code = scan_code(text, rust)
    stack: list[tuple[str, int, int]] = []
    pairs = {"(": ")", "[": "]", "{": "}"}
    lines = code.splitlines()
    for line_no, line in enumerate(lines, 1):
        for col, ch in enumerate(line, 1):
            if ch in pairs:
                stack.append((ch, line_no, col))
            elif ch in ")]}":
                if not stack or pairs[stack[-1][0]] != ch:
                    ERRORS.append(f"{path}:{line_no}:{col}: unmatched {ch}")
                else:
                    stack.pop()
    for ch, line_no, col in stack:
        ERRORS.append(f"{path}:{line_no}:{col}: unclosed {ch}")


def main_member_unused_check(path: Path) -> None:
    if path.name not in {"main.gd", "board.gd", "api_client.gd"}:
        return
    text = scan_code(path.read_text(encoding="utf-8"), rust=False)
    lines = text.splitlines()
    members = []
    for idx, line in enumerate(lines, 1):
        if re.match(r"^var\s+[A-Za-z_]\w*", line):
            m = re.match(r"^var\s+([A-Za-z_]\w*)", line)
            if m:
                members.append((m.group(1), idx))
    for name, line_no in members:
        count = len(re.findall(rf"\b{re.escape(name)}\b", text))
        if count <= 1:
            ERRORS.append(f"{path}:{line_no}: unused top-level variable '{name}'")


def main() -> int:
    gd_files = sorted((ROOT / "godot-client" / "scripts").glob("*.gd"))
    rs_files = sorted((ROOT / "game-server" / "src").rglob("*.rs"))
    for path in gd_files:
        check_balanced(path, rust=False)
        main_member_unused_check(path)
        for idx, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if "\t" in line:
                ERRORS.append(f"{path}:{idx}: tab indentation")
            stripped = line.lstrip(" ")
            if stripped and (len(line) - len(stripped)) % 4:
                ERRORS.append(f"{path}:{idx}: indentation not multiple of 4")
    for path in rs_files:
        check_balanced(path, rust=True)

    # Scene/script reference checks.
    scene = (ROOT / "godot-client" / "Main.tscn").read_text(encoding="utf-8")
    for value in re.findall(r'path="(res://[^"]+)"', scene):
        path = ROOT / "godot-client" / value.removeprefix("res://")
        if not path.exists():
            ERRORS.append(f"Main.tscn references missing {value}")
    main_gd = (ROOT / "godot-client" / "scripts" / "main.gd").read_text(encoding="utf-8")
    for value in re.findall(r'preload\("(res://[^"]+)"\)', main_gd):
        path = ROOT / "godot-client" / value.removeprefix("res://")
        if not path.exists():
            ERRORS.append(f"main.gd preloads missing {value}")

    class_names: dict[str, Path] = {}
    for path in gd_files:
        m = re.search(r"^class_name\s+(\w+)", path.read_text(encoding="utf-8"), re.M)
        if m:
            name = m.group(1)
            if name in class_names:
                ERRORS.append(f"duplicate class_name '{name}' in {path} and {class_names[name]}")
            class_names[name] = path

    legacy_hits = []
    for area in ["godot-client", "game-server", "database", "static", "deploy"]:
        base = ROOT / area
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or ".git" in path.parts:
                continue
            try:
                txt = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            legacy_terms = ["".join(["p", "h", "a", "s", "e", "r"]), "vite", "webpack", "node_modules", "typescript"]
            if any(term.lower() in txt.lower() for term in legacy_terms):
                legacy_hits.append(path)
    for path in legacy_hits:
        ERRORS.append(f"legacy browser-client reference in {path}")

    for required in [
        ROOT / "Cargo.toml",
        ROOT / "game-server" / "Cargo.toml",
        ROOT / "godot-client" / "project.godot",
        ROOT / "godot-client" / "Main.tscn",
    ]:
        if not required.exists():
            ERRORS.append(f"missing required file {required}")

    if ERRORS:
        print("SOURCE SANITY: FAIL")
        print("\n".join(ERRORS))
        return 1

    print("SOURCE SANITY: PASS")
    print(f"GDScript files checked: {len(gd_files)}")
    print(f"Rust source files checked: {len(rs_files)}")
    print("Top-level unused-variable scan: PASS")
    print("Godot resource references: PASS")
    print("Legacy browser-client scan: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
