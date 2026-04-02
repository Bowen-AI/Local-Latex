#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Installing dependencies"
npm ci

echo "==> Running checks"
npm run compile
npm run typecheck
npm run lint
npm test
node ./scripts/smoke-test.js

echo "==> Packaging VSIX"
VSIX_FILE="$(npx vsce package --no-dependencies | tail -n1 | awk '{print $NF}')"
echo "Built: $VSIX_FILE"

echo
if command -v code >/dev/null 2>&1; then
  echo "==> VS Code CLI detected"
  echo "Installing VSIX into your local VS Code profile..."
  code --install-extension "$VSIX_FILE" --force
  echo
  echo "Open this repo in VS Code, then run:"
  echo "  F5"
  echo "This launches an Extension Development Host testbed where you can compile sample .tex files."
else
  echo "VS Code CLI (code) not found."
  echo "Manual local test steps:"
  echo "  1) Open VS Code"
  echo "  2) Extensions: Install from VSIX..."
  echo "  3) Select $VSIX_FILE"
  echo "  4) Open this repo and press F5 for Extension Development Host"
fi
