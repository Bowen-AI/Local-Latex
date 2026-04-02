---
layout: home
title: LaTeX One-Click | Local LaTeX build in VS Code
description: A production-ready LaTeX workflow for VS Code with one-click compile, bundled Tectonic runtime, diagnostics, PDF preview, and collaboration-friendly docs.
---

<div class="hero">
  <p class="eyebrow">VS Code Extension · Open Source</p>
  <h1>LaTeX One-Click</h1>
  <p class="hero-copy">Compile LaTeX locally in VS Code with a bundled runtime, clear diagnostics, and fast PDF preview. No TeX Live setup. No fragile onboarding.</p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="https://github.com/Bowen-AI/Local-Latex">Repository</a>
    <a class="btn" href="https://github.com/Bowen-AI/Local-Latex/issues">Open an Issue</a>
    <a class="btn" href="https://github.com/Bowen-AI/Local-Latex/pulls">Contribute a PR</a>
  </div>
</div>

<div class="notice">
  <strong>Collaboration welcome:</strong> if you hit bugs, edge cases, or UX pain points, please open an issue with logs and sample `.tex` files so we can reproduce quickly.
</div>

## Why this extension exists

Most LaTeX setups fail on onboarding: inconsistent environments, missing toolchains, and difficult error tracing. LaTeX One-Click keeps the workflow inside VS Code so contributors can clone, compile, and iterate immediately.

## Core product capabilities

<div class="grid two-up">
  <div class="card">
    <h3>Zero-setup compile</h3>
    <p>Run <code>LaTeX: Compile Document</code> directly from VS Code. The extension handles runtime provisioning.</p>
  </div>
  <div class="card">
    <h3>Inline diagnostics</h3>
    <p>Compiler output is parsed into actionable Problems panel entries with source mapping.</p>
  </div>
  <div class="card">
    <h3>PDF preview workflow</h3>
    <p>Open generated PDF immediately after successful compile to shorten edit/verify loops.</p>
  </div>
  <div class="card">
    <h3>Project-scale support</h3>
    <p>Use root-file selection and <code>% !TEX root</code> directives for multi-file documents.</p>
  </div>
</div>

## Product preview

![Status bar compile action](./assets/gui-status-bar.svg)

![Command palette compile flow](./assets/gui-command-palette.svg)

![Side-by-side editor and PDF preview](./assets/gui-pdf-preview.svg)

## Get started in 60 seconds

1. Install dependencies and compile the extension:
   ```bash
   npm ci
   npm run compile
   ```
2. Open the workspace in VS Code.
3. Run `LaTeX: Compile Document`.
4. Test with this minimal file:
   ```latex
   \documentclass{article}
   \begin{document}
   Hello, LaTeX One-Click!
   \end{document}
   ```

## Collaboration & contribution

We actively welcome contributions from users and maintainers.

- Report bugs or request features: [GitHub Issues](https://github.com/Bowen-AI/Local-Latex/issues)
- Propose fixes or improvements: [Pull Requests](https://github.com/Bowen-AI/Local-Latex/pulls)
- Before opening a PR, run:

```bash
npm run smoke
npm test
```

For high-quality bug reports, include your OS, VS Code version, extension version, and a minimal reproducible `.tex` example.

## Technical docs

- [Architecture](../docs/architecture.md)
- [Compatibility](../docs/compatibility.md)
- [Security](../docs/security.md)
- [Troubleshooting](../docs/troubleshooting.md)
- [Release Process](../docs/release.md)

## Project links

- Repository: [github.com/Bowen-AI/Local-Latex](https://github.com/Bowen-AI/Local-Latex)
- Maintainer profile: [bowenislandsong.github.io/#/personal](https://bowenislandsong.github.io/#/personal)
