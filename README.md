# LaTeX One-Click

**Compile LaTeX to PDF locally with no separate TeX installation.**

LaTeX One-Click bundles the [Tectonic](https://tectonic-typesetting.github.io/) typesetting engine directly into VS Code, so you can go from `.tex` to `.pdf` with a single click — no MiKTeX, TeX Live, or MacTeX required.

---

## ✨ Features

- **One-click compilation** — press the status bar button or run `LaTeX: Compile Document`
- **Zero configuration** — works out of the box for single-file documents
- **Bundled Tectonic engine** — no external TeX installation needed
- **PDF preview** — auto-opens the PDF after a successful build
- **SyncTeX output** — emits source mapping metadata for editor/PDF synchronization workflows
- **Error diagnostics** — errors and warnings appear in the Problems panel
- **Auto-compile on save** — optional, with configurable debounce
- **Multi-file support** — respects `%!TEX root` directives
- **Clean command** — removes build artifacts with one command
- **Doctor command** — shows extension health and runtime status

---

## 🚀 Quick Start

1. Install the extension
2. Open a folder containing a `.tex` file
3. Click the **$(file-pdf) LaTeX** button in the status bar, or press `Ctrl+Shift+P` → `LaTeX: Compile Document`
4. The PDF opens automatically beside your editor

### Run & test locally (developer commands)

```bash
npm ci
npm run compile
npm test
npm run smoke
npm run test:local
```

- `npm run smoke`: quick artifact sanity check.
- `npm run test:local`: full local test bed (quality gates + VSIX package + optional local install).

---

## 📋 First Compile Walkthrough

1. Create `main.tex`:
   ```latex
   \documentclass{article}
   \begin{document}
   Hello, World!
   \end{document}
   ```
2. Open the folder in VS Code
3. On first run, the extension downloads the Tectonic binary (~10 MB)
4. Click the status bar button — compilation takes a few seconds
5. The PDF appears in a side panel

---

## ⚙️ Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `latexOneClick.autoCompileOnSave` | boolean | `false` | Compile automatically on save |
| `latexOneClick.compileDebounceMs` | number | `1000` | Debounce delay for auto-compile (ms) |
| `latexOneClick.mainFile` | string | `""` | Main `.tex` file to compile |
| `latexOneClick.outputDirectory` | string | `"out"` | Output directory for compiled files |
| `latexOneClick.runtimeChannel` | string | `"stable"` | Tectonic runtime channel |
| `latexOneClick.offlineOnly` | boolean | `false` | Use only cached packages |
| `latexOneClick.compileTimeoutSec` | number | `60` | Compilation timeout in seconds |
| `latexOneClick.telemetry.enabled` | boolean | `false` | Enable telemetry |
| `latexOneClick.preview.autoOpen` | boolean | `true` | Auto-open PDF after compile |
| `latexOneClick.preview.preserveFocus` | boolean | `true` | Keep editor focus when PDF opens |
| `latexOneClick.syncTeX` | boolean | `true` | Generate SyncTeX metadata (`.synctex.gz`) on compile |
| `latexOneClick.logs.verbosity` | string | `"normal"` | Log verbosity (`normal`/`verbose`/`debug`) |

---

## 🏗️ Multi-File Projects

For projects with multiple `.tex` files, add this directive to chapter files:

```latex
% !TEX root = ../main.tex
```

Or run `LaTeX: Select Root File` to choose the main file interactively.

---

## ⚠️ Known Limitations

- Only XeTeX is supported (via Tectonic) — pdfLaTeX-specific features may not work
- Linux arm64 and Windows arm64 are not yet supported
- `Tectonic.toml` project format is planned but not yet supported
- Reverse search (clicking in PDF to jump to source) depends on VS Code PDF viewer APIs and is not fully implemented yet

---

## 🔧 Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md) for common issues.

Run `LaTeX: Doctor` for a health check of the extension and runtime.

---

## 🔒 Privacy

No telemetry is collected by default. The only network request is downloading the Tectonic binary from GitHub Releases on first use. All compilation happens locally.

---

## 📦 Publishing to extension marketplaces

See [docs/release.md](docs/release.md) for the full release flow.

Quick publish (runs checks + package + publish):

```bash
bash ./scripts/publish-extension.sh all
```

To publish only to one marketplace:

```bash
bash ./scripts/publish-extension.sh vscode
bash ./scripts/publish-extension.sh openvsx
```

Notes:
- Visual Studio Marketplace publish uses `VSCE_PAT`.
- Open VSX publish uses `OVSX_PAT`.
- Cursor users often rely on the Open VSX ecosystem, so publishing there improves discoverability in Cursor-like environments.

---

## 🧪 Local test bed (before pushing)

Run the full local pre-push test bed:

```bash
npm run test:local
```

This will compile, typecheck, lint, run unit tests, run smoke checks, package a VSIX, and (if the `code` CLI is available) install it locally so you can test in VS Code before publishing.

Quick checks only:

```bash
npm run smoke
npm test
```

---

## 📄 License

MIT — see [LICENSE](LICENSE).
