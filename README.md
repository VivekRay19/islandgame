# Cultural Islands — Godot + Rust Rebuild

The browser/legacy browser engine client is gone. This repository now contains:

- `game-server/`: the existing Rust backend and game rules.
- `godot-client/`: the redesigned Godot 4 client.
- `database/`: the existing PostgreSQL schema/seed data.
- `deploy/`: the existing systemd service definition.
- `static/`: only the backend's small HTTP landing page; it is not the game client.

The Rust backend remains authoritative for game state, turn order, resources, tile placement, events, trade, tasks and scoring. The Godot client is a presentation/input layer over that API.

## Requirements

Use **Godot 4.7.2 stable** for the client. The repository can install a local copy with `make godot-install`; no system-wide Godot package is required.

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

Development (only when another server instance is not already listening on port 8067):

```bash
make run
```

If the systemd service is already running, `make run` will correctly fail with `AddrInUse` because it would start a second backend on the same port. In that case use `make status` / `make logs`, or stop the service first with `make stop` before using `make run`.

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

The client reads its API root from `CI_API_BASE`. On this Linux deployment it defaults to the existing backend address:

```text
http://192.168.8.10:8067/api
```

For another server address, from the Linux repository root run:

```bash
export CI_API_BASE=http://YOUR_SERVER:8067/api
```

The client uses the backend over HTTP; no backend source needs to be moved into Godot.

## 4. Install and run Godot

Run these commands **from the repository root**. The Makefile is intentionally at the repository root; do not `cd godot-client` and run its targets.

Install the pinned Godot version locally:

```bash
make godot-install
```

Then launch the editor:

```bash
make godot-editor
```

Or launch the game directly:

```bash
make godot-run
```

`make godot-run` launches the graphical Godot client, so the Linux machine must have an available graphical session (X11/Wayland). On a headless server, use `make client-check` to validate the project instead; do not expect a visible game window without a display server.

You can also pass a manually installed Godot executable without changing the repository:

```bash
make GODOT=/path/to/godot godot-run
```

The local installer currently supports Linux x86_64 and arm64. It uses the official Godot 4.7.2 stable Linux archive.

## 5. Run the complete precheck

The repository includes a reproducible source precheck:

```bash
./tools/precheck.sh
```

It runs:

1. the repository source-sanity checker (balanced source, Godot references, top-level unused-variable scan, and legacy-client scan)
2. `cargo fmt --all -- --check`
3. `cargo check --workspace --all-targets`
4. Godot's headless script/project parser, using the repository-local Godot when installed
5. the final project-tree sanity check

The Godot setup is deliberately local and reproducible: `make godot-install` downloads the pinned Godot 4.7.2 binary into `.tools/`.

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
