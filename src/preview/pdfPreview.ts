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
    if (message.type === 'compile') {
      void Promise.resolve(vscode.commands.executeCommand('latexOneClick.compile')).catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        log(`Preview toolbar compile failed: ${text}`);
      });
      return;
    }
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

function buildWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, pdfPath: string): string {
  return buildPdfPreviewHtml({
    cspSource: webview.cspSource,
    pdfFileName: path.basename(pdfPath),
    pdfUri: webview.asWebviewUri(vscode.Uri.file(pdfPath)).toString(),
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
