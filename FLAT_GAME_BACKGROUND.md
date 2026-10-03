# Task: plain single-colour background inside the game (keep the artwork on the login page)

Project: `IslandGame/` (Cultural Islands, PixiJS 8 client).
Goal: inside the **game view**, replace the island artwork with one flat colour so tiles and HUD have good contrast.
The artwork must stay on the **login** screen (and the lobby, unless told otherwise).

## Where the background comes from (verified)

| Screen | Source | Touch it? |
|---|---|---|
| Login | `static/styles.css` line 10: `.title-art` uses `url('/assets/island_world.webp')`, element at `static/index.html` line 14 | **NO** |
| Lobby | same rule, `.lobby-art`, `static/index.html` line 48 | **NO** (see "Optional" if you want it flat too) |
| **Game** | `static/js/board.js`: a PixiJS `Sprite` loaded from `/assets/island_world.webp` and put in `bgLayer` | **YES, this is the whole job** |

Do **not** delete `static/assets/island_world.webp`. The login page still needs it, and `tools/client_sanity.py` checks it exists.
Do **not** touch `engine/`, `static/wasm/`, or `game-server/`. No Rust or WASM rebuild is needed.

Pick one colour and use it everywhere below: **`#10241e`** (deep forest green, hex `0x10241e` in Pixi).
To change it later, change it in the 3 places marked `BOARD_BG`.

---

## Edit 1: `static/js/board.js`

### 1a. Imports and constants (top of file, around lines 4 to 9)

Remove `Assets` and `Sprite` from the Pixi import (they are only used for the background), and replace `WORLD_ART` with the colour constant.

```js
// BEFORE
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle } from '/vendor/pixi.min.mjs';
...
const WORLD_ART = '/assets/island_world.webp';

// AFTER
import { Application, Container, Graphics, Text, TextStyle } from '/vendor/pixi.min.mjs';
...
export const BOARD_BG = 0x10241e;   // BOARD_BG (1/3): keep in sync with #10241e in v2.css
```

### 1b. Constructor (around line 33)

```js
// BEFORE
this.world = new Container(); this.bgLayer = new Container();

// AFTER
this.world = new Container();
```

### 1c. `init()` (around lines 41 to 48)

```js
// BEFORE
await this.app.init({ resizeTo: this.host, antialias: true, backgroundColor: 0x0b1c16, preference: 'webgl', powerPreference: 'high-performance' });
this.host.appendChild(this.app.canvas);
this.app.stage.addChild(this.bgLayer, this.world);
this.world.addChild(this.hexLayer, this.tileLayer, this.markLayer, this.fxLayer, this.hitLayer, this.textLayer);
const texture = await Assets.load(WORLD_ART);
this.art = new Sprite(texture); this.art.anchor.set(0.5); this.bgLayer.addChild(this.art);
const st = this.app.stage; ...

// AFTER   (BOARD_BG 2/3: backgroundColor; the two artwork lines are DELETED)
await this.app.init({ resizeTo: this.host, antialias: true, backgroundColor: BOARD_BG, preference: 'webgl', powerPreference: 'high-performance' });
this.host.appendChild(this.app.canvas);
this.app.stage.addChild(this.world);
this.world.addChild(this.hexLayer, this.tileLayer, this.markLayer, this.fxLayer, this.hitLayer, this.textLayer);
const st = this.app.stage; ...
```

### 1d. `layout()` (around lines 66 to 74): replace the whole function

```js
// AFTER
layout() {
  if (!this.app) return;
  const w = this.host.clientWidth, h = this.host.clientHeight;
  if (!this.dragging && this.world.x === 0 && this.world.y === 0) this.world.position.set(w / 2, h / 2 + 30);
  this.world.scale.set(this.zoom);
}
```

### 1e. `tick()` (around line 277): delete this one line

```js
if (this.art) this.art.x = Math.sin(time * 0.12) * 0.9;
```

### 1f. Make the tiles opaque (this is what fixes the contrast)

The hexes were semi-transparent so the artwork showed through. On a flat colour that just looks muddy. In `setView()` (around lines 91 to 92) and `drawTile()` (around lines 142 to 143):

```js
// setView(): hex ground
// BEFORE
g.poly(this.poly(TILE_SIZE - 2)).fill({ color: t.fill, alpha: c.tile ? 0.5 : 0.34 })
  .stroke({ color: 0xf0e4b8, width: 1.2, alpha: 0.2 });
// AFTER
g.poly(this.poly(TILE_SIZE - 2)).fill({ color: t.fill, alpha: c.tile ? 1 : 0.8 })
  .stroke({ color: 0xf0e4b8, width: 1.4, alpha: 0.35 });

// setView(): terrain glyph on empty hexes (around line 95)
// BEFORE
m.alpha = c.cleared ? 0.18 : 0.38;
// AFTER
m.alpha = c.cleared ? 0.3 : 0.6;

// drawTile(): ground shadow + tile base (around lines 142 to 143)
// BEFORE
... .ellipse(0, 20, 58, 19).fill({ color: 0x0b140f, alpha: 0.42 })
... .fill({ color: 0x6d6a4a, alpha: 0.56 }).stroke({ color: 0xe5d6a6, width: 1.5, alpha: 0.22 })
// AFTER
... .ellipse(0, 20, 58, 19).fill({ color: 0x050d0a, alpha: 0.5 })
... .fill({ color: 0x6d6a4a, alpha: 1 }).stroke({ color: 0xe5d6a6, width: 1.5, alpha: 0.4 })
```

---

## Edit 2: `static/v2.css` (append at the end)

`.game-shade` is a dark vignette tuned for the artwork. On a flat colour it only darkens the corners, so turn it off, and make the page colour match the board so there is no flash before PixiJS starts.

```css
/* Flat in-game background (BOARD_BG 3/3: keep in sync with BOARD_BG in js/board.js) */
.game-scene{background:#10241e}
.game-shade{display:none}
```

(`v2.css` loads after `styles.css`, so these override `styles.css` line 23. No need to edit `styles.css`.)

---

## Do NOT change

* `static/styles.css` line 10 (`.title-art, .lobby-art`): this is the login and lobby artwork.
* `static/assets/island_world.webp`: still used by the login page.
* Anything in `engine/`, `static/wasm/`, `game-server/`.

## Optional

* **Flat lobby too:** in `v2.css` add `.lobby-art{background:#10241e}`. (Changes the lobby only; login unchanged.)
* **Build bar overlapping END ROUND** (visible in your screenshot at about 1900px wide: the last blueprint, Stepwell, slides under the END ROUND button). Append to `v2.css`:
  ```css
  .build-wheel{max-width:calc(100vw - 820px);min-width:340px;overflow-x:auto;overflow-y:visible}
  ```
  Not checked on a real GPU. If the bar looks cramped, lower `820px` or tell me your screen size.

## Verify

1. `node --check static/js/board.js`
2. `python3 tools/client_sanity.py` must print `CLIENT SANITY: PASS`.
3. `grep -n "island_world\|Sprite\|Assets\|bgLayer\|this.art" static/js/board.js` must print **nothing**.
4. `grep -rn "island_world" static/` should show only `styles.css` line 10.
5. Optional: `npm i jsdom && node tools/ui_smoke.mjs` should end with `ALL UI CHECKS PASSED`.
6. In the browser, hard-refresh (**Ctrl+Shift+R**) because the JS and CSS are cached:
   * Login: artwork still visible.
   * Start a season: flat dark green background, solid tiles, no artwork, no dark corners.

## Prompt to paste into Antigravity

> Read `FLAT_GAME_BACKGROUND.md` and apply Edit 1 (`static/js/board.js`) and Edit 2 (`static/v2.css`) exactly. Do not modify `styles.css`, the `assets` folder, `engine/`, `static/wasm/` or `game-server/`. Then run the Verify steps and report the output of each.
