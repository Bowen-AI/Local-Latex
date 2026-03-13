import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getSettings } from '../config/settings';
import { getWorkspaceRoot } from '../core/projectLocator';
import { log } from '../core/outputChannel';

export async function cleanCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    await vscode.window.showWarningMessage('LaTeX One-Click: No workspace folder open.');
    return;
  }

  const settings = getSettings(vscode.Uri.file(root));
  const outDir = path.join(root, settings.outputDirectory);

  if (!fs.existsSync(outDir)) {
    await vscode.window.showInformationMessage(`LaTeX One-Click: Output directory does not exist: ${outDir}`);
    return;
  }

  const entries = fs.readdirSync(outDir);
  let count = 0;
  for (const entry of entries) {
    const full = path.join(outDir, entry);
    fs.rmSync(full, { recursive: true, force: true });
    count++;
  }

  log(`Cleaned ${count} items from ${outDir}`);
  await vscode.window.showInformationMessage(`LaTeX One-Click: Cleaned ${count} items from ${settings.outputDirectory}/`);
}
