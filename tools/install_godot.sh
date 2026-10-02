#!/usr/bin/env bash
set -euo pipefail

VERSION="${GODOT_VERSION:-4.7.2}"
INSTALL_ROOT="${GODOT_INSTALL_ROOT:-$PWD/.tools}"
BIN_DIR="$INSTALL_ROOT/godot-$VERSION"
BIN_PATH="$BIN_DIR/godot"

case "$(uname -s):$(uname -m)" in
  Linux:x86_64|Linux:amd64)
    ASSET="Godot_v${VERSION}-stable_linux.x86_64.zip"
    ;;
  Linux:aarch64|Linux:arm64)
    ASSET="Godot_v${VERSION}-stable_linux.arm64.zip"
    ;;
  *)
    echo "error: automatic Godot installation currently supports Linux x86_64 and arm64." >&2
    echo "Install Godot ${VERSION} manually, then run: make GODOT=/path/to/godot godot-run" >&2
    exit 1
    ;;
esac

BASE_URL="https://github.com/godotengine/godot/releases/download/${VERSION}-stable"
URL="${BASE_URL}/${ASSET}"
ARCHIVE="$INSTALL_ROOT/$ASSET"

if [[ -x "$BIN_PATH" ]]; then
  echo "Godot ${VERSION} already installed: $BIN_PATH"
  "$BIN_PATH" --version
  exit 0
fi

mkdir -p "$INSTALL_ROOT"

echo "Downloading Godot ${VERSION} (${ASSET})..."
if command -v curl >/dev/null 2>&1; then
  curl --fail --location --retry 3 --output "$ARCHIVE" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget --tries=3 --output-document="$ARCHIVE" "$URL"
else
  echo "error: need curl or wget to install Godot automatically." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
if command -v unzip >/dev/null 2>&1; then
  unzip -q "$ARCHIVE" -d "$TMP_DIR"
elif command -v python3 >/dev/null 2>&1; then
  python3 -c "import zipfile; zipfile.ZipFile('$ARCHIVE').extractall('$TMP_DIR')"
elif command -v python >/dev/null 2>&1; then
  python -c "import zipfile; zipfile.ZipFile('$ARCHIVE').extractall('$TMP_DIR')"
else
  echo "error: need unzip or python3 to extract Godot archive." >&2
  exit 1
fi

SOURCE_BIN="$(find "$TMP_DIR" -maxdepth 2 -type f -name 'Godot_v*-stable_linux.*' | head -n 1)"
if [[ -z "$SOURCE_BIN" ]]; then
  echo "error: downloaded archive did not contain the expected Godot executable." >&2
  exit 1
fi

mkdir -p "$BIN_DIR"
cp "$SOURCE_BIN" "$BIN_PATH"
chmod +x "$BIN_PATH"
rm -f "$ARCHIVE"

"$BIN_PATH" --version
printf '\nInstalled local Godot executable:\n  %s\n' "$BIN_PATH"
printf 'Use it with:\n  make godot-run\n  make godot-editor\n  make client-check\n'
