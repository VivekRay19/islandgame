# Cultural Islands

A tile-based island management game: **Choose → Build → Manage → Trade → Respond → Continue.**
Twelve rounds, four seasons, one island. Build for today, prepare for the omens, and leave the land healthy.

## Architecture (v0.2)

```text
                          BROWSER (player's CPU + GPU do the work)
  ┌────────────────────────────────────────────────────────────────────┐
  │  Rust → WebAssembly          PixiJS 8.22.0           Anime.js 4.5.0 │
  │  RULES ENGINE (island-core)  RENDERING (WebGL/GPU)   MOTION / UI    │
  │  state · economy · hazards   hexes, buildings, fire, tweens, panels,│
  │  fire spread · scoring · AI  embers, smoke, camera   banners, juice │
  │         │  JSON view + events        ▲                    ▲         │
  │         └────────── JavaScript (ES modules) ──────────────┘         │
  └──────────────────────────────┬─────────────────────────────────────┘
                                 │ finished run = seed + command list (a few KB, once per season)
                                 ▼
                  Rust / Actix Web :8067  (+ PostgreSQL)
                  auth · profile/unlocks · REPLAYS the run with the SAME
                  island-core crate (native) · leaderboard · streaks
```

* **One rules crate, two targets.** `engine/core` (`island-core`) is pure and deterministic:
  no I/O, clock, threads, `uuid`, `rand`, or `getrandom`. It compiles to WASM for the browser and links natively
  into the server. A season is `Game::new(config)` + a list of commands.
* **The server never renders and never receives per-frame traffic.** It verifies finished seasons by replaying
  them. Score, XP and unlocks come from the server's replay, not the client's claim.
* **Graphics are PixiJS + Anime.js, vendored** in `static/vendor/` (pinned versions, licences included).
  The running game needs no CDN. `make vendor` refreshes them.
* **No `quad`/`uuid`/`getrandom` in the WASM build.** The wasm crate depends on `wasm-bindgen` only; the engine
  has its own seeded RNG (SplitMix64). Browsers need nothing extra.
* Typed declarations for the engine API are generated into `static/wasm/island_engine_wasm.d.ts`
  (editors get autocomplete; no bundler or compile step is needed to run the game).

## Layout

| Path | What |
|---|---|
| `engine/core` | Rules engine: `game.rs` (state, commands, economy), `hazard.rs` (omens, fire, flood…), `data.rs` (all tuning tables), `view.rs` (JSON for the client), `bot.rs` (balance bot + Advisor), `tests/`, `examples/` |
| `engine/wasm` | `wasm-bindgen` wrapper (`Engine`, `catalog`, `unlocks`, seeds, `rules_version`) |
| `game-server` | Actix server: auth, `/api/runs/{profile,submit,board}` (new), legacy routes kept |
| `static/js` | `engine.js` (WASM bridge, save/resume), `board.js` (PixiJS), `game.js` (HUD + Anime.js), `api.js` |
| `static/wasm` | Built engine (`island_engine_wasm_bg.wasm` + JS glue + `.d.ts`) |
| `static/vendor` | PixiJS 8.22.0, Anime.js 4.5.0 |
| `database/003_runs.sql` | Verified-run history, best Heat, best streak |
| `tools/` | `client_sanity.py`, `source_sanity.py`, `ui_smoke.mjs`, `e2e_verify.mjs` |

## Modes

* **Season** (ranked): choose an island and a Heat level. Win to unlock the next Heat. XP unlocks tiles and islands.
* **Daily Island**: the same map and weather for everyone today; leaderboard; the first play each day earns XP; streak.
* **Shared Table**: type a code, get the same island and weather as anyone else who types it. No XP (no farming).

## The game, in short

* Win by meeting the **charter** (shown on screen, never hidden): settle enough tiles, complete 6 projects, hold 5 water
  and 5 grain at the end, and finish with Harmony 45+ and Land 40+. Collapse (Harmony 0, no halls left, Land 0) loses.
* **Omens** show hazards (fire, drought, flood, storm, landslide) one round ahead, with the target hex marked.
* **Actions**: 3 per round (+1 per two/four halls, +1 with a blessing). Trading is free of actions with a Haat Market or a caravan.
* **Fire** (the rulebook's showcase): burning tiles stop producing; unanswered, they damage then destroy, and spread
  to flammable neighbours. Water tiles beside a tile reduce its cost to extinguish and its spread risk. Clearing a tile
  makes a firebreak.
* **Sustainability**: sprawl, quarries and ruins drain the Land; forests and shrines restore it. A degraded Land makes
  hazards harder; a verdant one softens them.

## Build and run

```bash
# 1. Database (once)
make db-setup                                   # schema + seed
psql -U jofrey -d cultural_islands -f database/003_runs.sql

# 2. Engine → WebAssembly (once, and whenever engine/ changes)
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.129    # MUST equal the wasm-bindgen version in Cargo.lock
make wasm

# 3. Server
make deploy && make start                        # serves API + static client on :8067
```

**Keep the browser and server on the same rules.** After changing anything under `engine/`, rebuild BOTH
(`make wasm` and `make build-server`). The client sends its `rules_version`; a mismatch tells the player to hard-refresh
instead of rejecting their run as cheating.

## Testing

```bash
make engine-test      # 13 engine tests: determinism, replay, fire rules, fuzzing
make balance          # thousands of seeded seasons by bots; win rates per island / Heat
make precheck         # fmt + cargo check + engine tests + client checks
npm i jsdom && make ui-test           # real client code + real WASM in a simulated DOM (Pixi stubbed)
node tools/e2e_verify.mjs             # needs the server running; plays seasons and tries to cheat
```

Balancing lives in `engine/core/src/data.rs` and a handful of constants in `game.rs`; `make balance` shows the effect.

## Known limits

* Rendering has been exercised only with Pixi stubbed (no GPU in CI). Expect small visual tuning on first real load.
* Legacy online "tables" (`/api/games/*`, `/ws`) still compile and run but are no longer reachable from the lobby; they use the old rules.
* Bot-derived balance is a starting point. Tune with real players.
