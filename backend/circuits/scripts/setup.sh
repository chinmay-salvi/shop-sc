#!/usr/bin/env bash
# Trusted setup (Groth16): ptau, zkey, then export verification key and WASM prover.
# Run after build.sh. Requires: circom, node (for snarkjs)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$CIRCUITS_DIR/build"
CIRCUIT_NAME="jwt_usc_main"

cd "$CIRCUITS_DIR"
mkdir -p "$BUILD_DIR"

if [ ! -f "$BUILD_DIR/${CIRCUIT_NAME}.r1cs" ]; then
  echo "Run npm run build first."
  exit 1
fi

# Use snarkjs from node_modules
SNARKJS="node_modules/.bin/snarkjs"
if [ ! -f "$SNARKJS" ]; then
  npm install
fi

# Circuit has ~537k constraints (RSA); need 2^20 ptau. Download from zkevm (large file, may take a few minutes).
PTAU="$BUILD_DIR/pot20_final.ptau"
if [ ! -f "$PTAU" ] || [ ! -s "$PTAU" ]; then
  echo "Downloading powers of tau 2^20 (ptau)..."
  curl -L -o "$PTAU" "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_20.ptau"
fi
if [ ! -s "$PTAU" ]; then
  echo "Error: ptau download failed or file empty. Check network and retry."
  exit 1
fi

echo "Phase 2: circuit-specific setup..."
$SNARKJS groth16 setup "$BUILD_DIR/${CIRCUIT_NAME}.r1cs" "$PTAU" "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey"
echo "Contributing random beacon (optional; for production use a real ceremony)..."
$SNARKJS zkey contribute "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey" "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" --name="neighbor-know-dev" -v -e="random entropy"
$SNARKJS zkey export verificationkey "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" "$BUILD_DIR/verification_key.json"

echo "Verification key written to $BUILD_DIR/verification_key.json"
echo "Copy to backend: cp $BUILD_DIR/verification_key.json ../backend/src/config/jwt_circuit_vkey.json"
echo "Done."
