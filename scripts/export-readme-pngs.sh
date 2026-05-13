#!/usr/bin/env bash
# Regenerate README/marketplace PNG screenshots from website SVGs (Marketplace disallows SVG in README).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
RSVG="${RSVG:-rsvg-convert}"
mkdir -p resources/readme
for f in gui-command-palette gui-pdf-preview gui-status-bar; do
  "$RSVG" -w 1000 "website/assets/${f}.svg" -o "resources/readme/${f}.png"
done
echo "Wrote resources/readme/*.png"
