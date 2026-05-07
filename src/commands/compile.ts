import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getSettings } from '../config/settings';
import { getWorkspaceRoot } from '../core/projectLocator';
import { resolveMainFile, FileSystemOps } from '../core/mainFileResolver';
import { compile, resolveOutputDirectory } from '../core/compiler';
import { validateWorkspaceOutputDirectory } from '../core/workspaceSafety';
import { applyDiagnostics } from '../core/diagnostics';
import { log } from '../core/outputChannel';
import { setState } from '../core/stateStore';
import { openPdf } from '../preview/pdfPreview';
import { RuntimeManager } from '../runtime/runtimeManager';

const nodeFsOps: FileSystemOps = {
  exists: async (p) => {
    try { fs.accessSync(p); return true; } catch { return false; }
  },
  readFile: async (p) => fs.readFileSync(p, 'utf-8'),
  findFiles: async (root, pattern) => {
    const found: string[] = [];
    const visit = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'out') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          visit(fullPath);
          continue;
        }

        if (entry.isFile() && pattern.test(fullPath)) {
          found.push(fullPath);
        }
      }
    };

    visit(root);
    return found;
  },
};

export async function compileCommand(
  storagePath: string,
  statusBar: vscode.StatusBarItem,
  extensionUri: vscode.Uri
): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    await vscode.window.showWarningMessage('LaTeX One-Click: No workspace folder open.');
    return;
  }

  const settings = getSettings(vscode.Uri.file(root));
  const openEditor = vscode.window.activeTextEditor?.document.uri.fsPath;

  const mainFile = await resolveMainFile({
    workspaceRoot: root,
    settingMainFile: settings.mainFile || undefined,
    openEditorFile: openEditor,
    fs: nodeFsOps,
  });

  if (!mainFile) {
    await vscode.window.showWarningMessage(
      'LaTeX One-Click: Could not determine main .tex file. Use "LaTeX: Select Root File" to set it.'
    );
    return;
  }

  const outDir = resolveOutputDirectory(root, settings.outputDirectory);
  const outputDirectoryError = validateWorkspaceOutputDirectory(root, outDir);
  if (outputDirectoryError) {
    statusBar.text = '$(error) Invalid output directory';
    setState(root, { status: 'error', lastError: outputDirectoryError });
    await vscode.window.showWarningMessage(`LaTeX One-Click: ${outputDirectoryError}`);
    return;
  }

  const manager = new RuntimeManager({ storagePath });
  if (!(await manager.isReady())) {
    const choice = await vscode.window.showInformationMessage(
      'Tectonic runtime not found. Download it now?',
      'Download',
      'Cancel'
    );
    if (choice !== 'Download') return;

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Downloading Tectonic...' },
      async (progress) => {
        try {
          await manager.ensureRuntime((msg) => progress.report({ message: msg }));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          statusBar.text = '$(error) Runtime unavailable';
          setState(root, { status: 'error', lastError: message });
          log(`Runtime setup failed: ${message}`);
          await vscode.window.showErrorMessage(`LaTeX One-Click: Runtime setup failed: ${message}`);
        }
      }
    );

    if (!(await manager.isReady())) {
      return;
    }
  }

  statusBar.text = '$(sync~spin) Compiling...';
  statusBar.show();
  setState(root, { status: 'building' });

  const abortController = new AbortController();

  try {
    fs.mkdirSync(outDir, { recursive: true });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'LaTeX: Compiling...',
        cancellable: true,
      },
      async (_progress, token) => {
        token.onCancellationRequested(() => abortController.abort());

        const result = await compile({
          binaryPath: manager.binaryPath,
          mainFile,
          outputDirectory: settings.outputDirectory,
          workspaceRoot: root,
          timeoutMs: settings.compileTimeoutSec * 1000,
          offlineOnly: settings.offlineOnly,
          synctex: settings.syncTeX,
          signal: abortController.signal,
          onOutput: log,
        });

        applyDiagnostics(result.logs, root);

        if (result.timedOut) {
          statusBar.text = '$(error) Compile timed out';
          setState(root, { status: 'error', lastError: 'Timed out' });
          await vscode.window.showErrorMessage('LaTeX One-Click: Compile timed out.');
          return;
        }

        if (result.success) {
          statusBar.text = `$(check) Compiled in ${(result.durationMs / 1000).toFixed(1)}s`;
          setState(root, { status: 'success', lastBuilt: new Date(), outputFile: result.outputPdf });
          log(`Compiled successfully in ${result.durationMs}ms`);

          if (settings.previewAutoOpen && result.outputPdf) {
            await openPdf(result.outputPdf, root, settings.previewPreserveFocus, extensionUri);
          }
        } else {
          statusBar.text = '$(error) Compile failed';
          setState(root, { status: 'error', lastError: result.stderr });
          const errors = result.logs.filter((e) => e.severity === 'error');
          const msg = errors[0]?.message ?? (result.stderr.trim() || 'Unknown error');
          await vscode.window.showErrorMessage(`LaTeX One-Click: Compile failed: ${msg}`);
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    statusBar.text = '$(error) Compile failed';
    setState(root, { status: 'error', lastError: message });
    log(`Compile failed: ${message}`);
    await vscode.window.showErrorMessage(`LaTeX One-Click: Compile failed: ${message}`);
  }
}
