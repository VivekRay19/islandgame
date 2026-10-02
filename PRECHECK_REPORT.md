# Cultural Islands — Precheck Report

## What was validated while preparing the archive

- Rust backend source tree preserved from the supplied working backend.
- Godot client tree contains only the new Godot client; legacy Phaser/browser client files are absent.
- GDScript and Rust source structure was checked statically.
- Project scene/preload references were checked structurally.
- No generated build/cache files are shipped.

## Required machine-level validation

The preparation environment did not contain the Rust toolchain or Godot executable, so compiler/parser execution was not claimed here.

On the target Linux machine, run:

```bash
make godot-install
make precheck
cargo build --release -p cultural-islands-server
```

`make precheck` uses the repository-local Godot installation when available. It runs Rust formatting/checks and the Godot headless parser.

## Target-machine runtime evidence supplied after the rebuild

The target Linux server successfully completed both release and debug Rust builds. The debug server reached its normal startup state on HTTP `0.0.0.0:8067`, WebSocket `0.0.0.0:8068`, and PostgreSQL `127.0.0.1:5432/cultural_islands`; its only failure was `AddrInUse`, indicating that another server instance was already bound to the port. The existing systemd service continued serving game-state requests with HTTP 200 responses.

The Godot launch failure was separate: the shell reported `godot: No such file or directory`. The updated repository therefore installs a pinned local Godot 4.7.2 binary with `make godot-install` and does not require a global `godot` executable.
