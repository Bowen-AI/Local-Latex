# Changelog

All notable changes to LaTeX One-Click will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Reject unsupported Linux arm64 and Windows arm64 platforms instead of falling back to x64 runtime downloads.
- Report runtime setup failures through the compile command instead of letting download/extraction errors escape.
- Use PowerShell archive extraction for Windows runtime zip files.
- Stage runtime extraction before replacing the cached binary or writing installed runtime metadata.
- Handle quoted `% !TEX root` directives with trailing comments.
- Restrict automatic main-file resolution to workspace-local `.tex` files.
- Refuse main files that escape the workspace through symlinks.
- Refuse compile and clean output directories that point outside the workspace or at unsafe roots.
- Refuse output directories that escape the workspace through symlinks.
- Escape PDF preview webview resource URLs before embedding them in module scripts.
- Cover PDF preview HTML escaping for titles and webview resource URLs containing spaces, quotes, ampersands, and script delimiters.
- Preserve uppercase `.TEX` filenames when computing output PDF paths.
- Activate workspaces that contain only uppercase or mixed-case `.TEX` files.
- Detect uppercase and mixed-case `.TEX` files in auto-compile and workspace file discovery flows.
- Activate all contributed commands directly so no-folder or untrusted workspaces get clear support warnings instead of unavailable commands.
- Add a VS Code CLI extension-host smoke that verifies activation, command registration, Doctor, PDF preview, and Clean in an isolated temp workspace.
- Run an automated VSIX package-content allowlist/blocklist check during package and release flows.
- Validate runtime manifest checksums, supported platforms, activation events, and hidden unimplemented settings during package checks.
- Publish marketplace releases from the VSIX artifact that passed package-content checks.
- Remove the unused compile-all command implementation from the GA package surface.
- Expand the Doctor command to report workspace, settings, main-file, and output-directory diagnostics, including limited support in untrusted or no-folder contexts.
- Prevent the clean command from deleting unsafe output targets.
- Remove planned runtime-channel, telemetry, and log-verbosity settings until they have implemented behavior.
- Exclude generated demo artifacts and website source from VSIX packaging.

### Documentation

- Added a GA readiness checklist and updated compatibility docs for Tectonic 0.16.9.
- Clarified marketplace privacy and security docs for telemetry, first-use runtime downloads, Tectonic package downloads, offline mode, and limited Doctor support in untrusted workspaces.

## [0.1.2] - 2026-05-13

### Fixed

- Show a clear bibliography hint when Tectonic/BibTeX generates an empty `.bbl` for projects with bibliography commands but no citations.
- Parse Tectonic `file:line` diagnostics so generated `.bbl` failures point to the correct file in the Errors & Warnings view.
- Keep volatile compressed PDF metadata from forcing unnecessary preview refreshes.
- Remove local agent-debug instrumentation and block debug artifacts from VSIX packaging.

### Tests

- Add a VS Code extension-host smoke for the empty-bibliography failure path.

## [0.1.1] - 2026-05-13

### Changed

- Patch release: version bump for continued marketplace distribution.
- Expand marketplace `README.md` and `package.json` description/keywords: open-source mission, local-first privacy story, and fit with AI-assisted editors (VS Code, Cursor, local models).
- Document SyncTeX / PDF click-to-source and a source-code layout table (`src/preview`, `src/commands`, etc.).

## [0.1.0] - 2024-01-01

### Added
- Initial release of LaTeX One-Click
- One-click LaTeX compilation via bundled Tectonic engine
- Automatic PDF preview after successful compilation
- Auto-compile on save with configurable debounce
- LaTeX diagnostic integration (errors and warnings in Problems panel)
- Clean build artifacts command
- Root file selector for multi-file projects
- Doctor command for extension health diagnostics
- Support for `%!TEX root` directive
- Cross-platform support: macOS (arm64/x64), Windows (x64), Linux (x64)
- Configurable output directory, timeout, and verbosity
- Workspace Trust support
