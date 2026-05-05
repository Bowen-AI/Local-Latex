---
layout: home
title: LaTeX One-Click | Interactive LaTeX preview in VS Code
description: A VS Code extension for local LaTeX builds with bundled Tectonic, diagnostics, interactive PDF preview, and SyncTeX click-to-source navigation.
---

<section class="hero">
  <div class="hero-shade"></div>
  <div class="hero-content">
    <p class="eyebrow">VS Code extension for local LaTeX</p>
    <h1>LaTeX One-Click</h1>
    <p class="hero-copy">Compile, preview, and jump from PDF output back to source without leaving VS Code.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="https://github.com/Bowen-AI/Local-Latex">View repository</a>
      <a class="btn btn-ghost" href="#demo">Watch workflow</a>
    </div>
  </div>
  <div class="hero-panel" aria-hidden="true">
    <span>Compile</span>
    <span>Preview</span>
    <span>Click to source</span>
  </div>
</section>

<section class="section intro-band">
  <div>
    <p class="section-kicker">Built for usable LaTeX projects</p>
    <h2>Local builds with a preview loop that feels native.</h2>
  </div>
  <p>LaTeX One-Click provisions Tectonic, resolves the right root file, compiles into a clean output directory, opens a right-side PDF panel, and uses SyncTeX to move from PDF clicks back to source lines.</p>
</section>

<section id="demo" class="section demo-section">
  <div class="section-heading">
    <p class="section-kicker">Example usage</p>
    <h2>Compile a demo paper, inspect the PDF, click back into code.</h2>
  </div>
  <figure class="demo-frame">
    <img src="./assets/usage-demo.gif" alt="Animated workflow showing LaTeX compile, PDF preview, and click-to-source navigation in VS Code">
    <figcaption>Animated demo of the new extension-owned PDF preview and SyncTeX reverse navigation.</figcaption>
  </figure>
</section>

<section class="section workflow">
  <div class="workflow-step">
    <span class="step-number">01</span>
    <h3>Compile locally</h3>
    <p>Run <code>LaTeX: Compile Document</code>. The extension downloads the pinned Tectonic runtime when needed and creates the configured output folder.</p>
  </div>
  <div class="workflow-step">
    <span class="step-number">02</span>
    <h3>Preview on the right</h3>
    <p>The generated PDF opens in a dedicated VS Code webview with zoom, fit-width, page rendering, and preserved preview state.</p>
  </div>
  <div class="workflow-step">
    <span class="step-number">03</span>
    <h3>Jump to source</h3>
    <p>Click text in the PDF preview. SyncTeX lookup opens the nearest source file and reveals the source line.</p>
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
