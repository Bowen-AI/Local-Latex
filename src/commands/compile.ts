import * as vscode from 'vscode';
import * as fs from 'fs';
import { getSettings } from '../config/settings';
import { getWorkspaceRoot } from '../core/projectLocator';
import { resolveMainFile } from '../core/mainFileResolver';
import { compile, resolveOutputDirectory } from '../core/compiler';
import { validateWorkspaceOutputDirectory } from '../core/workspaceSafety';
import { applyDiagnostics } from '../core/diagnostics';
import { log } from '../core/outputChannel';
import { setState } from '../core/stateStore';
import { openPdf } from '../preview/pdfPreview';
import { RuntimeManager } from '../runtime/runtimeManager';
import { nodeFileSystemOps } from '../core/nodeFileSystem';
import { captureCompileSnapshot } from '../sidebar/compileSidebarState';
import { summarizeTectonicProgress } from '../core/tectonicProgress';

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
    fs: nodeFileSystemOps,
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
      async (progress, token) => {
        token.onCancellationRequested(() => abortController.abort());
        let sawPackageDownload = false;
        let sawFetchFailure = false;

        const handleOutput = (data: string): void => {
          log(data);
          const update = summarizeTectonicProgress(data);
          if (!update) {
            return;
          }

          progress.report({ message: update.message });
          if (update.kind === 'download') {
            sawPackageDownload = true;
            statusBar.text = '$(cloud-download) Downloading TeX packages...';
            statusBar.show();
          } else if (update.kind === 'warning') {
            sawFetchFailure = true;
          }
        };

        const result = await compile({
          binaryPath: manager.binaryPath,
          mainFile,
          outputDirectory: settings.outputDirectory,
          workspaceRoot: root,
          timeoutMs: settings.compileTimeoutSec * 1000,
          offlineOnly: settings.offlineOnly,
          synctex: settings.syncTeX,
          tectonicPrint: settings.tectonicPrint,
          tectonicKeepLogs: settings.tectonicKeepLogs,
          signal: abortController.signal,
          onOutput: handleOutput,
        });

        applyDiagnostics(result.logs, root);
        captureCompileSnapshot(root, result);

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
          if (sawPackageDownload) {
            log('Tectonic fetched TeX packages during this compile; subsequent cached compiles should be faster.');
          }

          if (result.outputPdf) {
            await openPdf(result.outputPdf, root, settings.previewPreserveFocus, extensionUri, {
              invalidatePreviewNonce: Date.now(),
              ...(settings.previewAutoOpen ? {} : { refreshExistingOnly: true }),
            });
          }
        } else {
          statusBar.text = '$(error) Compile failed';
          setState(root, { status: 'error', lastError: result.stderr });
          const errors = result.logs.filter((e) => e.severity === 'error');
          const msg = errors[0]?.message ?? (result.stderr.trim() || 'Unknown error');
          const packageHint = sawFetchFailure
            ? ' Tectonic was fetching missing TeX packages; check network access or enable Offline only for fast cached-only compiles.'
            : '';
          await vscode.window.showErrorMessage(`LaTeX One-Click: Compile failed: ${msg}${packageHint}`);
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
