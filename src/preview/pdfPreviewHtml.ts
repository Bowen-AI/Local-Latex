import { toScriptStringLiteral } from './htmlEscaping';

export interface PdfPreviewHtmlOptions {
  cspSource: string;
  pdfFileName: string;
  pdfUri: string;
  pdfJsUri: string;
  workerUri: string;
  cMapsUri: string;
  standardFontsUri: string;
  nonce?: string;
}

export function buildPdfPreviewHtml(options: PdfPreviewHtmlOptions): string {
  const nonce = options.nonce ?? getNonce();
  const title = escapeHtml(options.pdfFileName);
  const pdfUrlLiteral = toScriptStringLiteral(options.pdfUri);
  const pdfJsUriLiteral = toScriptStringLiteral(options.pdfJsUri);
  const workerUriLiteral = toScriptStringLiteral(options.workerUri);
  const cMapsUriLiteral = toScriptStringLiteral(withTrailingSlash(options.cMapsUri));
  const standardFontsUriLiteral = toScriptStringLiteral(withTrailingSlash(options.standardFontsUri));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${options.cspSource} data:; connect-src ${options.cspSource}; script-src 'nonce-${nonce}' ${options.cspSource}; style-src 'unsafe-inline' ${options.cspSource}; worker-src blob: ${options.cspSource};">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
      --toolbar: var(--vscode-editor-background);
      --border: var(--vscode-panel-border);
      --text: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --button: var(--vscode-button-secondaryBackground);
      --button-hover: var(--vscode-button-secondaryHoverBackground);
      --accent: var(--vscode-focusBorder);
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      background: var(--vscode-editor-background);
      color: var(--text);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 38px;
      padding: 4px 8px;
      border-bottom: 1px solid var(--border);
      background: var(--toolbar);
    }

    .toolbarGroup {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--muted);
    }

    button {
      min-width: 30px;
      height: 28px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--button);
      color: var(--text);
      cursor: pointer;
    }

    button:hover {
      background: var(--button-hover);
    }

    .primaryButton {
      min-width: 72px;
      padding: 0 10px;
    }

    .iconButton {
      width: 30px;
      padding: 0;
      font-weight: 600;
    }

    #zoomValue {
      min-width: 46px;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
      text-align: center;
    }

    #status {
      min-width: 92px;
      color: var(--muted);
      text-align: right;
    }

    #viewer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 16px;
      overflow: auto;
    }

    .page {
      position: relative;
      box-shadow: 0 2px 16px rgb(0 0 0 / 24%);
      background: white;
      cursor: crosshair;
    }

    .pagePlaceholder {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      cursor: default;
    }

    canvas {
      display: block;
    }

    .pageNumber {
      position: absolute;
      right: 8px;
      bottom: 6px;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgb(0 0 0 / 55%);
      color: white;
      font-size: 11px;
      pointer-events: none;
    }

    .pulse {
      position: absolute;
      width: 18px;
      height: 18px;
      margin: -9px 0 0 -9px;
      border: 2px solid var(--accent);
      border-radius: 50%;
      pointer-events: none;
      animation: pulse 600ms ease-out forwards;
    }

    @keyframes pulse {
      from {
        opacity: 1;
        transform: scale(0.7);
      }
      to {
        opacity: 0;
        transform: scale(2.4);
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="compile" class="primaryButton" title="Compile PDF">Compile</button>
    <div class="toolbarGroup" aria-label="Zoom controls">
      <button id="zoomOut" class="iconButton" title="Zoom out (Ctrl+-)" aria-label="Zoom out">-</button>
      <div id="zoomValue" aria-live="polite">125%</div>
      <button id="zoomIn" class="iconButton" title="Zoom in (Ctrl+= / Ctrl++)" aria-label="Zoom in">+</button>
      <button id="view" title="Fit to width">Fit</button>
    </div>
    <div class="title">${title}</div>
    <div id="status">Loading</div>
  </div>
  <main id="viewer"></main>

  <script nonce="${nonce}">
    window.__latexOneClickPreviewBootStarted = performance.now();
  </script>
  <script nonce="${nonce}" type="module">
    import * as pdfjsLib from ${pdfJsUriLiteral};

    const bootStartedAt = Number(window.__latexOneClickPreviewBootStarted) || performance.now();
    const moduleReadyAt = performance.now();
    const vscode = acquireVsCodeApi();
    const viewer = document.getElementById('viewer');
    const status = document.getElementById('status');
    const titleElement = document.querySelector('.title');
    const zoomValue = document.getElementById('zoomValue');
    let pdfUrl = ${pdfUrlLiteral};
    const previousState = vscode.getState() || {};
    const defaultScale = 1.25;
    const minScale = 0.5;
    const maxScale = 3;
    const scaleStep = 0.15;
    let pdfDocument;
    let scale = clampScale(Number.isFinite(previousState.scale) ? previousState.scale : defaultScale);
    let loadGeneration = 0;
    let renderGeneration = 0;
    let loadingTask;
    let pageObserver;
    let includeBootTimings = true;

    pdfjsLib.GlobalWorkerOptions.workerSrc = ${workerUriLiteral};
    const workerStartedAt = performance.now();
    const pdfWorker = new pdfjsLib.PDFWorker({ name: 'latex-one-click-preview' });
    const bootTimings = {
      pdfJsModuleMs: moduleReadyAt - bootStartedAt,
      workerCreateMs: performance.now() - workerStartedAt
    };
    updateZoomValue();

    document.getElementById('compile').addEventListener('click', () => {
      vscode.postMessage({ type: 'compile' });
    });
    document.getElementById('zoomOut').addEventListener('click', () => void zoomBy(-1));
    document.getElementById('zoomIn').addEventListener('click', () => void zoomBy(1));
    document.getElementById('view').addEventListener('click', () => void fitWidth());

    window.addEventListener('keydown', (event) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
        event.preventDefault();
        void zoomBy(1);
        return;
      }

      if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
        event.preventDefault();
        void zoomBy(-1);
      }
    });

    window.addEventListener(
      'wheel',
      (event) => {
        if (!event.ctrlKey && !event.metaKey) {
          return;
        }
        event.preventDefault();
        let dy = event.deltaY;
        if (event.deltaMode === 1) {
          dy *= 16;
        } else if (event.deltaMode === 2) {
          dy *= window.innerHeight;
        }
        const stepPer100 = scaleStep / 100;
        const next = clampScale(scale - dy * stepPer100);
        void setScale(next);
      },
      { passive: false }
    );

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'reverseSearchStatus') {
        status.textContent = event.data.message;
        return;
      }

      if (event.data?.type === 'reloadPdf' && typeof event.data.pdfUri === 'string') {
        if (typeof event.data.pdfFileName === 'string') {
          document.title = event.data.pdfFileName;
          if (titleElement) {
            titleElement.textContent = event.data.pdfFileName;
          }
        }
        void loadPdf(event.data.pdfUri);
      }
    });

    window.addEventListener('unload', () => {
      void pdfDocument?.destroy();
      void pdfWorker.destroy();
    });

    async function loadPdf(nextPdfUrl = pdfUrl) {
      const generation = ++loadGeneration;
      const previousDocument = pdfDocument;
      const previousLoadingTask = loadingTask;
      const startedAt = performance.now();
      const timings = includeBootTimings ? { ...bootTimings } : {};
      includeBootTimings = false;

      pdfUrl = nextPdfUrl;
      pdfDocument = undefined;
      loadingTask = undefined;
      renderGeneration += 1;
      pageObserver?.disconnect();
      status.textContent = 'Opening';

      if (previousLoadingTask) {
        void previousLoadingTask.destroy();
      }

      try {
        const taskStartedAt = performance.now();
        const task = pdfjsLib.getDocument({
          url: pdfUrl,
          worker: pdfWorker,
          cMapUrl: ${cMapsUriLiteral},
          cMapPacked: true,
          standardFontDataUrl: ${standardFontsUriLiteral}
        });
        loadingTask = task;
        timings.openTaskMs = performance.now() - taskStartedAt;

        status.textContent = 'Parsing';
        const parseStartedAt = performance.now();
        const nextDocument = await task.promise;
        timings.parseMs = performance.now() - parseStartedAt;
        if (generation !== loadGeneration) {
          void nextDocument.destroy();
          return;
        }

        pdfDocument = nextDocument;
        status.textContent = 'Rendering';
        const renderStartedAt = performance.now();
        await render();
        timings.firstRenderMs = performance.now() - renderStartedAt;
        if (generation !== loadGeneration) {
          return;
        }

        void previousDocument?.destroy();
        const displayMs = Math.round(performance.now() - startedAt);
        reportPreviewPerf('ready', {
          totalMs: displayMs,
          pageCount: pdfDocument.numPages,
          stages: timings
        });
        if (displayMs > 2000) {
          console.warn(\`PDF display took \${displayMs}ms; expected less than 2000ms.\`);
        } else {
          console.debug(\`PDF display ready in \${displayMs}ms.\`);
        }
      } catch (error) {
        if (generation !== loadGeneration) {
          return;
        }
        pdfDocument = previousDocument;
        status.textContent = 'Unable to render PDF';
        reportPreviewPerf('error', {
          totalMs: Math.round(performance.now() - startedAt),
          stages: timings,
          error: error instanceof Error ? error.message : String(error)
        });
        console.error(error);
      } finally {
        if (generation === loadGeneration) {
          loadingTask = undefined;
        }
      }
    }

    async function setScale(nextScale) {
      scale = clampScale(nextScale);
      vscode.setState({ scale });
      updateZoomValue();
      if (pdfDocument) {
        await render();
      }
    }

    async function zoomBy(direction) {
      await setScale(scale + direction * scaleStep);
    }

    async function fitWidth() {
      if (!pdfDocument) {
        return;
      }

      const page = await pdfDocument.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const available = Math.max(280, viewer.clientWidth - 32);
      await setScale(available / viewport.width);
    }

    async function render() {
      if (!pdfDocument) {
        return;
      }
      const generation = ++renderGeneration;
      pageObserver?.disconnect();
      viewer.replaceChildren();
      status.textContent = \`\${pdfDocument.numPages} page\${pdfDocument.numPages === 1 ? '' : 's'}\`;

      const firstPage = await pdfDocument.getPage(1);
      if (generation !== renderGeneration) {
        return;
      }
      const firstViewport = firstPage.getViewport({ scale });
      const firstPlaceholder = createPagePlaceholder(1, firstViewport);
      viewer.replaceChildren(firstPlaceholder);

      await renderPage(firstPlaceholder, 1, generation, firstPage);
      if (generation !== renderGeneration) {
        return;
      }

      window.setTimeout(() => setupLazyPages(generation, firstViewport), 0);
    }

    function setupLazyPages(generation, firstViewport) {
      if (!pdfDocument || generation !== renderGeneration || pdfDocument.numPages <= 1) {
        return;
      }

      const placeholders = [];
      const fragment = document.createDocumentFragment();
      for (let pageNumber = 2; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const wrapper = createPagePlaceholder(pageNumber, firstViewport);
        placeholders.push(wrapper);
        fragment.append(wrapper);
      }
      viewer.append(fragment);

      if (!('IntersectionObserver' in window)) {
        void renderRemainingPages(placeholders, generation);
        return;
      }

      pageObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            const pageElement = entry.target;
            pageObserver.unobserve(pageElement);
            const pageNumber = Number(pageElement.dataset.pageNumber);
            void renderPage(pageElement, pageNumber, generation);
          }
        },
        { root: null, rootMargin: '900px 0px' }
      );

      for (const placeholder of placeholders) {
        pageObserver.observe(placeholder);
      }
    }

    async function renderRemainingPages(placeholders, generation) {
      for (const placeholder of placeholders) {
        if (generation !== renderGeneration) {
          return;
        }
        await renderPage(placeholder, Number(placeholder.dataset.pageNumber), generation);
      }
    }

    function createPagePlaceholder(pageNumber, viewport) {
      const wrapper = document.createElement('section');
      const label = document.createElement('div');

      wrapper.className = 'page pagePlaceholder';
      wrapper.dataset.pageNumber = String(pageNumber);
      wrapper.style.width = \`\${viewport.width}px\`;
      wrapper.style.height = \`\${viewport.height}px\`;

      label.className = 'pageNumber';
      label.textContent = String(pageNumber);
      wrapper.append(label);

      return wrapper;
    }

    async function renderPage(wrapper, pageNumber, generation, loadedPage) {
      if (!wrapper || wrapper.dataset.rendered === 'true' || generation !== renderGeneration) {
        return;
      }

      let page;
      try {
        page = loadedPage || (await pdfDocument.getPage(pageNumber));
      } catch (error) {
        if (generation === renderGeneration) {
          status.textContent = 'Unable to render PDF';
          console.error(error);
        }
        return;
      }
      if (generation !== renderGeneration) {
        return;
      }
      const viewport = page.getViewport({ scale });
      const ratio = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const label = document.createElement('div');
      if (!context) {
        status.textContent = 'Unable to render PDF';
        console.error(new Error('Unable to create a PDF canvas context.'));
        return;
      }

      wrapper.className = 'page';
      wrapper.dataset.rendered = 'true';
      wrapper.style.width = \`\${viewport.width}px\`;
      wrapper.style.height = \`\${viewport.height}px\`;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = \`\${viewport.width}px\`;
      canvas.style.height = \`\${viewport.height}px\`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      label.className = 'pageNumber';
      label.textContent = String(pageNumber);
      wrapper.replaceChildren(canvas, label);

      try {
        await page.render({ canvasContext: context, viewport }).promise;
      } catch (error) {
        if (generation === renderGeneration) {
          status.textContent = 'Unable to render PDF';
          console.error(error);
        }
        return;
      }
      if (generation !== renderGeneration) {
        return;
      }

      wrapper.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
          return;
        }

        const [pdfX, pdfY] = viewport.convertToPdfPoint(localX, localY);
        const pageWidth = page.view[2] - page.view[0];
        const pageHeight = page.view[3] - page.view[1];
        status.textContent = 'Searching';
        showPulse(wrapper, localX, localY);
        vscode.postMessage({
          type: 'reverseSearch',
          payload: { page: pageNumber, pdfX, pdfY, pageWidth, pageHeight }
        });
      });
    }

    function showPulse(pageElement, x, y) {
      const marker = document.createElement('div');
      marker.className = 'pulse';
      marker.style.left = \`\${x}px\`;
      marker.style.top = \`\${y}px\`;
      pageElement.append(marker);
      window.setTimeout(() => marker.remove(), 650);
    }

    function clampScale(value) {
      if (!Number.isFinite(value)) {
        return defaultScale;
      }
      return Math.max(minScale, Math.min(maxScale, value));
    }

    function updateZoomValue() {
      zoomValue.textContent = \`\${Math.round(scale * 100)}%\`;
    }

    function reportPreviewPerf(phase, details) {
      vscode.postMessage({
        type: 'previewPerf',
        payload: {
          phase,
          ...details
        }
      });
    }

    loadPdf();
  </script>
</body>
</html>`;
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function withTrailingSlash(uri: string): string {
  return uri.endsWith('/') ? uri : `${uri}/`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
