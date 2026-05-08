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
      gap: 8px;
      min-height: 38px;
      padding: 4px 8px;
      border-bottom: 1px solid var(--border);
      background: var(--toolbar);
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

    #status {
      min-width: 80px;
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
    <button id="zoomOut" title="Zoom out">-</button>
    <button id="zoomIn" title="Zoom in">+</button>
    <button id="fit" title="Fit width">Fit</button>
    <div class="title">${title}</div>
    <div id="status">Loading</div>
  </div>
  <main id="viewer"></main>

  <script nonce="${nonce}" type="module">
    import * as pdfjsLib from ${pdfJsUriLiteral};

    const vscode = acquireVsCodeApi();
    const viewer = document.getElementById('viewer');
    const status = document.getElementById('status');
    const pdfUrl = ${pdfUrlLiteral};
    const previousState = vscode.getState() || {};
    let pdfDocument;
    let scale = previousState.scale || 1.25;

    pdfjsLib.GlobalWorkerOptions.workerSrc = ${workerUriLiteral};

    document.getElementById('zoomOut').addEventListener('click', () => setScale(Math.max(0.5, scale - 0.15)));
    document.getElementById('zoomIn').addEventListener('click', () => setScale(Math.min(3, scale + 0.15)));
    document.getElementById('fit').addEventListener('click', () => fitWidth());

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'reverseSearchStatus') {
        status.textContent = event.data.message;
      }
    });

    async function loadPdf() {
      try {
        pdfDocument = await pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: ${cMapsUriLiteral},
          cMapPacked: true,
          standardFontDataUrl: ${standardFontsUriLiteral}
        }).promise;
        await render();
      } catch (error) {
        status.textContent = 'Unable to render PDF';
        console.error(error);
      }
    }

    async function setScale(nextScale) {
      scale = nextScale;
      vscode.setState({ scale });
      await render();
    }

    async function fitWidth() {
      if (!pdfDocument) {
        return;
      }

      const page = await pdfDocument.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const available = Math.max(280, viewer.clientWidth - 32);
      await setScale(Math.max(0.5, Math.min(3, available / viewport.width)));
    }

    async function render() {
      viewer.replaceChildren();
      status.textContent = \`\${pdfDocument.numPages} page\${pdfDocument.numPages === 1 ? '' : 's'}\`;

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        await renderPage(pageNumber);
      }
    }

    async function renderPage(pageNumber) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const ratio = window.devicePixelRatio || 1;
      const wrapper = document.createElement('section');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const label = document.createElement('div');

      wrapper.className = 'page';
      wrapper.style.width = \`\${viewport.width}px\`;
      wrapper.style.height = \`\${viewport.height}px\`;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = \`\${viewport.width}px\`;
      canvas.style.height = \`\${viewport.height}px\`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      label.className = 'pageNumber';
      label.textContent = String(pageNumber);
      wrapper.append(canvas, label);
      viewer.append(wrapper);

      await page.render({ canvasContext: context, viewport }).promise;

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
