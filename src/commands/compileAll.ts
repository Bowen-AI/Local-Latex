import * as vscode from 'vscode';
import { findTexFiles, getWorkspaceRoot } from '../core/projectLocator';
import { compile } from '../core/compiler';
import { log } from '../core/outputChannel';
import { RuntimeManager } from '../runtime/runtimeManager';
import { getSettings } from '../config/settings';

export async function compileAllCommand(storagePath: string): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    await vscode.window.showWarningMessage('LaTeX One-Click: No workspace folder open.');
    return;
  }

  const settings = getSettings(vscode.Uri.file(root));
  const texFiles = await findTexFiles(root);

  if (texFiles.length === 0) {
    await vscode.window.showInformationMessage('LaTeX One-Click: No .tex files found.');
    return;
  }

  const manager = new RuntimeManager({ storagePath });
  if (!(await manager.isReady())) {
    await vscode.window.showErrorMessage('LaTeX One-Click: Tectonic runtime not ready. Run Doctor command.');
    return;
  }

  let success = 0;
  let failed = 0;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Compiling all .tex files...' },
    async (progress) => {
      for (const file of texFiles) {
        progress.report({ message: file });
        const result = await compile({
          binaryPath: manager.binaryPath,
          mainFile: file,
          outputDirectory: settings.outputDirectory,
          workspaceRoot: root,
          timeoutMs: settings.compileTimeoutSec * 1000,
          offlineOnly: settings.offlineOnly,
          onOutput: log,
        });
        if (result.success) success++; else failed++;
      }
    }
  );

  await vscode.window.showInformationMessage(
    `LaTeX One-Click: Compiled ${success} files. ${failed > 0 ? `${failed} failed.` : ''}`
  );
}
