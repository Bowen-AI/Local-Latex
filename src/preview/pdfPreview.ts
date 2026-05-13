import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDirectory } from '../core/compiler';
import { getCurrentPdf, setCurrentPdf } from './previewState';
import { findSyncTexTarget, PdfClick, readSyncTexDocument } from './synctex';
import { log } from '../core/outputChannel';
import { buildPdfPreviewHtml } from './pdfPreviewHtml';

interface PreviewEntry {
  panel: vscode.WebviewPanel;
  pdfFingerprint?: string;
  pdfSource: PdfDocumentSource;
  pdfPath: string;
  workspaceFolder: string;
  ready: boolean;
  pendingReload?: PdfReloadMessage;
  reloadRequestId: number;
  lastAcceptedReloadRequestId: number;
}

interface PdfDocumentSource {
  uri: string;
  dataBase64?: string;
  dataBytes?: number;
}

interface PdfReloadMessage {
  type: 'reloadPdf';
  requestId: number;
  pdfUri: string;
  pdfFileName: string;
  pdfDataBase64?: string;
  pdfDataBytes?: number;
}

const INLINE_PDF_MAX_BYTES = 8 * 1024 * 1024;

export interface PdfPreviewPerfEvent {
  pdfPath: string;
  phase: string;
  totalMs?: number;
  pageCount?: number;
}

const previews = new Map<string, PreviewEntry>();
const pdfPreviewPerfEmitter = new vscode.EventEmitter<PdfPreviewPerfEvent>();

export const onPdfPreviewPerf = pdfPreviewPerfEmitter.event;

export interface OpenPdfOptions {
  /**
   * Set when opening after a compile (success): forces a new webview `v=` token even if `stat()`
   * metadata looks unchanged (mtime precision / identical rebuilt output race).
   */
  invalidatePreviewNonce?: number;

  /**
   * When true, only updates an existing preview tab (reload message). Never creates a new webview panel.
   * Used after compile while `preview.autoOpen` is off so manual-open previews stay in sync with the PDF file.
   */
  refreshExistingOnly?: boolean;
}

export async function openPdf(
  pdfPath: string,
  workspaceFolder: string,
  preserveFocus = true,
  extensionUri: vscode.Uri,
  options?: OpenPdfOptions
): Promise<void> {
  const current = getCurrentPdf(workspaceFolder);
  const uri = buildPdfOpenUri(pdfPath, current).toString();
  setCurrentPdf(workspaceFolder, uri);

  const existing = previews.get(workspaceFolder);
  if (options?.refreshExistingOnly && !existing) {
    return;
  }

  if (existing) {
    const pdfFileName = path.basename(pdfPath);
    const nextPdfFingerprint = previewVersionTag(pdfPath, options);
    existing.panel.title = `PDF: ${pdfFileName}`;
    if (!options?.refreshExistingOnly) {
      existing.panel.reveal(vscode.ViewColumn.Beside, preserveFocus);
    }

    if (existing.pdfPath === pdfPath && existing.pdfFingerprint === nextPdfFingerprint) {
      return;
    }

    const nextPdfSource = await buildPdfDocumentSource(existing.panel.webview, pdfPath, nextPdfFingerprint);
    existing.pdfFingerprint = nextPdfFingerprint;
    existing.pdfPath = pdfPath;
    existing.pdfSource = nextPdfSource;

    await sendReloadMessage(existing, extensionUri, {
      type: 'reloadPdf',
      requestId: ++existing.reloadRequestId,
      pdfUri: nextPdfSource.uri,
      pdfFileName,
      ...(nextPdfSource.dataBase64 ? { pdfDataBase64: nextPdfSource.dataBase64 } : {}),
      ...(nextPdfSource.dataBytes !== undefined ? { pdfDataBytes: nextPdfSource.dataBytes } : {}),
    });
    return;
  }

  if (options?.refreshExistingOnly) {
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
        vscode.Uri.file(workspaceFolder),
      ],
    }
  );

  const ver = previewVersionTag(pdfPath, options);
  const initialPdfSource = await buildPdfDocumentSource(panel.webview, pdfPath, ver);
  const entry: PreviewEntry = {
    panel,
    pdfPath,
    pdfSource: initialPdfSource,
    workspaceFolder,
    pdfFingerprint: ver,
    ready: false,
    reloadRequestId: 0,
    lastAcceptedReloadRequestId: 0,
  };
  previews.set(workspaceFolder, entry);

  panel.webview.onDidReceiveMessage((message: { type?: string; payload?: unknown; requestId?: unknown }) => {
    if (message.type === 'previewReady') {
      entry.ready = true;
      const pendingReload = entry.pendingReload;
      if (pendingReload) {
        void sendReloadMessage(entry, extensionUri, pendingReload);
      }
      return;
    }
    if (message.type === 'reloadPdfAccepted' && typeof message.requestId === 'number') {
      entry.lastAcceptedReloadRequestId = Math.max(entry.lastAcceptedReloadRequestId, message.requestId);
      if (entry.pendingReload?.requestId === message.requestId) {
        entry.pendingReload = undefined;
      }
      return;
    }
    if (message.type === 'compile') {
      void Promise.resolve(vscode.commands.executeCommand('latexOneClick.compile')).catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        log(`Preview toolbar compile failed: ${text}`);
      });
      return;
    }
    if (message.type === 'previewLoadProgress') {
      logPreviewTransportProgress(entry.pdfPath, message.payload);
      return;
    }
    if (message.type === 'previewPerf') {
      logPreviewPerf(entry.pdfPath, message.payload);
      return;
    }
    if (message.type === 'reverseSearch' && isPdfClick(message.payload)) {
      handleReverseSearch(entry, message.payload).catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        void vscode.window.showWarningMessage(`LaTeX One-Click: ${text}`);
      });
    }
  });
  panel.onDidDispose(() => previews.delete(workspaceFolder));
  panel.webview.html = buildWebviewHtml(panel.webview, extensionUri, pdfPath, initialPdfSource);
}

function isPdfClick(value: unknown): value is PdfClick {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Record<keyof PdfClick, unknown>>;
  return (
    typeof candidate.page === 'number' &&
    typeof candidate.pdfX === 'number' &&
    typeof candidate.pdfY === 'number' &&
    typeof candidate.pageHeight === 'number'
  );
}

function logPreviewPerf(pdfPath: string, payload: unknown): void {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  const data = payload as {
    phase?: unknown;
    totalMs?: unknown;
    pageCount?: unknown;
    stages?: unknown;
    error?: unknown;
  };
  const phase = typeof data.phase === 'string' ? data.phase : 'event';
  const totalMs = typeof data.totalMs === 'number' ? Math.round(data.totalMs) : undefined;
  const pageCountValue = typeof data.pageCount === 'number' ? data.pageCount : undefined;
  const total = totalMs !== undefined ? ` in ${totalMs}ms` : '';
  const pageCount = pageCountValue !== undefined ? `, pages=${pageCountValue}` : '';
  const error = typeof data.error === 'string' ? `, error=${data.error}` : '';
  const stages =
    data.stages && typeof data.stages === 'object'
      ? Object.entries(data.stages as Record<string, unknown>)
          .filter(([, value]) => typeof value === 'number')
          .map(([key, value]) => `${key}=${Math.round(value as number)}ms`)
          .join(', ')
      : '';
  const stageText = stages ? ` (${stages})` : '';

  pdfPreviewPerfEmitter.fire({
    pdfPath,
    phase,
    totalMs,
    pageCount: pageCountValue,
  });
  log(`PDF preview ${phase}${total}: ${path.basename(pdfPath)}${pageCount}${error}${stageText}`);
}

function logPreviewTransportProgress(pdfPath: string, payload: unknown): void {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  const p = payload as { loaded?: unknown; total?: unknown; elapsedMs?: unknown };
  const loaded = typeof p.loaded === 'number' ? p.loaded : undefined;
  const total = typeof p.total === 'number' ? p.total : undefined;
  const elapsedMs = typeof p.elapsedMs === 'number' ? p.elapsedMs : undefined;

  log(
    `PDF preview transport: loaded=${loaded ?? '?'}${total !== undefined ? `/${total}` : ''} (${elapsedMs ?? '?'}ms from loadPdf start): ${path.basename(pdfPath)}`
  );
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
  const base = path.basename(texFile).replace(/\.tex$/i, '');
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

async function sendReloadMessage(
  entry: PreviewEntry,
  extensionUri: vscode.Uri,
  message: PdfReloadMessage
): Promise<void> {
  entry.pendingReload = message;
  if (!entry.ready) {
    return;
  }

  const posted = await entry.panel.webview.postMessage(message);

  if (!posted) {
    rebuildPreviewHtml(entry, extensionUri, 'postMessage returned false');
    return;
  }

  windowlessSetTimeout(() => {
    if (previews.get(entry.workspaceFolder) !== entry) {
      return;
    }
    if (entry.lastAcceptedReloadRequestId >= message.requestId) {
      return;
    }
    rebuildPreviewHtml(entry, extensionUri, 'reloadPdf was not acknowledged');
  }, 1000);
}

function rebuildPreviewHtml(entry: PreviewEntry, extensionUri: vscode.Uri, reason: string): void {
  entry.ready = false;
  entry.pendingReload = undefined;
  log(`PDF preview reload fallback: ${reason}`);
  entry.panel.webview.html = buildWebviewHtml(entry.panel.webview, extensionUri, entry.pdfPath, entry.pdfSource);
}

function windowlessSetTimeout(callback: () => void, ms: number): void {
  setTimeout(callback, ms);
}

function buildWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  pdfPath: string,
  pdfSource: PdfDocumentSource
): string {
  return buildPdfPreviewHtml({
    cspSource: webview.cspSource,
    pdfFileName: path.basename(pdfPath),
    pdfUri: pdfSource.uri,
    pdfDataBase64: pdfSource.dataBase64,
    pdfDataBytes: pdfSource.dataBytes,
    pdfJsUri: webview
      .asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pdfjs', 'build', 'pdf.mjs'))
      .toString(),
    workerUri: webview
      .asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pdfjs', 'build', 'pdf.worker.mjs'))
      .toString(),
    cMapsUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pdfjs', 'cmaps')).toString(),
    standardFontsUri: webview
      .asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pdfjs', 'standard_fonts'))
      .toString(),
  });
}

async function buildPdfDocumentSource(
  webview: vscode.Webview,
  pdfPath: string,
  version: string
): Promise<PdfDocumentSource> {
  const uri = buildPdfWebviewUri(webview, pdfPath, version);
  const inlineData = await tryReadInlinePdfData(pdfPath);
  return {
    uri,
    ...inlineData,
  };
}

async function tryReadInlinePdfData(pdfPath: string): Promise<Pick<PdfDocumentSource, 'dataBase64' | 'dataBytes'>> {
  try {
    const stat = await fs.promises.stat(pdfPath);
    if (stat.size <= 0 || stat.size > INLINE_PDF_MAX_BYTES) {
      return { dataBytes: stat.size };
    }

    const data = await fs.promises.readFile(pdfPath);
    return {
      dataBase64: data.toString('base64'),
      dataBytes: data.byteLength,
    };
  } catch {
    return {};
  }
}

/** Cache-bust token for webview PDF URI (stat + optional nonce). Must stay fast — no hashing file bodies. */
function previewVersionTag(pdfPath: string, options?: OpenPdfOptions): string {
  const base = computeStatPdfVersion(pdfPath);
  const n = options?.invalidatePreviewNonce;
  return n === undefined ? base : `${base}-inv${n}`;
}

/** Cache-bust token from `stat` only. */
function computeStatPdfVersion(pdfPath: string): string {
  try {
    const stat = fs.statSync(pdfPath);
    return `${Math.trunc(stat.mtimeMs * 1000)}-${Math.trunc(stat.ctimeMs * 1000)}-${stat.size}`;
  } catch {
    return String(Date.now());
  }
}

function buildPdfWebviewUri(webview: vscode.Webview, pdfPath: string, version: string): string {
  return webview.asWebviewUri(vscode.Uri.file(pdfPath).with({ query: `v=${version}` })).toString();
}
