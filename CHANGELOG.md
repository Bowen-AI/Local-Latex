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
- Refuse compile and clean output directories that point outside the workspace or at unsafe roots.
- Refuse output directories that escape the workspace through symlinks.
- Escape PDF preview webview resource URLs before embedding them in module scripts.
- Preserve uppercase `.TEX` filenames when computing output PDF paths.
- Prevent the clean command from deleting unsafe output targets.
- Remove planned runtime-channel, telemetry, and log-verbosity settings until they have implemented behavior.
- Exclude generated demo artifacts and website source from VSIX packaging.

### Documentation
- Added a GA readiness checklist and updated compatibility docs for Tectonic 0.16.9.

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
