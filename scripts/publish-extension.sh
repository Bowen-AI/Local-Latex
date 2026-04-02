#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-all}"

if [[ "$MODE" != "all" && "$MODE" != "vscode" && "$MODE" != "openvsx" ]]; then
  echo "Usage: $0 [all|vscode|openvsx]"
  exit 1
fi

if [[ "$MODE" == "all" || "$MODE" == "vscode" ]]; then
  if [[ -z "${VSCE_PAT:-}" ]]; then
    echo "VSCE_PAT is not set. Export a Visual Studio Marketplace token first."
    exit 1
  fi
fi

if [[ "$MODE" == "all" || "$MODE" == "openvsx" ]]; then
  if [[ -z "${OVSX_PAT:-}" ]]; then
    echo "OVSX_PAT is not set. Export an Open VSX token first."
    exit 1
  fi
fi

echo "==> Running local quality gates"
npm ci
npm run compile
npm run typecheck
npm run lint
npm test

echo "==> Building VSIX"
VSIX_FILE="$(npx vsce package --no-dependencies | tail -n1 | awk '{print $NF}')"
echo "Built $VSIX_FILE"

if [[ "$MODE" == "all" || "$MODE" == "vscode" ]]; then
  echo "==> Publishing to Visual Studio Marketplace"
  npx vsce publish --no-dependencies
fi

if [[ "$MODE" == "all" || "$MODE" == "openvsx" ]]; then
  echo "==> Publishing to Open VSX"
  npx @open-vsx/ovsx publish "$VSIX_FILE"
fi

echo "Done."
