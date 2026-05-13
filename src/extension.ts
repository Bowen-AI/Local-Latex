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
import { updateCurrentPdfView } from './preview/previewState';
import { disposePdfPreviews } from './preview/pdfPreview';
import { isTexFile } from './core/texFiles';
import { formatWorkspaceAccessWarning, getTrustedWorkspaceBlockReason } from './core/workspaceAccess';
import { onCompileSnapshotUpdated } from './sidebar/compileSidebarState';
import { CompileTreeProvider } from './sidebar/compileTreeProvider';
import {
  ProjectTreeProvider,
  sidebarEditOutputDirectoryCommand,
  sidebarToggleBoolCommand,
} from './sidebar/projectTreeProvider';
import { revealTexLocationCommand } from './sidebar/revealTexLocation';

let statusBar: vscode.StatusBarItem | undefined;
let trustedWorkspaceFeaturesInitialized = false;
const disposables: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const storagePath = context.globalStorageUri.fsPath;

  const projectTreeProvider = new ProjectTreeProvider();
  const compileTreeProvider = new CompileTreeProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('latexOneClickProject', projectTreeProvider),
    vscode.window.registerTreeDataProvider('latexOneClickCompile', compileTreeProvider),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('latexOneClick')) {
        projectTreeProvider.refresh();
      }
    }),
    onCompileSnapshotUpdated(() => {
      compileTreeProvider.refresh();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      projectTreeProvider.refresh();
      compileTreeProvider.refresh();
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      projectTreeProvider.refresh();
    }),
    vscode.commands.registerCommand('latexOneClick.revealTexLocation', revealTexLocationCommand),
    vscode.commands.registerCommand('latexOneClick.sidebarToggleBool', sidebarToggleBoolCommand),
    vscode.commands.registerCommand('latexOneClick.sidebarEditOutputDirectory', sidebarEditOutputDirectoryCommand),
    vscode.commands.registerCommand('latexOneClick.doctor', () => doctorCommand(storagePath)),
    vscode.commands.registerCommand('latexOneClick.compile', () =>
      runTrustedWorkspaceCommand(() => compileCommand(storagePath, ensureStatusBar(context), context.extensionUri))
    ),
    vscode.commands.registerCommand('latexOneClick.openPdf', () =>
      runTrustedWorkspaceCommand(() => openPdfCommand(context.extensionUri))
    ),
    vscode.commands.registerCommand('latexOneClick.clean', () => runTrustedWorkspaceCommand(cleanCommand)),
    vscode.commands.registerCommand('latexOneClick.selectRoot', () => runTrustedWorkspaceCommand(selectRootCommand)),
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      projectTreeProvider.refresh();
      compileTreeProvider.refresh();
      initializeTrustedWorkspaceFeatures(context, storagePath).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        log(`Failed to initialize trusted workspace features after trust grant: ${message}`);
      });
    })
  );

  await initializeTrustedWorkspaceFeatures(context, storagePath);
}

async function runTrustedWorkspaceCommand<T>(action: () => T | Thenable<T>): Promise<T | undefined> {
  const blockReason = getTrustedWorkspaceBlockReason({
    trusted: vscode.workspace.isTrusted,
    root: getWorkspaceRoot(),
  });

  if (blockReason) {
    await vscode.window.showWarningMessage(formatWorkspaceAccessWarning(blockReason));
    return undefined;
  }

  return action();
}

function ensureStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
  if (statusBar) {
    return statusBar;
  }

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = '$(file-pdf) LaTeX';
  statusBar.command = 'latexOneClick.compile';
  statusBar.tooltip = 'Compile LaTeX document';
  statusBar.show();
  context.subscriptions.push(statusBar);

  return statusBar;
}

async function initializeTrustedWorkspaceFeatures(context: vscode.ExtensionContext, storagePath: string): Promise<void> {
  if (trustedWorkspaceFeaturesInitialized) {
    return;
  }

  if (!vscode.workspace.isTrusted) {
    log('Workspace not trusted — extension activation skipped.');
    return;
  }

  const root = getWorkspaceRoot();
  if (!root) {
    return;
  }

  trustedWorkspaceFeaturesInitialized = true;
  ensureStatusBar(context);

  const setupAutoCompile = (): void => {
    const settings = getSettings(vscode.Uri.file(root));
    if (settings.autoCompileOnSave) {
      const debouncedCompile = debounce(() => {
        compileCommand(storagePath, ensureStatusBar(context), context.extensionUri).catch(() => undefined);
      }, settings.compileDebounceMs);

      const watcher = vscode.workspace.onDidSaveTextDocument((doc) => {
        if (doc.languageId === 'latex' || isTexFile(doc.fileName)) {
          debouncedCompile();
        }
      });
      disposables.push(watcher);
    }
  };

  setupAutoCompile();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) {
        return;
      }

      updateCurrentPdfView(root, editor.document.uri.toString());
    }),
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
  trustedWorkspaceFeaturesInitialized = false;
  disposePdfPreviews();
  disposeDiagnostics();
  disposeOutputChannel();
}
