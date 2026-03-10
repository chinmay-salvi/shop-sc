#!/usr/bin/env bash
# Download circom binary into circuits/bin/ (used by build.sh if system circom not found).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$CIRCUITS_DIR/bin"
mkdir -p "$BIN_DIR"

ARCH=$(uname -m)
OS=$(uname -s)
if [ "$OS" != "Darwin" ] && [ "$OS" != "Linux" ]; then
  echo "Unsupported OS: $OS. Install circom from https://github.com/iden3/circom#installing"
  exit 1
fi

if [ "$OS" = "Darwin" ]; then
  # Only amd64 is published; works on arm64 via Rosetta
  URL="https://github.com/iden3/circom/releases/download/v2.2.3/circom-macos-amd64"
elif [ "$ARCH" = "x86_64" ]; then
  URL="https://github.com/iden3/circom/releases/download/v2.2.3/circom-linux-amd64"
else
  echo "Unsupported arch: $ARCH. Install circom from https://github.com/iden3/circom#installing"
  exit 1
fi

echo "Downloading circom to $BIN_DIR/circom..."
curl -sL "$URL" -o "$BIN_DIR/circom"
chmod +x "$BIN_DIR/circom"
"$BIN_DIR/circom" --version
echo "Done. Run: npm run build"