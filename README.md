# Cultural Islands

Cultural Islands is a tile-based island management game built around the loop: **Choose → Build → Manage → Trade → Respond → Continue**.

## Runtime architecture

```text
Browser
  │
  │ PixiJS 8.21.0 client (static assets; runtime loaded from pinned CDN URL)
  ▼
Rust / Actix Web :8067
  │
  ├── REST /api/*
  ├── WebSocket :8068
  └── PostgreSQL
```

The Rust backend remains authoritative for authentication, game state, placement validation, resource spending, events, trade limits, task scoring, turn order, and final scoring. The PixiJS client is a presentation/input layer and does not replace those rules.

## Client

The game client is a browser application rendered with PixiJS 8.21.0. The current stable PixiJS API uses the async `Application.init()` flow.

The game runs directly in a modern browser; no separate game-engine runtime is required on the server.

The browser loads the pinned PixiJS 8.21.0 module from jsDelivr; your Rust server serves the game HTML, JavaScript, and CSS directly.

## Linux server install

```bash
unzip CulturalIslands_PixiJS_Rust.zip
cd IslandGame
cp .env.example .env
nano .env
make precheck
make build-server
make install
make start
make status
make health
```

Open the server in a browser:

```text
http://SERVER_IP:8067/
```

For development:

```bash
make stop
make run
```

Do not use `make run` while the systemd service is already running; that would start a second process on the same ports.

## Client checks

The PixiJS source is checked with Node's parser plus repository-specific sanity checks:

```bash
make client-check
```

The client itself is static at runtime; Node is needed only for local syntax checking/editing workflows.
