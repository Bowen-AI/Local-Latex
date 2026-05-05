import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDirectory } from '../core/compiler';
import { getCurrentPdf, setCurrentPdf } from './previewState';
import { findSyncTexTarget, PdfClick, readSyncTexDocument } from './synctex';

interface PreviewEntry {
  panel: vscode.WebviewPanel;
  pdfPath: string;
  workspaceFolder: string;
}

const previews = new Map<string, PreviewEntry>();

export async function openPdf(
  pdfPath: string,
  workspaceFolder: string,
  preserveFocus = true,
  extensionUri: vscode.Uri
): Promise<void> {
  const current = getCurrentPdf(workspaceFolder);
  const uri = buildPdfOpenUri(pdfPath, current).toString();
  setCurrentPdf(workspaceFolder, uri);

  const existing = previews.get(workspaceFolder);
  if (existing) {
    existing.pdfPath = pdfPath;
    existing.panel.title = `PDF: ${path.basename(pdfPath)}`;
    existing.panel.webview.html = buildWebviewHtml(existing.panel.webview, extensionUri, pdfPath);
    existing.panel.reveal(vscode.ViewColumn.Beside, preserveFocus);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'latexOneClickPdfPreview',
    `PDF: ${path.basename(pdfPath)}`,
    {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus,
    },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'media'),
        vscode.Uri.file(path.dirname(pdfPath)),
      ],
    }
  );

  const entry: PreviewEntry = { panel, pdfPath, workspaceFolder };
  previews.set(workspaceFolder, entry);

  panel.webview.html = buildWebviewHtml(panel.webview, extensionUri, pdfPath);
  panel.webview.onDidReceiveMessage((message: { type?: string; payload?: PdfClick }) => {
    if (message.type === 'reverseSearch' && message.payload) {
      handleReverseSearch(entry, message.payload).catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        void vscode.window.showWarningMessage(`LaTeX One-Click: ${text}`);
      });
    }
  });
  panel.onDidDispose(() => previews.delete(workspaceFolder));
}

function buildPdfOpenUri(pdfPath: string, currentPdf: string | undefined): vscode.Uri {
  const target = vscode.Uri.file(pdfPath);
  if (!currentPdf) {
    return target;
  }

  const currentUri = vscode.Uri.parse(currentPdf);
  if (currentUri.scheme !== 'file' || currentUri.fsPath !== target.fsPath || !currentUri.fragment) {
    return target;
  }

  return target.with({ fragment: currentUri.fragment });
}

export function getPdfPathForTex(texFile: string, outputDirectory: string): string {
  const base = path.basename(texFile, '.tex');
  const dir = path.dirname(texFile);
  return path.join(resolveOutputDirectory(dir, outputDirectory), `${base}.pdf`);
}

export function disposePdfPreviews(): void {
  for (const { panel } of previews.values()) {
    panel.dispose();
  }
  previews.clear();
}

async function handleReverseSearch(entry: PreviewEntry, click: PdfClick): Promise<void> {
  const syncTex = readSyncTexDocument(entry.pdfPath);
  if (!syncTex) {
    await vscode.window.showWarningMessage('LaTeX One-Click: No SyncTeX file found. Compile with SyncTeX enabled.');
    return;
  }

  const target = findSyncTexTarget(syncTex, click, entry.workspaceFolder);
  if (!target) {
    await entry.panel.webview.postMessage({
      type: 'reverseSearchStatus',
      message: 'No nearby source location found',
    });
    return;
  }

  if (!fs.existsSync(target.file)) {
    await vscode.window.showWarningMessage(`LaTeX One-Click: Source file not found: ${target.file}`);
    return;
  }

  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(target.file));
  const editor = await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: false,
  });
  const line = Math.max(0, Math.min(document.lineCount - 1, target.line - 1));
  const position = new vscode.Position(line, 0);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(
    new vscode.Range(position, position),
    vscode.TextEditorRevealType.InCenterIfOutsideViewport
  );

  await entry.panel.webview.postMessage({
    type: 'reverseSearchStatus',
    message: `${vscode.workspace.asRelativePath(target.file)}:${target.line}`,
  });
}

function buildWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, pdfPath: string): string {
  const nonce = getNonce();
  const pdfUri = webview.asWebviewUri(vscode.Uri.file(pdfPath));
  const pdfJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pdfjs', 'build', 'pdf.mjs'));
  const workerUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pdfjs', 'build', 'pdf.worker.mjs'));
  const cMapsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pdfjs', 'cmaps')).toString();
  const standardFontsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pdfjs', 'standard_fonts')).toString();
  const title = escapeHtml(path.basename(pdfPath));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; connect-src ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; worker-src blob: ${webview.cspSource};">
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
    import * as pdfjsLib from '${pdfJsUri}';

    const vscode = acquireVsCodeApi();
    const viewer = document.getElementById('viewer');
    const status = document.getElementById('status');
    const pdfUrl = '${pdfUri}';
    const previousState = vscode.getState() || {};
    let pdfDocument;
    let scale = previousState.scale || 1.25;

    pdfjsLib.GlobalWorkerOptions.workerSrc = '${workerUri}';

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
          cMapUrl: '${cMapsUri}/',
          cMapPacked: true,
          standardFontDataUrl: '${standardFontsUri}/'
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
