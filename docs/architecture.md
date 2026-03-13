# Architecture

## Overview

LaTeX One-Click is structured as a standard VS Code extension with the following layers:

- **Extension entry point** (`src/extension.ts`): Registers commands, status bar, and auto-compile watcher.
- **Commands** (`src/commands/`): Each command is a standalone async function.
- **Core** (`src/core/`): Business logic — compiler, log parser, diagnostics, state store, process runner.
- **Runtime** (`src/runtime/`): Manages downloading, verifying, and locating the Tectonic binary.
- **Preview** (`src/preview/`): Tracks and opens the compiled PDF.
- **Config** (`src/config/`): Settings access and defaults.

## Data Flow

1. User triggers compile (command or auto-save).
2. `compileCommand` resolves the main `.tex` file.
3. `RuntimeManager` ensures the Tectonic binary is present.
4. `compile()` spawns the Tectonic process and streams output.
5. `parseLog()` extracts errors/warnings from the output.
6. `applyDiagnostics()` pushes diagnostics into the Problems panel.
7. On success, `openPdf()` opens the PDF beside the editor.

## Key Design Decisions

- **No bundled binary**: The binary is downloaded on first use to keep the VSIX small.
- **Checksum verification**: Downloaded binaries are verified against SHA-256 checksums.
- **AbortController**: Compile can be cancelled via VS Code's progress API.
- **Debounce**: Auto-compile on save uses a debounce to avoid rapid re-compilation.
