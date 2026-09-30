# Cultural Islands — Full Stack Setup & Deployment Guide

## Server: `0.0.0.0` (Default Port: `8067` | WebSocket: `8068`)

---

## Quick Start with Makefile

If you have `make` installed, you can manage the entire application with simple commands:

```bash
# 1. Setup environment configuration
cp .env.example .env

# 2. Setup PostgreSQL database (creates DB, runs schema migrations, and seeds data)
make db-setup

# 3. Build both WASM game client and server binary
make build

# 4. (Optional) Install systemd service for auto-start
make install

# 5. Start / Restart the service
make start       # or 'make restart' to rebuild + restart
make status      # check service status
make logs        # follow live logs
make health      # verify HTTP health endpoint
```

---

## 1. Prerequisites

```bash
# Rust toolchain (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# WASM target for the game client
rustup target add wasm32-unknown-unknown

# PostgreSQL client / server
# Verify PostgreSQL is active:
sudo systemctl status postgresql --no-pager
```

---

## 2. Database Setup

You can use `make db-setup` or run the commands manually:

```bash
# Create the database using postgres user (or your current PostgreSQL user)
sudo -u postgres psql -c "CREATE DATABASE cultural_islands;"

# If running as your local OS user, grant access or create a dedicated user:
# sudo -u postgres createuser -s $USER 2>/dev/null || true

# Run schema migrations
sudo -u postgres psql -d cultural_islands -f database/001_schema.sql

# Seed initial story events, regions, and first season
sudo -u postgres psql -d cultural_islands -f database/002_seed.sql
```

---

## 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` to suit your deployment:

```ini
# Database connection string
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/cultural_islands
DB_POOL_SIZE=15

# Server binding
HTTP_PORT=8067
WS_PORT=8068
HOST=0.0.0.0
STATIC_DIR=./static

# Auth
JWT_SECRET=replace_with_a_secure_random_string
JWT_EXPIRES_HOURS=72

# Game Configuration
MAX_PLAYERS_PER_GAME=4
MAX_ROUNDS=6
RUST_LOG=info
```

---

## 4. Build the Game

You can build everything with a single command:

```bash
make build
```

Or build the components individually:

### Client (WASM)
```bash
make build-client
# Or manually:
# cd game-client && ./build.sh
```
This builds `cultural_islands_client.wasm` and downloads `mq_js_bundle.js` into the `static/` directory.

### Server (Rust release binary)
```bash
make build-server
# Or manually:
# cd game-server && cargo build --release
```
The compiled binary will be placed at `target/release/cultural-islands-server`.

---

## 5. Running the Application

### Option A: Systemd Service (Recommended for Production)

```bash
# Configures the service with your current user and repo directory automatically
make install

# Start and monitor
make start
make status
make logs
```

### Option B: Run Directly from Shell

```bash
./target/release/cultural-islands-server
```

---

## 6. Accessing the Game

Open any browser on your network and navigate to:

```text
http://<server-ip>:8067
```

Example (LAN): `http://192.168.8.10:8067` or `http://localhost:8067`

Players can join directly from any desktop or mobile browser on the same network.

---

## Makefile Reference

| Command | Description |
|---|---|
| `make build` | Builds WASM client and server binary |
| `make build-client` | Compiles WASM client and prepares `static/` bundle |
| `make build-server` | Builds server release binary |
| `make db-setup` | Creates DB, applies migrations, and seeds data |
| `make db-migrate` | Applies `database/001_schema.sql` |
| `make db-seed` | Seeds `database/002_seed.sql` |
| `make install` | Installs & enables systemd unit for current user/path |
| `make start` | Starts systemd service |
| `make stop` | Stops systemd service |
| `make restart` | Rebuilds and restarts service with status check |
| `make status` | Checks service status (`--no-pager`) |
| `make logs` | Follows live journalctl logs |
| `make health` | Checks HTTP health endpoint |
| `make clean` | Cleans build artifacts |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET  | `/health` | Service health status |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET  | `/api/auth/me` | Current player |
| GET  | `/api/games` | List open games |
| POST | `/api/games` | Create game |
| POST | `/api/games/:id/join` | Join game |
| POST | `/api/games/:id/start` | Start game (host) |
| GET  | `/api/games/:id/state` | Full game state |
| POST | `/api/games/:id/place-tile` | Place a hex tile |
| POST | `/api/games/:id/respond-event` | Handle event |
| POST | `/api/games/:id/trade` | Haat trade |
| POST | `/api/games/:id/complete-task` | Build task |
| POST | `/api/games/:id/end-turn` | End your turn |
| GET  | `/api/leaderboard` | Season rankings |
| GET  | `/api/campaign` | Campaign progress |
| WS   | `/ws?game_id=UUID` | WebSocket live events |

---

## Game Rules Summary

- **6 Rounds**, 3 Levels (2 rounds each)
- **Turn order**: Respond to event → Build tile → Haat trade → Complete task → End turn
- **Tile placement**: Must be adjacent to existing tiles (hex grid)
- **Edge matching**: Matching tile edges gives +15 pts each (+25 if all match)
- **Resources**: 8 types — grain, fibre, wood, stone, clay, water, music, ore
- **Traders**: 5 island traders at the Haat Market (max 2 trades/round)
- **Events**: Fire (use 2 water), Drought (use 2 water), Festival (free), Harvest (free), Storm
- **Win**: Highest total of Task Score + Event Score + Cultural Harmony / 10
