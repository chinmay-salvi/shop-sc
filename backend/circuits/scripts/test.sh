#!/usr/bin/env bash
# Generate a test witness and proof; verify with snarkjs.
# Run after build.sh and setup.sh.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$CIRCUITS_DIR/build"
CIRCUIT_NAME="jwt_usc_main"

cd "$CIRCUITS_DIR"
SNARKJS="node_modules/.bin/snarkjs"

if [ ! -f "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" ]; then
  echo "Run npm run setup first."
  exit 1
fi

# Sample inputs (field elements). sub = 123456789012345678901 (example Google sub), pepper = 1, currentTime < exp.
BUILD_DIR="$BUILD_DIR" node "$CIRCUITS_DIR/scripts/gen_test_input.js"

echo "Generating witness..."
cd "$BUILD_DIR/${CIRCUIT_NAME}_js"
node generate_witness.js ${CIRCUIT_NAME}.wasm ../input.json ../witness.wtns

cd "$BUILD_DIR"
echo "Generating proof..."
$SNARKJS groth16 prove "${CIRCUIT_NAME}_final.zkey" witness.wtns proof.json public.json
echo "Verifying..."
$SNARKJS groth16 verify verification_key.json public.json proof.json
echo "Test passed: proof verified."
