#!/usr/bin/env bash
# Compile jwt_usc_main.circom to R1CS, WASM, and C++ witness generator.
# Requires: circom (install from https://github.com/iden3/circom#installing)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$CIRCUITS_DIR/build"
mkdir -p "$BUILD_DIR"

CIRCOM="${CIRCUITS_DIR}/bin/circom"
if [ ! -x "$CIRCOM" ]; then
  CIRCOM="circom"
  if ! command -v circom &> /dev/null; then
    echo "Error: circom not found. Add circuits/bin/circom or install from https://github.com/iden3/circom#installing"
    exit 1
  fi
fi

echo "Compiling jwt_usc_main.circom..."
cd "$CIRCUITS_DIR"
"$CIRCOM" jwt_usc_main.circom \
  --r1cs --wasm --sym \
  -o "$BUILD_DIR"

echo "Build artifacts in $BUILD_DIR:"
ls -la "$BUILD_DIR"
echo "Done. Run npm run setup for trusted setup and vkey export."
