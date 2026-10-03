#!/usr/bin/env python3
"""Static checks for the PixiJS + Anime.js + WASM client (multi-module)."""
from __future__ import annotations
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
S = ROOT / 'static'
JS = [S / 'app.js'] + sorted((S / 'js').glob('*.js'))
ERR: list[str] = []

for p in JS + [S / 'index.html', S / 'styles.css', S / 'v2.css']:
    if not p.is_file():
        ERR.append(f'missing client file: {p.relative_to(ROOT)}')

# Vendored, version-pinned graphics libraries (no CDN dependency at runtime).
pixi = S / 'vendor' / 'pixi.min.mjs'
anime = S / 'vendor' / 'anime.esm.min.js'
for f, name in ((pixi, 'PixiJS'), (anime, 'Anime.js')):
    if not f.is_file() or f.stat().st_size < 50_000:
        ERR.append(f'{name} is not vendored at {f.relative_to(ROOT)} (run: make vendor)')
if pixi.is_file() and '8.22.0' not in pixi.read_text(errors='ignore')[:400000] and '8.22.0' not in (S/'vendor'/'VERSIONS.txt').read_text():
    ERR.append('PixiJS 8.22.0 pin not recorded')

# The rules engine artifacts.
for f in ('island_engine_wasm.js', 'island_engine_wasm_bg.wasm', 'island_engine_wasm.d.ts'):
    if not (S / 'wasm' / f).is_file():
        ERR.append(f'missing WASM artifact static/wasm/{f} (run: make wasm)')

text = {p: p.read_text(encoding='utf-8') for p in JS if p.is_file()}
for p, t in text.items():
    if re.search(r"https?://cdn\.|jsdelivr|unpkg", t):
        ERR.append(f'{p.relative_to(ROOT)}: CDN import found; use /vendor/')
    if 'localStorage' in t and p.name not in ('engine.js', 'api.js', 'app.js'):
        ERR.append(f'{p.relative_to(ROOT)}: unexpected localStorage use')
if "'/api'" not in text.get(S / 'js' / 'api.js', ''):
    ERR.append('API fallback is not /api')
if "from '/vendor/pixi.min.mjs'" not in text.get(S / 'js' / 'board.js', ''):
    ERR.append('board.js must import PixiJS from /vendor')
if not any("from '/vendor/anime.esm.min.js'" in t for t in text.values()):
    ERR.append('Anime.js is not imported anywhere')

# Every $('#id') the code uses must exist in index.html.
idx = (S / 'index.html').read_text(encoding='utf-8')
dom = set(re.findall(r'id="([^"]+)"', idx))
used = set()
for t in text.values():
    used |= set(re.findall(r"""\$\(['"]#([A-Za-z0-9_-]+)['"]\)""", t))
    used |= set(re.findall(r"""getElementById\(['"]([A-Za-z0-9_-]+)['"]\)""", t))
dynamic = {'again-new', 'again-same', 'to-lobby', 'seal-extra', 'seal-status'}  # built inside the result modal
for m in sorted(used - dom - dynamic):
    ERR.append(f'JS references missing DOM id: #{m}')
if 'type="module"' not in idx or '/app.js' not in idx:
    ERR.append('index.html does not load the ES module client')
if '/v2.css' not in idx:
    ERR.append('index.html does not load v2.css')

for asset in ('island_world.webp', 'farm.webp', 'workshop.webp', 'market.webp', 'hall.webp', 'music.webp', 'shrine.webp'):
    if not (S / 'assets' / asset).is_file():
        ERR.append(f'missing art asset: static/assets/{asset}')

if ERR:
    print('CLIENT SANITY: FAIL'); print('\n'.join('ERROR: ' + e for e in ERR)); raise SystemExit(1)
print('CLIENT SANITY: PASS (Pixi + Anime vendored, WASM present, DOM ids consistent)')
