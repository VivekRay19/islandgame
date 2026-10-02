#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== Cultural Islands source precheck =="

echo "[0/5] Repository source sanity"
python3 tools/source_sanity.py

command -v cargo >/dev/null 2>&1 || { echo "ERROR: cargo is required" >&2; exit 1; }
command -v rustfmt >/dev/null 2>&1 || { echo "ERROR: rustfmt is required" >&2; exit 1; }

GODOT_BIN="${GODOT:-godot}"
command -v "$GODOT_BIN" >/dev/null 2>&1 || { echo "ERROR: Godot 4.7.2+ is required (set GODOT=/path/to/godot)" >&2; exit 1; }

echo "[1/5] Rust formatting"
cargo fmt --all -- --check

echo "[2/5] Rust compiler/type check"
cargo check --workspace --all-targets

echo "[3/5] Godot script parser"
"$GODOT_BIN" --headless --path godot-client --editor --quit --check-only

echo "[4/5] Repository sanity already included in source_sanity.py"
python3 tools/source_sanity.py

echo "[5/5] Project tree sanity"
test -f Cargo.toml
test -f game-server/Cargo.toml
test -f godot-client/project.godot
test -f godot-client/Main.tscn
test -f godot-client/scripts/main.gd
test -f godot-client/scripts/board.gd
test -f godot-client/scripts/api_client.gd

echo "✔ ALL SOURCE PRECHECKS PASSED"
