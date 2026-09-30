# Cultural Islands — Full Stack Setup Guide

## Server: 192.168.8.10  |  HTTP: 8067  |  WS: 8068

---

## 1. Prerequisites

```bash
# Rust toolchain (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# WASM target for the game client
rustup target add wasm32-unknown-unknown

# PostgreSQL (should already be running)
# Verify:
psql -U jofrey -d postgres -c "\l"
```

---

## 2. Database Setup

```bash
# Create the database (connect to 'postgres' db first)
psql -U jofrey -d postgres -c "CREATE DATABASE cultural_islands;"

# If jofrey user is not a postgres superuser, create it via postgres user:
# sudo -u postgres psql -c "CREATE DATABASE cultural_islands OWNER jofrey;"

# Run schema
psql -U jofrey -d cultural_islands -f database/001_schema.sql

# Seed story events + first season
psql -U jofrey -d cultural_islands -f database/002_seed.sql
```

---

## 3. Environment

```bash
cp .env.example .env
# .env is already configured for:
#   DB:   postgres://jofrey:jofrey@127.0.0.1:5432/cultural_islands
#   HTTP: 0.0.0.0:8067
#   WS:   0.0.0.0:8068
```

---

## 4. Build the Game Client (WASM)

```bash
cd game-client
chmod +x build.sh
./build.sh
# This downloads mq_js_bundle.js and builds cultural_islands_client.wasm
# Both go into ../static/
```

---

## 5. Build & Run the Server

```bash
cd game-server
cargo build --release

# Run directly:
./target/release/cultural-islands-server

# OR deploy as systemd service:
sudo cp ../deploy/cultural-islands.service /etc/systemd/system/
sudo mkdir -p /opt/CulturalIslands/cultural-islands
sudo cp -r . /opt/CulturalIslands/cultural-islands/
sudo cp -r ../static /opt/CulturalIslands/cultural-islands/
sudo cp ../.env /opt/CulturalIslands/cultural-islands/
sudo systemctl daemon-reload
sudo systemctl enable cultural-islands
sudo systemctl start cultural-islands
```

---

## 6. Access the Game

Open any browser on your LAN and navigate to:

```
http://192.168.8.10:8067
```

Players can join from any device on the same network.

---

## API Reference (for debugging)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Current player |
| GET  | /api/games | List open games |
| POST | /api/games | Create game |
| POST | /api/games/:id/join | Join game |
| POST | /api/games/:id/start | Start game (host) |
| GET  | /api/games/:id/state | Full game state |
| POST | /api/games/:id/place-tile | Place a hex tile |
| POST | /api/games/:id/respond-event | Handle event |
| POST | /api/games/:id/trade | Haat trade |
| POST | /api/games/:id/complete-task | Build task |
| POST | /api/games/:id/end-turn | End your turn |
| GET  | /api/leaderboard | Season rankings |
| GET  | /api/campaign | Campaign progress |
| WS   | ws://192.168.8.10:8068/ws?game_id=UUID | Live events |

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
