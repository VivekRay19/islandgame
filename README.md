# Cultural Islands — Godot + Rust Rebuild

The browser/legacy browser engine client is gone. This repository now contains:

- `game-server/`: the existing Rust backend and game rules.
- `godot-client/`: the redesigned Godot 4 client.
- `database/`: the existing PostgreSQL schema/seed data.
- `deploy/`: the existing systemd service definition.
- `static/`: only the backend's small HTTP landing page; it is not the game client.

The Rust backend remains authoritative for game state, turn order, resources, tile placement, events, trade, tasks and scoring. The Godot client is a presentation/input layer over that API.

## Requirements

Use **Godot 4.7.2 stable** for the client. Godot 4.7.2 is the stable 4.7 maintenance release.

For the backend you need the normal Rust toolchain (`cargo`, `rustc`, `rustfmt`) and PostgreSQL.

## 1. Install / build the Rust backend

From the repository root:

```bash
cargo build --release -p cultural-islands-server
```

Or use the existing Makefile:

```bash
make build-server
```

For the first database setup, using the existing prototype schema:

```bash
make db-setup
```

Configure `.env` (or copy `.env.example` to `.env`) with the database/server settings before starting.

## 2. Start the Rust backend

Development:

```bash
make run
```

Installed/systemd deployment:

```bash
make install
make start
make status
```

Health check:

```bash
make health
```

The REST API defaults to port `8067`; the existing WebSocket endpoint uses `8068`.

## 3. Configure the Godot client

The client reads its API root from `CI_API_BASE`. The default is the existing backend address:

```text
http://192.168.8.10:8067/api
```

Linux/macOS:

```bash
export CI_API_BASE=http://YOUR_SERVER:8067/api
```

Windows PowerShell:

```powershell
$env:CI_API_BASE = "http://YOUR_SERVER:8067/api"
```

The client uses the backend over HTTP; no backend source needs to be moved into Godot.

## 4. Open/run Godot

From the repository root:

```bash
make godot-editor
```

Or run the game directly:

```bash
make godot-run
```

You can also open `godot-client/project.godot` in the Godot editor.

## 5. Run the complete precheck

The repository includes a reproducible source precheck:

```bash
./tools/precheck.sh
```

It runs:

1. the repository source-sanity checker (balanced source, Godot references, top-level unused-variable scan, and legacy-client scan)
2. `cargo fmt --all -- --check`
3. `cargo check --workspace --all-targets`
4. Godot's headless script/project parser
5. the final project-tree sanity check

The sandbox used to prepare this archive does **not** contain `cargo`, `rustc`, `rustfmt`, or the Godot executable, so compiler-level execution could not be truthfully claimed there. The archive was instead checked structurally/source-wise here, and `tools/precheck.sh` is the exact compiler/parser check to run on the server/workstation before deployment.

## 6. Game-client structure

```text
godot-client/
├── project.godot
├── Main.tscn
├── DESIGN.md
├── run_godot.sh
├── run_godot.bat
└── scripts/
    ├── main.gd
    ├── api_client.gd
    ├── board.gd
    ├── data.gd
    └── theme.gd
```

The UI is organized around the rulebook loop: **Choose → Build → Manage → Trade → Respond → Continue**. The board is the central decision surface; resources remain visible; build mode exposes legal neighbouring cells; events get priority treatment; and Trade/Tasks are explicit action contexts.

## 7. Important: backend is intentionally preserved

Do not replace `game-server/` with a second game implementation inside Godot. The client sends requests to the existing Rust API and displays the resulting authoritative state.
