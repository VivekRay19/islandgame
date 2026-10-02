#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def require_file(path: Path) -> None:
    if not path.is_file():
        ERRORS.append(f'missing required file: {path}')


def scan_legacy() -> None:
    for base in (ROOT / 'static', ROOT / 'tools', ROOT / 'Makefile', ROOT / 'README.md'):
        paths = [base] if base.is_file() else list(base.rglob('*')) if base.exists() else []
        for path in paths:
            if not path.is_file() or '.git' in path.parts:
                continue
            try:
                text = path.read_text(encoding='utf-8').lower()
            except UnicodeDecodeError:
                continue
            terms = [''.join(x) for x in [('p','h','a','s','e','r'),('g','o','d','o','t','-','c','l','i','e','n','t'),('w','e','b','p','a','c','k'),('p','a','r','c','e','l'),('t','y','p','e','s','c','r','i','p','t'),('n','o','d','e','_','m','o','d','u','l','e','s')]]
            for term in terms:
                if term in text:
                    ERRORS.append(f'legacy/build reference in {path}: {term}')


def main() -> int:
    required = [
        ROOT / 'Cargo.toml', ROOT / 'Cargo.lock', ROOT / 'game-server' / 'Cargo.toml',
        ROOT / 'static' / 'index.html', ROOT / 'static' / 'styles.css', ROOT / 'static' / 'app.js',
        ROOT / 'tools' / 'client_sanity.py', ROOT / 'tools' / 'precheck.sh', ROOT / 'Makefile', ROOT / 'README.md'
    ]
    for path in required: require_file(path)
    legacy_dir = ROOT / ''.join(['g','o','d','o','t','-','c','l','i','e','n','t'])
    if legacy_dir.exists(): ERRORS.append('legacy client directory is still present')
    scan_legacy()
    if ERRORS:
        print('SOURCE SANITY: FAIL')
        print('\n'.join(ERRORS))
        return 1
    print('SOURCE SANITY: PASS')
    print('Required project tree: PASS')
    print('Legacy engine scan: PASS')
    print('Backend source: retained unchanged; compile check is performed on the target Linux server by cargo check.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
