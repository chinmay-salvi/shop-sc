#!/usr/bin/env bash
# Copy circuit build artifacts to frontend public so the browser can load WASM and zkey.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$CIRCUITS_DIR/build"
FRONTEND_PUBLIC="$CIRCUITS_DIR/../frontend/public/zkp"

if [ ! -d "$BUILD_DIR/jwt_usc_main_js" ] || [ ! -f "$BUILD_DIR/jwt_usc_main_final.zkey" ]; then
  echo "Run: cd circuits && npm run build && npm run setup"
  exit 1
fi

mkdir -p "$FRONTEND_PUBLIC"
cp -r "$BUILD_DIR/jwt_usc_main_js" "$FRONTEND_PUBLIC/"
cp "$BUILD_DIR/jwt_usc_main_final.zkey" "$FRONTEND_PUBLIC/"
echo "Copied circuit artifacts to $FRONTEND_PUBLIC"
ls -la "$FRONTEND_PUBLIC"
