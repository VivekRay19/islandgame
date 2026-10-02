#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$ROOT"

echo "== Cultural Islands source precheck =="
python3 tools/source_sanity.py
command -v cargo >/dev/null 2>&1 || { echo "ERROR: cargo is required" >&2; exit 1; }
command -v rustfmt >/dev/null 2>&1 || { echo "ERROR: rustfmt is required" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: node is required for client syntax checks" >&2; exit 1; }

echo "[1/3] Rust formatting"
cargo fmt --all -- --check

echo "[2/3] Rust compiler/type check"
cargo check --workspace --all-targets

echo "[3/3] PixiJS client syntax + structure"
node --check static/app.js
python3 tools/client_sanity.py

echo "✔ ALL SOURCE PRECHECKS PASSED"
