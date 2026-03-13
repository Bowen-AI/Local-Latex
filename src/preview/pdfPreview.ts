import * as vscode from 'vscode';
import * as path from 'path';
import { setCurrentPdf } from './previewState';

export async function openPdf(
  pdfPath: string,
  workspaceFolder: string,
  preserveFocus = true
): Promise<void> {
  setCurrentPdf(workspaceFolder, pdfPath);

  const uri = vscode.Uri.file(pdfPath);

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

export function getPdfPathForTex(texFile: string, outputDirectory: string): string {
  const base = path.basename(texFile, '.tex');
  const dir = path.dirname(texFile);
  return path.join(dir, outputDirectory, `${base}.pdf`);
}
