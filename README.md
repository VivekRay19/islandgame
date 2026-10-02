# Cultural Islands — Setup & Deploy Guide
**Server: 192.168.8.10 | HTTP: 8067 | WS: 8068**

---

## Quick start (server already running)

If the service is already installed and the DB is set up, just run:
```bash
make deploy-client        # push JS changes live instantly
make restart              # restart server if needed
make logs                 # tail live logs
```

---

## First-time setup

### 1. Prerequisites
```bash
# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. Database
```bash
make db-setup
# Creates: cultural_islands DB, all tables, seeds season 1 + story events
```

### 3. Download Phaser 3 (one time, needs internet)
```bash
make download-phaser
# Saves phaser.min.js to static/ — no internet needed after this
```

### 4. Build the Rust server
```bash
make build-server
```

### 5. Full deploy (copies files + starts service)
```bash
make deploy
```

### 6. Open the game
Any browser on the LAN: **http://192.168.8.10:8067**

---

## Directory structure

```
IslandGame/
├── game-server/          Rust API server (Actix-web)
│   └── src/
│       ├── handlers/     auth, game, leaderboard, campaign
│       ├── game_logic/   hex grid, tiles, events, trade, scoring
│       ├── models/       DB structs
│       └── ws/           WebSocket handler (port 8068)
├── static/               JS game client (edit these files)
│   ├── index.html        loading splash + Phaser boot
│   ├── phaser.min.js     local Phaser 3 (downloaded once)
│   └── js/
│       ├── main.js       Phaser config + scene list
│       ├── config.js     tile defs, resource colours, API URL
│       ├── api.js        all HTTP calls to Rust server
│       ├── scenes/       one file per game screen
│       │   ├── BootScene.js
│       │   ├── MenuScene.js
│       │   ├── LoginScene.js
│       │   ├── LobbyScene.js
│       │   ├── GameScene.js
│       │   ├── ResultsScene.js
│       │   └── LeaderboardScene.js
│       ├── game/         board rendering + HUD components
│       │   ├── HexBoard.js
│       │   ├── HUD.js
│       │   ├── EventPanel.js
│       │   └── TilePicker.js
│       └── ui/           reusable CoC-style UI primitives
│           ├── Colors.js
│           ├── Button.js
│           ├── Panel.js
│           └── TextInput.js
├── database/
│   ├── 001_schema.sql    all 18 tables
│   └── 002_seed.sql      season 1 + story events
└── deploy/
    └── cultural-islands.service   systemd unit
```

---

## Editing the JS client

No build step — edit, save, refresh:

| File | What to change |
|------|----------------|
| `static/js/config.js` | API URL, tile definitions, resource colours |
| `static/js/api.js` | Add or change API calls |
| `static/js/scenes/GameScene.js` | Main game screen layout & interactions |
| `static/js/game/HexBoard.js` | Hex tile rendering & grid logic |
| `static/js/ui/Colors.js` | Colour palette |

After editing, push to server:
```bash
make deploy-client
```

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Current player info |
| GET  | /api/games | List open games |
| POST | /api/games | Create game |
| POST | /api/games/:id/join | Join a game |
| POST | /api/games/:id/start | Start (host only) |
| GET  | /api/games/:id/state | Full game state |
| POST | /api/games/:id/place-tile | Place a hex tile |
| POST | /api/games/:id/respond-event | Handle event |
| POST | /api/games/:id/trade | Haat trade |
| POST | /api/games/:id/complete-task | Complete development task |
| POST | /api/games/:id/end-turn | End your turn |
| GET  | /api/leaderboard | Season rankings |
| GET  | /api/campaign | Campaign progress |
| WS   | ws://192.168.8.10:8068/ws?game_id=UUID | Live game events |

---

## Browser compatibility

Phaser 3 uses **WebGL with automatic Canvas 2D fallback**.
Works on: Chrome 80+, Firefox 78+, Safari 14+, Edge 80+, any Android/iOS browser.
No TypeScript, no npm, no build step.

---

## Game rules summary

- **6 Rounds**, 3 Levels (L1: rounds 1-2, L2: 3-4, L3: 5-6)
- **Turn order**: Respond to event → Build tile → Haat Trade → Complete Task → End Turn
- **Tile placement**: Must connect to your island (hex adjacency)
- **Edge matching**: +15 pts per matched edge, +25 bonus if all neighbours match
- **8 Resources**: grain, fibre, wood, stone, clay, water, music, ore
- **5 Traders** at the Haat Market (max 2 trades per round)
- **Events**: Fire & Drought (cost 2 water), Festival & Harvest (free), Storm
- **Win**: highest total of Task Score + Event Score + Cultural Harmony ÷ 10
