#!/usr/bin/env bash
# Regenerate non-screenshot marketplace artwork.
#
# Real README and project-page screenshots come from
# `npm run assets:capture`, which launches VS Code and captures the
# extension UI. This script intentionally does not overwrite them.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
RSVG="${RSVG:-rsvg-convert}"

"$RSVG" -w 256 "resources/marketplace-icon.svg" -o "resources/marketplace-icon.png"

echo "Wrote resources/marketplace-icon.png"
