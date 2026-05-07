# Compatibility

## VS Code

Minimum version: **1.85.0**

## Platforms

| Platform | Architecture | Status |
|----------|-------------|--------|
| macOS | arm64 (Apple Silicon) | ✅ Supported |
| macOS | x64 (Intel) | ✅ Supported |
| Windows | x64 | ✅ Supported |
| Linux | x64 | ✅ Supported |
| Linux | arm64 | ❌ Not yet supported |
| Windows | arm64 | ❌ Not yet supported |

## Node.js

The extension runs in the VS Code extension host. No separate Node.js installation is required.

## TeX Engine

LaTeX One-Click uses [Tectonic](https://tectonic-typesetting.github.io/) 0.16.9, which is based on XeTeX.
pdfLaTeX-specific packages may not be compatible.

The active runtime version is defined in `resources/runtime-manifest.json`. The extension records the installed runtime version and platform in global storage; if the bundled manifest changes in a future release, the runtime is refreshed before compilation.
