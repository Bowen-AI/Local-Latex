import * as vscode from 'vscode';
import * as path from 'path';
import { getCurrentPdf, setCurrentPdf } from './previewState';

export async function openPdf(
  pdfPath: string,
  workspaceFolder: string,
  preserveFocus = true
): Promise<void> {
  const current = getCurrentPdf(workspaceFolder);
  const uri = buildPdfOpenUri(pdfPath, current);
  setCurrentPdf(workspaceFolder, uri.toString());

  try {
    await vscode.commands.executeCommand('vscode.open', uri, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus,
    });
  } catch {
    // Fallback: open as text
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus,
    });
  }
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
  return path.join(dir, outputDirectory, `${base}.pdf`);
}
