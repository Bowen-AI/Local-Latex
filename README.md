# LaTeX One-Click

**Compile `.tex` files to PDF inside VS Code without installing MiKTeX, TeX Live, or MacTeX.**

LaTeX One-Click is a small, open-source VS Code extension for local LaTeX builds. It downloads a verified [Tectonic](https://tectonic-typesetting.github.io/) runtime on first use, compiles your document locally, opens a built-in PDF preview, and reports LaTeX errors in VS Code.

## What It Does

- Compile the current LaTeX project with `LaTeX: Compile Document`.
- Open and refresh a local PDF preview after successful builds.
- Work out of the box for simple `main.tex` projects.
- Follow `% !TEX root = ...` directives for multi-file papers.
- Show LaTeX errors and warnings in the Problems panel.
- Support optional auto-compile on save.
- Generate SyncTeX output for source/PDF synchronization workflows.
- Keep build artifacts in a workspace-local output directory.

## Why Install It

LaTeX setup is often the slowest part of writing a paper. This extension is for people who want a practical local workflow:

- No separate TeX distribution install.
- No cloud compile service.
- No project upload.
- One command from `.tex` to `.pdf`.
- A focused sidebar with the two main actions: compile and open preview.
- Advanced settings available only when you need them.

## Trust, Openness, and Privacy

This project is open source: <https://github.com/Bowen-AI/Local-Latex>

The extension is designed to be inspectable and conservative:

- No telemetry is collected.
- Compilation runs locally in a child process with `shell: false`.
- Compile, clean, preview, and root-selection commands require a trusted workspace.
- Output directories are restricted to safe workspace-local paths.
- The Tectonic binary is downloaded from official GitHub Releases and verified with SHA-256 checksums before use.
- Downloaded runtime archives are removed after extraction.
- No secrets, tokens, or credentials are stored or used.

Network behavior is intentionally limited and documented:

- On first compile, the extension downloads the Tectonic binary from official GitHub Releases.
- During compilation, Tectonic may also download missing TeX packages.
- Set `latexOneClick.offlineOnly` to `true` to force cached-only package use after the needed packages are already available.

See [docs/security.md](docs/security.md) for the detailed security model.

## Quick Start

1. Install the extension.
2. Open a trusted folder containing a `.tex` file. Mixed-case extensions such as `.TEX` and `.TeX` are recognized.
3. Run `LaTeX: Compile Document` from the Command Palette, click the status bar button, or use the extension sidebar.
4. The generated PDF opens beside your editor.

First compile may take longer because Tectonic needs to download its runtime and any missing TeX packages. Later cached builds should be much faster.

## First Compile Example

Create `main.tex`:

```latex
\documentclass{article}
\begin{document}
Hello, World!
\end{document}
```

Open the folder in VS Code and run `LaTeX: Compile Document`. The extension will resolve the main file, ensure Tectonic is available, compile locally, and open `out/main.pdf`.

## Main Commands

| Command | What it does |
|---------|--------------|
| `LaTeX: Compile Document` | Builds the active/resolved LaTeX document |
| `LaTeX: Open PDF Preview` | Opens the last generated PDF |
| `LaTeX: Select Root File` | Sets the project main `.tex` file |
| `LaTeX: Clean Build Artifacts` | Removes workspace-local build outputs |
| `LaTeX: Doctor` | Reports runtime, workspace, settings, and output-directory health |

The activity-bar sidebar keeps `Compile document` and `Open PDF preview` at the top level. Root selection, output directory, toggles, clean, and Doctor are grouped under `Advanced`.

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `latexOneClick.autoCompileOnSave` | boolean | `false` | Compile automatically on save |
| `latexOneClick.compileDebounceMs` | number | `1000` | Debounce delay for auto-compile in ms |
| `latexOneClick.mainFile` | string | `""` | Main LaTeX file to compile |
| `latexOneClick.outputDirectory` | string | `"out"` | Output directory for compiled files |
| `latexOneClick.offlineOnly` | boolean | `false` | Use only cached packages |
| `latexOneClick.compileTimeoutSec` | number | `60` | Compile timeout in seconds |
| `latexOneClick.preview.autoOpen` | boolean | `true` | Auto-open PDF after compile |
| `latexOneClick.preview.preserveFocus` | boolean | `true` | Keep editor focus when PDF opens |
| `latexOneClick.syncTeX` | boolean | `true` | Generate SyncTeX metadata (`.synctex.gz`) on compile |

Compile and clean actions refuse filesystem roots, the home directory, the workspace root, symlinked paths outside the workspace, and output directories outside the current workspace.

## Multi-File Projects

For projects with multiple `.tex` files, add this directive to chapter files:

```latex
% !TEX root = ../main.tex
```

You can also run `LaTeX: Select Root File` to choose the main file interactively.

## Known Limitations

- Tectonic builds with XeTeX; pdfLaTeX-specific packages or workflows may need changes.
- Linux arm64 and Windows arm64 are not supported yet.
- `Tectonic.toml` project format is planned but not supported yet.
- Reverse search from PDF click to source is experimental and depends on SyncTeX data.

## Troubleshooting

Run `LaTeX: Doctor` first. It reports:

- supported platform status,
- runtime path and readiness,
- trusted workspace status,
- configured and resolved main file,
- configured and resolved output directory,
- key compile and preview settings.

For common issues, see [docs/troubleshooting.md](docs/troubleshooting.md).

## Development

```bash
npm ci
npm run compile
npm test
npm run smoke
npm run test:extension
npm run package:check
```

- `npm test`: unit and e2e-style tests.
- `npm run smoke`: quick artifact and metadata sanity check.
- `npm run test:extension`: VS Code extension-host smoke test for command registration, Doctor, PDF preview readiness, sidebar shape, and Clean.
- `npm run package:check`: validates marketplace package contents, runtime manifest, activation events, and published settings.

For release details, see [docs/release.md](docs/release.md).

## Website

This repository also includes a GitHub Pages site in `website/`, built by `.github/workflows/pages.yml`.
