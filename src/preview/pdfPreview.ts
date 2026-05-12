import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDirectory } from '../core/compiler';
import { getCurrentPdf, setCurrentPdf } from './previewState';
import { findSyncTexTarget, PdfClick, readSyncTexDocument } from './synctex';
import { log } from '../core/outputChannel';
import { buildPdfPreviewHtml } from './pdfPreviewHtml';
import { computeStablePdfFingerprint } from './pdfFingerprint';

interface PreviewEntry {
  panel: vscode.WebviewPanel;
  pdfFingerprint?: string;
  pdfPath: string;
  pdfUri: string;
  workspaceFolder: string;
}

export interface PdfPreviewPerfEvent {
  pdfPath: string;
  phase: string;
  totalMs?: number;
  pageCount?: number;
}

const previews = new Map<string, PreviewEntry>();
const pdfPreviewPerfEmitter = new vscode.EventEmitter<PdfPreviewPerfEvent>();

export const onPdfPreviewPerf = pdfPreviewPerfEmitter.event;

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
    const pdfFileName = path.basename(pdfPath);
    const nextPdfFingerprint = await computePdfFingerprint(pdfPath);
    const nextPdfUri = buildPdfWebviewUri(existing.panel.webview, pdfPath, nextPdfFingerprint);
    existing.panel.title = `PDF: ${pdfFileName}`;
    existing.panel.reveal(vscode.ViewColumn.Beside, preserveFocus);

    if (existing.pdfPath === pdfPath && existing.pdfFingerprint === nextPdfFingerprint) {
      return;
    }

    existing.pdfFingerprint = nextPdfFingerprint;
    existing.pdfPath = pdfPath;
    existing.pdfUri = nextPdfUri;

    const posted = await existing.panel.webview.postMessage({
      type: 'reloadPdf',
      pdfUri: nextPdfUri,
      pdfFileName,
    });
    if (!posted) {
      existing.panel.webview.html = buildWebviewHtml(existing.panel.webview, extensionUri, pdfPath, nextPdfUri);
    }
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

  const initialPdfUri = buildStatPdfWebviewUri(panel.webview, pdfPath);
  const entry: PreviewEntry = { panel, pdfPath, pdfUri: initialPdfUri, workspaceFolder };
  previews.set(workspaceFolder, entry);
  refreshPdfFingerprint(entry, pdfPath);

  panel.webview.html = buildWebviewHtml(panel.webview, extensionUri, pdfPath, initialPdfUri);
  panel.webview.onDidReceiveMessage((message: { type?: string; payload?: unknown }) => {
    if (message.type === 'compile') {
      void Promise.resolve(vscode.commands.executeCommand('latexOneClick.compile')).catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        log(`Preview toolbar compile failed: ${text}`);
      });
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
}

function refreshPdfFingerprint(entry: PreviewEntry, pdfPath: string): void {
  computePdfFingerprint(pdfPath)
    .then((fingerprint) => {
      if (entry.pdfPath === pdfPath) {
        entry.pdfFingerprint = fingerprint;
      }
    })
    .catch((error: unknown) => {
      const text = error instanceof Error ? error.message : String(error);
      log(`PDF preview fingerprint failed: ${text}`);
    });
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

function buildWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  pdfPath: string,
  pdfUri: string
): string {
  return buildPdfPreviewHtml({
    cspSource: webview.cspSource,
    pdfFileName: path.basename(pdfPath),
    pdfUri,
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

function buildStatPdfWebviewUri(webview: vscode.Webview, pdfPath: string): string {
  let version = String(Date.now());
  try {
    const stat = fs.statSync(pdfPath);
    version = `${Math.trunc(stat.mtimeMs * 1000)}-${Math.trunc(stat.ctimeMs * 1000)}-${stat.size}`;
  } catch {
    // Date.now() is enough to avoid reusing a stale webview resource URL.
  }

  return buildPdfWebviewUri(webview, pdfPath, version);
}

async function computePdfFingerprint(pdfPath: string): Promise<string> {
  return computeStablePdfFingerprint(pdfPath);
}

function buildPdfWebviewUri(webview: vscode.Webview, pdfPath: string, version: string): string {
  return webview.asWebviewUri(vscode.Uri.file(pdfPath).with({ query: `v=${version}` })).toString();
}
