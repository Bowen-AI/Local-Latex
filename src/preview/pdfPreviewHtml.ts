import { toScriptStringLiteral } from './htmlEscaping';

export interface PdfPreviewHtmlOptions {
  cspSource: string;
  pdfFileName: string;
  pdfUri: string;
  pdfDataBase64?: string;
  pdfDataBytes?: number;
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
  const pdfDataBase64Literal =
    options.pdfDataBase64 === undefined ? 'undefined' : toScriptStringLiteral(options.pdfDataBase64);
  const pdfDataBytesLiteral =
    typeof options.pdfDataBytes === 'number' && Number.isFinite(options.pdfDataBytes)
      ? String(options.pdfDataBytes)
      : 'undefined';
  const pdfJsUriLiteral = toScriptStringLiteral(options.pdfJsUri);
  const workerUriLiteral = toScriptStringLiteral(options.workerUri);
  const cMapsUriLiteral = toScriptStringLiteral(withTrailingSlash(options.cMapsUri));
  const standardFontsUriLiteral = toScriptStringLiteral(withTrailingSlash(options.standardFontsUri));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${options.cspSource} data:; frame-src ${options.cspSource}; connect-src ${options.cspSource}; script-src 'nonce-${nonce}' ${options.cspSource}; style-src 'unsafe-inline' ${options.cspSource}; worker-src blob: ${options.cspSource};">
  <title>${title}</title>
  <link rel="modulepreload" href="${escapeHtml(options.pdfJsUri)}" crossorigin="anonymous" />
  <link rel="preload" href="${escapeHtml(options.workerUri)}" as="worker" crossorigin="anonymous" />
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
      height: 100%;
      min-height: 100%;
      background: var(--vscode-editor-background);
      color: var(--text);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    body {
      display: flex;
      flex-direction: column;
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
      flex: 1;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 16px;
      overflow: auto;
    }

    #quickPdf {
      flex: 1;
      width: 100%;
      min-height: 0;
      border: 0;
      background: var(--vscode-editor-background);
    }

    .isHidden {
      display: none !important;
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

    .compileBanner {
      position: sticky;
      top: 38px;
      z-index: 9;
      padding: 10px 14px;
      border-bottom: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
      background: var(--vscode-inputValidation-errorBackground, rgba(190, 17, 0, 0.12));
      color: var(--vscode-inputValidation-errorForeground, var(--text));
      font-size: 12px;
    }

    .compileBanner.isHidden {
      display: none;
    }

    .compileBannerTitle {
      margin: 0 0 6px;
      font-weight: 600;
    }

    .compileBannerList {
      margin: 0;
      padding-left: 18px;
      max-height: 96px;
      overflow: auto;
    }

    .compileBannerItem {
      cursor: pointer;
      text-decoration: underline;
      text-decoration-color: transparent;
    }

    .compileBannerItem:hover {
      text-decoration-color: currentColor;
    }

    .compileBannerHint {
      margin: 6px 0 0;
      color: var(--muted);
      font-style: italic;
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
      <div id="zoomValue" aria-live="polite">100%</div>
      <button id="zoomIn" class="iconButton" title="Zoom in (Ctrl+= / Ctrl++)" aria-label="Zoom in">+</button>
      <button id="view" title="Fit to width">Fit</button>
    </div>
    <div class="title">${title}</div>
    <div id="status">Loading</div>
  </div>
  <div id="compileBanner" class="compileBanner isHidden" role="alert" aria-live="polite">
    <p id="compileBannerTitle" class="compileBannerTitle"></p>
    <ul id="compileBannerList" class="compileBannerList"></ul>
    <p class="compileBannerHint">The PDF below may be from a previous successful compile.</p>
  </div>
  <iframe id="quickPdf" src="${escapeHtml(options.pdfUri)}" title="${title}"></iframe>
  <main id="viewer" class="isHidden"></main>

  <script nonce="${nonce}">
    window.__latexOneClickPreviewBootStarted = performance.now();
  </script>
  <script nonce="${nonce}" type="module">
    import * as pdfjsLib from ${pdfJsUriLiteral};

    const bootStartedAt = Number(window.__latexOneClickPreviewBootStarted) || performance.now();
    const moduleReadyAt = performance.now();
    const vscode = acquireVsCodeApi();
    const viewer = document.getElementById('viewer');
    const quickPdf = document.getElementById('quickPdf');
    const status = document.getElementById('status');
    const titleElement = document.querySelector('.title');
    const zoomValue = document.getElementById('zoomValue');
    let pdfSource = createPdfSource(${pdfUrlLiteral}, ${pdfDataBase64Literal}, ${pdfDataBytesLiteral});
    const previousState = vscode.getState() || {};
    const defaultScale = 1;
    const minScale = 0.5;
    const maxScale = 3;
    const scaleStep = 0.15;
    let pdfDocument;
    let scale = clampScale(Number.isFinite(previousState.scale) ? previousState.scale : defaultScale);
    let loadGeneration = 0;
    let renderGeneration = 0;
    let loadingTask;
    let pdfWorker;
    let pdfWorkerMode = 'dedicated';
    let pageObserver;
    let includeBootTimings = true;

    const workerUri = ${workerUriLiteral};
    const workerStartupFallbackMs = 1200;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUri;
    const bootTimings = {
      pdfJsModuleMs: moduleReadyAt - bootStartedAt
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

    const compileBanner = document.getElementById('compileBanner');
    const compileBannerTitle = document.getElementById('compileBannerTitle');
    const compileBannerList = document.getElementById('compileBannerList');

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'reverseSearchStatus') {
        status.textContent = event.data.message;
        return;
      }

      if (event.data?.type === 'compileFailed') {
        renderCompileBanner(event.data.payload);
        return;
      }

      if (event.data?.type === 'compileFailedClear') {
        hideCompileBanner();
        return;
      }

      if (event.data?.type === 'reloadPdf' && typeof event.data.pdfUri === 'string') {
        if (typeof event.data.pdfFileName === 'string') {
          document.title = event.data.pdfFileName;
          if (titleElement) {
            titleElement.textContent = event.data.pdfFileName;
          }
        }
        if (typeof event.data.requestId === 'number') {
          vscode.postMessage({ type: 'reloadPdfAccepted', requestId: event.data.requestId });
        }
        const nextPdfSource = createPdfSource(
          event.data.pdfUri,
          typeof event.data.pdfDataBase64 === 'string' ? event.data.pdfDataBase64 : undefined,
          typeof event.data.pdfDataBytes === 'number' ? event.data.pdfDataBytes : undefined
        );
        showQuickPdf(nextPdfSource.url);
        void loadPdf(nextPdfSource);
      }
    });

    vscode.postMessage({ type: 'previewReady' });

    window.addEventListener('unload', () => {
      void pdfDocument?.destroy();
      void pdfWorker?.destroy();
    });

    function createPdfSource(url, dataBase64, dataBytes) {
      return {
        url,
        dataBase64: typeof dataBase64 === 'string' && dataBase64.length > 0 ? dataBase64 : undefined,
        dataBytes: typeof dataBytes === 'number' ? dataBytes : undefined
      };
    }

    function decodeBase64Pdf(value) {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }

    async function loadPdf(nextPdfSource = pdfSource) {
      const generation = ++loadGeneration;
      const previousDocument = pdfDocument;
      const previousLoadingTask = loadingTask;
      const startedAt = performance.now();
      const timings = includeBootTimings ? { ...bootTimings } : {};
      includeBootTimings = false;

      pdfSource = nextPdfSource;
      pdfDocument = undefined;
      loadingTask = undefined;
      renderGeneration += 1;
      pageObserver?.disconnect();
      status.textContent = 'Opening';
      showQuickPdf(pdfSource.url);

      if (previousLoadingTask) {
        void previousLoadingTask.destroy();
      }

      try {
        status.textContent = 'Preparing';
        const worker = await getReadyPdfWorker(timings);
        if (generation !== loadGeneration) {
          return;
        }

        const taskStartedAt = performance.now();
        const documentSource = {
          worker,
          verbosity: pdfjsLib.VerbosityLevel.ERRORS,
          cMapUrl: ${cMapsUriLiteral},
          cMapPacked: true,
          standardFontDataUrl: ${standardFontsUriLiteral}
        };
        if (pdfSource.dataBase64) {
          const decodeStartedAt = performance.now();
          documentSource.data = decodeBase64Pdf(pdfSource.dataBase64);
          timings.decodeMs = performance.now() - decodeStartedAt;
          timings.inlineBytes = pdfSource.dataBytes;
        } else {
          documentSource.url = pdfSource.url;
        }
        const task = pdfjsLib.getDocument(documentSource);
        loadingTask = task;
        timings.openTaskMs = performance.now() - taskStartedAt;

        let lastProgressDiagMs = -500;
        task.onProgress = (progressData) => {
          const elapsedRounded = Math.round(performance.now() - startedAt);
          const totalKnown = typeof progressData.total === 'number' ? progressData.total : 0;
          if (
            elapsedRounded - lastProgressDiagMs < 400 &&
            totalKnown > 0 &&
            progressData.loaded < totalKnown
          ) {
            return;
          }
          lastProgressDiagMs = elapsedRounded;
          vscode.postMessage({
            type: 'previewLoadProgress',
            payload: {
              loaded: progressData.loaded,
              total: totalKnown,
              elapsedMs: elapsedRounded,
            },
          });
        };

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
        showQuickPdf(pdfSource.url);
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

      showPdfJsViewer();
      window.setTimeout(() => setupLazyPages(generation, firstViewport), 0);
    }

    function createPdfWorker() {
      const startedAt = performance.now();
      const worker = new pdfjsLib.PDFWorker({ name: 'latex-one-click-preview' });
      return {
        worker,
        createMs: performance.now() - startedAt
      };
    }

    async function getReadyPdfWorker(timings) {
      if (!pdfWorker || pdfWorker.destroyed) {
        const created = createPdfWorker();
        pdfWorker = created.worker;
        pdfWorkerMode = 'dedicated';
        timings.workerCreateMs = created.createMs;
      }

      const readyStartedAt = performance.now();
      if (await waitForPdfWorker(pdfWorker, workerStartupFallbackMs)) {
        timings.workerReadyMs = performance.now() - readyStartedAt;
        timings.workerMode = pdfWorkerMode;
        return pdfWorker;
      }

      timings.workerStartupTimeoutMs = performance.now() - readyStartedAt;
      void pdfWorker.destroy();
      pdfWorker = undefined;
      await ensureMainThreadWorker(timings);

      const fallbackStartedAt = performance.now();
      const created = createPdfWorker();
      pdfWorker = created.worker;
      pdfWorkerMode = 'main-thread';
      timings.fallbackWorkerCreateMs = created.createMs;
      await pdfWorker.promise;
      timings.workerReadyMs = performance.now() - fallbackStartedAt;
      timings.workerMode = pdfWorkerMode;
      return pdfWorker;
    }

    async function waitForPdfWorker(worker, timeoutMs) {
      let timeoutId;
      try {
        return await Promise.race([
          worker.promise.then(
            () => true,
            () => false
          ),
          new Promise((resolve) => {
            timeoutId = window.setTimeout(() => resolve(false), timeoutMs);
          }),
        ]);
      } finally {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      }
    }

    async function ensureMainThreadWorker(timings) {
      if (globalThis.pdfjsWorker?.WorkerMessageHandler) {
        return;
      }

      const importStartedAt = performance.now();
      await import(workerUri);
      timings.fallbackWorkerImportMs = performance.now() - importStartedAt;
    }

    function showQuickPdf(url) {
      if (!quickPdf) {
        return;
      }
      if (typeof url === 'string' && quickPdf.getAttribute('src') !== url) {
        quickPdf.setAttribute('src', url);
      }
      quickPdf.classList.remove('isHidden');
      viewer.classList.add('isHidden');
    }

    function showPdfJsViewer() {
      viewer.classList.remove('isHidden');
      quickPdf?.classList.add('isHidden');
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
      const rawDpr = window.devicePixelRatio || 1;
      const ratio = Math.min(rawDpr, 1.5);
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

    function renderCompileBanner(payload) {
      if (!compileBanner || !compileBannerTitle || !compileBannerList) {
        return;
      }
      const summary = typeof payload?.summary === 'string' ? payload.summary : 'Compile failed';
      compileBannerTitle.textContent = summary;
      compileBannerList.replaceChildren();
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];
      if (errors.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'See the Errors & Warnings sidebar for details.';
        compileBannerList.append(li);
      } else {
        for (const err of errors) {
          const li = document.createElement('li');
          li.className = 'compileBannerItem';
          const file = typeof err?.file === 'string' ? err.file : '';
          const line = typeof err?.line === 'number' && err.line > 0 ? err.line : undefined;
          const message = typeof err?.message === 'string' ? err.message : '(unparsed error)';
          const location = line !== undefined ? \`\${file}:\${line}\` : file;
          li.textContent = location ? \`\${location} — \${message}\` : message;
          li.addEventListener('click', () => {
            if (!file || line === undefined) {
              vscode.postMessage({ type: 'showErrors' });
              return;
            }
            vscode.postMessage({
              type: 'revealError',
              payload: { file, line }
            });
          });
          compileBannerList.append(li);
        }
      }
      compileBanner.classList.remove('isHidden');
    }

    function hideCompileBanner() {
      if (compileBanner) {
        compileBanner.classList.add('isHidden');
      }
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
