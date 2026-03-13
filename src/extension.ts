import * as vscode from 'vscode';
import { compileCommand } from './commands/compile';
import { cleanCommand } from './commands/clean';
import { openPdfCommand } from './commands/openPdf';
import { selectRootCommand } from './commands/selectRoot';
import { doctorCommand } from './commands/doctor';
import { getSettings } from './config/settings';
import { getWorkspaceRoot } from './core/projectLocator';
import { debounce } from './core/debounce';
import { disposeOutputChannel, log } from './core/outputChannel';
import { disposeDiagnostics } from './core/diagnostics';
import { RuntimeManager } from './runtime/runtimeManager';

let statusBar: vscode.StatusBarItem;
const disposables: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  if (!vscode.workspace.isTrusted) {
    log('Workspace not trusted — extension activation skipped.');
    return;
  }

  const root = getWorkspaceRoot();
  if (!root) {
    return;
  }

  const storagePath = context.globalStorageUri.fsPath;

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = '$(file-pdf) LaTeX';
  statusBar.command = 'latexOneClick.compile';
  statusBar.tooltip = 'Compile LaTeX document';
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand('latexOneClick.compile', () =>
      compileCommand(storagePath, statusBar)
    ),
    vscode.commands.registerCommand('latexOneClick.openPdf', openPdfCommand),
    vscode.commands.registerCommand('latexOneClick.clean', cleanCommand),
    vscode.commands.registerCommand('latexOneClick.selectRoot', selectRootCommand),
    vscode.commands.registerCommand('latexOneClick.doctor', () => doctorCommand(storagePath))
  );

  const setupAutoCompile = (): void => {
    const settings = getSettings(vscode.Uri.file(root));
    if (settings.autoCompileOnSave) {
      const debouncedCompile = debounce(() => {
        compileCommand(storagePath, statusBar).catch(() => undefined);
      }, settings.compileDebounceMs);

      const watcher = vscode.workspace.onDidSaveTextDocument((doc) => {
        if (doc.languageId === 'latex' || doc.fileName.endsWith('.tex')) {
          debouncedCompile();
        }
      });
      disposables.push(watcher);
    }
  };

  setupAutoCompile();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('latexOneClick')) {
        disposables.forEach((d) => d.dispose());
        disposables.length = 0;
        setupAutoCompile();
      }
    })
  );

  const manager = new RuntimeManager({ storagePath });
  const ready = await manager.isReady();
  if (!ready) {
    const choice = await vscode.window.showInformationMessage(
      'LaTeX One-Click: Tectonic runtime not found. Download it to enable compilation.',
      'Download Now',
      'Later'
    );
    if (choice === 'Download Now') {
      await vscode.commands.executeCommand('latexOneClick.compile');
    }
  }

  log('LaTeX One-Click extension activated.');
}

export function deactivate(): void {
  disposables.forEach((d) => d.dispose());
  disposeDiagnostics();
  disposeOutputChannel();
}
