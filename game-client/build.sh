#!/usr/bin/env bash
set -e

WASM_TARGET="wasm32-unknown-unknown"
BIN="cultural_islands_client"
STATIC_DIR="../static"

echo "═══════════════════════════════════════════"
echo "  Cultural Islands — WASM Build"
echo "═══════════════════════════════════════════"

# 1. Ensure wasm target is installed
if ! rustup target list --installed | grep -q "$WASM_TARGET"; then
  echo "▶ Installing $WASM_TARGET target..."
  rustup target add "$WASM_TARGET"
fi

# 2. Verify the vendored Miniquad JS runtime is present (it lives in ../static, committed to git)
for f in gl.js sapp_jsutils.js audio.js quad-net.js index.html; do
  if [ ! -f "$STATIC_DIR/$f" ]; then
    echo "✗ Missing $STATIC_DIR/$f"; exit 1
  fi
done

# 3. Build WASM
echo "▶ Building WASM (release)..."
cargo build --release --target "$WASM_TARGET"

# 4. Copy to static
echo "▶ Copying to $STATIC_DIR/"
cp "target/$WASM_TARGET/release/$BIN.wasm" "$STATIC_DIR/"

echo ""
echo "✔ Build complete!"
echo "  WASM → $STATIC_DIR/$BIN.wasm"
echo "  JS   → $STATIC_DIR/gl.js (+ plugins)"
echo ""
echo "  Now build the server and run:"
echo "    cd ../game-server && cargo build --release"
echo "    ./target/release/cultural-islands-server"
