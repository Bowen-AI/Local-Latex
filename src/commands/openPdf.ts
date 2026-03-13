import * as vscode from 'vscode';
import * as fs from 'fs';
import { getSettings } from '../config/settings';
import { getWorkspaceRoot } from '../core/projectLocator';
import { getCurrentPdf } from '../preview/previewState';
import { openPdf } from '../preview/pdfPreview';

export async function openPdfCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    await vscode.window.showWarningMessage('LaTeX One-Click: No workspace folder open.');
    return;
  }

  const settings = getSettings(vscode.Uri.file(root));
  const pdfPath = getCurrentPdf(root);

  if (!pdfPath || !fs.existsSync(pdfPath)) {
    await vscode.window.showWarningMessage('LaTeX One-Click: No compiled PDF found. Please compile first.');
    return;
  }

  await openPdf(pdfPath, root, settings.previewPreserveFocus);
}
