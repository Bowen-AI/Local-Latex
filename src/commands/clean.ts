import * as vscode from 'vscode';
import { getSettings } from '../config/settings';
import { getWorkspaceRoot } from '../core/projectLocator';
import { resolveOutputDirectory } from '../core/compiler';
import { log } from '../core/outputChannel';
import { cleanOutputDirectory } from '../core/cleaner';

export async function cleanCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    await vscode.window.showWarningMessage('LaTeX One-Click: No workspace folder open.');
    return;
  }

  const settings = getSettings(vscode.Uri.file(root));
  const outDir = resolveOutputDirectory(root, settings.outputDirectory);
  const result = cleanOutputDirectory(root, outDir);

  if (result.blockedReason) {
    await vscode.window.showWarningMessage(`LaTeX One-Click: ${result.blockedReason}`);
    return;
  }

  if (result.missing) {
    await vscode.window.showInformationMessage(`LaTeX One-Click: Output directory does not exist: ${outDir}`);
    return;
  }

  log(`Cleaned ${result.removed} items from ${outDir}`);
  await vscode.window.showInformationMessage(`LaTeX One-Click: Cleaned ${result.removed} items from ${settings.outputDirectory}/`);
}
