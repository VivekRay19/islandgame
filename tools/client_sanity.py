#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / 'static'
APP = STATIC / 'app.js'
INDEX = STATIC / 'index.html'
CSS = STATIC / 'styles.css'

errors: list[str] = []

if not APP.is_file(): errors.append('missing static/app.js')
if not INDEX.is_file(): errors.append('missing static/index.html')
if not CSS.is_file(): errors.append('missing static/styles.css')

def top_level_unused_scan(text: str) -> list[str]:
    import re
    unused = []
    for match in re.finditer(r'^(?:const|let|var)\s+(\w+)\s*=', text, re.M):
        name = match.group(1)
        count = len(re.findall(r'\b' + re.escape(name) + r'\b', text))
        if count <= 1:
            unused.append(name)
    return unused

if APP.is_file():
    text = APP.read_text(encoding='utf-8')
    if 'pixi.js@8.21.0' not in text:
        errors.append('PixiJS 8.21.0 is not pinned in app.js')
    unused = top_level_unused_scan(text)
    if unused:
        errors.append('top-level unused declarations: ' + ', '.join(unused))
    if "'/api'" not in text and '"/api"' not in text:
        errors.append('API fallback is not /api')
    for token in ['undefinedVariable', '$ROOT', 'PIXI.Application({']:
        if token in text:
            errors.append(f'legacy/unsafe token found: {token}')

if INDEX.is_file():
    index = INDEX.read_text(encoding='utf-8')
    if 'Cultural Islands' not in index:
        errors.append('client branding string missing')
    if 'type="module"' not in index or '/app.js' not in index:
        errors.append('index.html does not load the ES module client')
    if '/styles.css' not in index:
        errors.append('index.html does not load styles.css')

if errors:
    for error in errors:
        print(f'ERROR: {error}')
    raise SystemExit(1)

print('PIXIJSS CLIENT SANITY: PASS')
