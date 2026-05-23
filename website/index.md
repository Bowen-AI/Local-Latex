---
layout: home
title: LaTeX One-Click | Local LaTeX compile and preview in VS Code
description: A VS Code extension for local LaTeX builds with bundled Tectonic, diagnostics, PDF preview, and SyncTeX click-to-source navigation.
---

<style>
  .site-header,
  .site-footer,
  .home > .page-heading {
    display: none;
  }
</style>

<section class="hero">
  <div class="hero-shade"></div>
  <div class="hero-content">
    <p class="eyebrow">VS Code extension for local LaTeX</p>
    <h1>LaTeX One-Click</h1>
    <p class="hero-copy">Skip MacTeX, TeX Live, and MiKTeX setup. Install the add-on, compile your PDF, then click the preview to jump back to the source line you need to edit.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="https://marketplace.visualstudio.com/items?itemName=BowenAI.latex-one-click">VS Code Marketplace</a>
      <a class="btn btn-ghost" href="https://open-vsx.org/extension/BowenAI/latex-one-click">Open VSX</a>
      <a class="btn btn-ghost" href="https://github.com/Bowen-AI/Local-Latex">Repository</a>
    </div>
  </div>
  <div class="hero-panel" aria-hidden="true">
    <span>No TeX distribution</span>
    <span>One-command compile</span>
    <span>PDF click to source</span>
  </div>
</section>

<section class="section intro-band">
  <div>
    <p class="section-kicker">The setup-free LaTeX loop</p>
    <h2>Install the extension instead of a full TeX distribution.</h2>
  </div>
  <p>LaTeX One-Click provisions Tectonic, resolves the right root file, compiles into a clean output directory, opens a PDF panel, and uses SyncTeX to move from PDF clicks back to the source lines you want to edit.</p>
</section>

<section id="demo" class="section demo-section">
  <div class="section-heading">
    <p class="section-kicker">Real VS Code capture</p>
    <h2>No TeX install. Compile a PDF. Click back into code.</h2>
  </div>
  <figure class="demo-frame">
    <img src="./assets/workflow-demo.png" alt="Real VS Code screenshot showing LaTeX source beside the generated PDF preview">
    <figcaption>Captured from the extension running in VS Code: source on the left, compiled PDF preview on the right.</figcaption>
  </figure>
</section>

<section class="section screenshots">
  <figure>
    <img src="./assets/gui-command-palette.png" alt="Real VS Code Command Palette showing LaTeX One-Click commands">
    <figcaption>Command Palette compile</figcaption>
  </figure>
  <figure>
    <img src="./assets/gui-pdf-preview.png" alt="Real VS Code screenshot with PDF preview beside LaTeX source">
    <figcaption>PDF beside source</figcaption>
  </figure>
  <figure>
    <img src="./assets/gui-status-bar.png" alt="Real VS Code screenshot with PDF preview and selected LaTeX source line">
    <figcaption>Click back to code</figcaption>
  </figure>
</section>

<section class="section workflow">
  <div class="workflow-step">
    <span class="step-number">01</span>
    <h3>Install the add-on</h3>
    <p>Skip MacTeX, TeX Live, and MiKTeX. The extension manages the Tectonic runtime for you.</p>
  </div>
  <div class="workflow-step">
    <span class="step-number">02</span>
    <h3>Compile locally</h3>
    <p>Run <code>LaTeX: Compile Document</code>. The extension resolves the root file and builds the PDF from VS Code.</p>
  </div>
  <div class="workflow-step">
    <span class="step-number">03</span>
    <h3>Click PDF text</h3>
    <p>The integrated preview opens beside your source. Click rendered output to trace it back to LaTeX.</p>
  </div>
  <div class="workflow-step">
    <span class="step-number">04</span>
    <h3>Edit exact code</h3>
    <p>SyncTeX reverse search reveals the matching source line, so you can revise the code that produced the PDF text.</p>
  </div>
</section>

<section class="section feature-grid">
  <div class="feature-card">
    <h3>Bundled runtime</h3>
    <p>Tectonic is pinned, checksummed, and provisioned by the extension instead of relying on a separate TeX install.</p>
  </div>
  <div class="feature-card">
    <h3>Project-aware roots</h3>
    <p>Supports settings, <code>main.tex</code>, nested roots, active editors, and <code>% !TEX root</code> directives.</p>
  </div>
  <div class="feature-card">
    <h3>Problems panel output</h3>
    <p>Compiler logs are parsed into diagnostics so errors and warnings land where VS Code users expect them.</p>
  </div>
  <div class="feature-card">
    <h3>Demo workspace included</h3>
    <p>Open <code>examples/demo-paper</code> to try a multi-file document with interactive preview navigation.</p>
  </div>
</section>

<section class="section quickstart">
  <div class="quickstart-copy">
    <p class="section-kicker">Developer quick start</p>
    <h2>Run the extension locally.</h2>
    <p>Use the included VS Code launch config, then open the demo paper and run the compile command.</p>
  </div>
  <div class="command-block">
<pre><code>npm ci
npm run compile
# VS Code: Run Extension
# Open examples/demo-paper
# Run "LaTeX: Compile Document"</code></pre>
  </div>
</section>

<section class="section docs-row">
  <a href="https://github.com/Bowen-AI/Local-Latex/blob/main/docs/architecture.md">Architecture</a>
  <a href="https://github.com/Bowen-AI/Local-Latex/blob/main/docs/compatibility.md">Compatibility</a>
  <a href="https://github.com/Bowen-AI/Local-Latex/blob/main/docs/security.md">Security</a>
  <a href="https://github.com/Bowen-AI/Local-Latex/blob/main/docs/troubleshooting.md">Troubleshooting</a>
  <a href="https://github.com/Bowen-AI/Local-Latex/blob/main/docs/release.md">Release process</a>
</section>
