#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / 'static'
APP = STATIC / 'app.js'
INDEX = STATIC / 'index.html'
CSS = STATIC / 'styles.css'
ERRORS: list[str] = []

for required in (APP, INDEX, CSS):
    if not required.is_file():
        ERRORS.append(f'missing required client file: {required}')


def top_level_unused_scan(text: str) -> list[str]:
    unused: list[str] = []
    for match in re.finditer(r'^(?:const|let|var)\s+(\w+)\s*=', text, re.M):
        name = match.group(1)
        count = len(re.findall(r'\b' + re.escape(name) + r'\b', text))
        if count <= 1:
            unused.append(name)
    return unused


if APP.is_file():
    text = APP.read_text(encoding='utf-8')
    if 'pixi.js@8.22.0' not in text:
        ERRORS.append('PixiJS 8.22.0 is not pinned in app.js')
    if 'animejs@4.5.0' not in text:
        ERRORS.append('Anime.js 4.5.0 is not pinned in app.js')
    if "'/api'" not in text and '"/api"' not in text:
        ERRORS.append('API fallback is not /api')
    for token in ('undefinedVariable', '$ROOT', 'PIXI.Application({'):
        if token in text:
            ERRORS.append(f'unsafe token found: {token}')
    unused = top_level_unused_scan(text)
    if unused:
        ERRORS.append('top-level unused declarations: ' + ', '.join(unused))

if INDEX.is_file():
    index = INDEX.read_text(encoding='utf-8')
    if 'Cultural Islands' not in index:
        ERRORS.append('client branding string missing')
    if 'type="module"' not in index or '/app.js' not in index:
        ERRORS.append('index.html does not load the ES module client')
    if '/styles.css' not in index:
        ERRORS.append('index.html does not load styles.css')
    dom_ids = set(re.findall(r'id="([^"]+)"', index))
    referenced_ids = set(re.findall(r"\$\(['\"]#([A-Za-z0-9_-]+)['\"]\)", APP.read_text(encoding='utf-8')))
    dynamic_ids = {'event-resolve', 'event-accept'}
    missing_ids = sorted(referenced_ids - dom_ids - dynamic_ids)
    for missing in missing_ids:
        ERRORS.append(f'JS references missing DOM id: #{missing}')

for asset in (
    'island_world.webp', 'farm.webp', 'workshop.webp', 'market.webp',
    'hall.webp', 'music.webp', 'shrine.webp'
):
    if not (STATIC / 'assets' / asset).is_file():
        ERRORS.append(f'missing generated art asset: static/assets/{asset}')

if ERRORS:
    print('PIXIJS CLIENT SANITY: FAIL')
    print('\n'.join(f'ERROR: {error}' for error in ERRORS))
    raise SystemExit(1)

print('PIXIJS + ANIME.JS CLIENT SANITY: PASS')
print('Generated art assets: PASS')
print('DOM selector references: PASS')
print('Pinned engine versions: PASS')
