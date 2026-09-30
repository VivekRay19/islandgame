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

# 2. Download mq_js_bundle.js if missing
if [ ! -f "$STATIC_DIR/mq_js_bundle.js" ]; then
  echo "▶ Downloading Macroquad JS bundle..."
  curl -fsSL -o "$STATIC_DIR/mq_js_bundle.js" \
    "https://not-fl3.github.io/miniquad-samples/mq_js_bundle.js"
fi

# 3. Build WASM
echo "▶ Building WASM (release)..."
cargo build --release --target "$WASM_TARGET"

# 4. Copy to static
echo "▶ Copying to $STATIC_DIR/"
cp "target/$WASM_TARGET/release/$BIN.wasm" "$STATIC_DIR/"

echo ""
echo "✔ Build complete!"
echo "  WASM → $STATIC_DIR/$BIN.wasm"
echo "  JS   → $STATIC_DIR/mq_js_bundle.js"
echo ""
echo "  Now build the server and run:"
echo "    cd ../game-server && cargo build --release"
echo "    ./target/release/cultural-islands-server"
