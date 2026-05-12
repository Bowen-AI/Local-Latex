import * as vscode from 'vscode';
import { getSettings } from '../config/settings';
import { getWorkspaceRoot } from '../core/projectLocator';
import { resolveMainFile } from '../core/mainFileResolver';
import { nodeFileSystemOps } from '../core/nodeFileSystem';
import { formatWorkspaceAccessWarning, getTrustedWorkspaceBlockReason } from '../core/workspaceAccess';

export type SidebarToggleKey =
  | 'autoCompileOnSave'
  | 'offlineOnly'
  | 'syncTeX'
  | 'previewAutoOpen'
  | 'previewPreserveFocus';

const TOGGLE_CONFIG_KEY: Record<SidebarToggleKey, string> = {
  autoCompileOnSave: 'autoCompileOnSave',
  offlineOnly: 'offlineOnly',
  syncTeX: 'syncTeX',
  previewAutoOpen: 'preview.autoOpen',
  previewPreserveFocus: 'preview.preserveFocus',
};

const TOGGLE_LABEL: Record<SidebarToggleKey, string> = {
  autoCompileOnSave: 'Auto-compile on save',
  offlineOnly: 'Offline only (cached packages)',
  syncTeX: 'SyncTeX',
  previewAutoOpen: 'PDF preview: auto-open',
  previewPreserveFocus: 'PDF preview: preserve focus',
};

export type ProjectTreeElement =
  | { kind: 'hint'; text: string }
  | { kind: 'group'; id: 'advanced'; title: string }
  | { kind: 'action'; command: string; title: string; iconId: string }
  | { kind: 'mainFile'; relativeDisplay: string }
  | { kind: 'outputDir'; value: string }
  | { kind: 'toggle'; key: SidebarToggleKey; on: boolean };

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeElement> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<ProjectTreeElement | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectTreeElement): vscode.TreeItem {
    if (element.kind === 'hint') {
      const item = new vscode.TreeItem(element.text, vscode.TreeItemCollapsibleState.None);
      return item;
    }
    if (element.kind === 'group') {
      const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.Collapsed);
      item.iconPath = new vscode.ThemeIcon('settings-gear');
      return item;
    }
    if (element.kind === 'action') {
      const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon(element.iconId);
      item.command = { command: element.command, title: element.title };
      return item;
    }
    if (element.kind === 'mainFile') {
      const item = new vscode.TreeItem('Main file', vscode.TreeItemCollapsibleState.None);
      item.description = element.relativeDisplay;
      item.iconPath = new vscode.ThemeIcon('file');
      item.command = { command: 'latexOneClick.selectRoot', title: 'Select root file' };
      return item;
    }
    if (element.kind === 'outputDir') {
      const item = new vscode.TreeItem('Output directory', vscode.TreeItemCollapsibleState.None);
      item.description = element.value;
      item.iconPath = new vscode.ThemeIcon('folder-opened');
      item.command = {
        command: 'latexOneClick.sidebarEditOutputDirectory',
        title: 'Edit output directory',
      };
      return item;
    }
    const item = new vscode.TreeItem(TOGGLE_LABEL[element.key], vscode.TreeItemCollapsibleState.None);
    item.description = element.on ? 'On' : 'Off';
    item.iconPath = new vscode.ThemeIcon(element.on ? 'check' : 'circle-slash');
    item.command = {
      command: 'latexOneClick.sidebarToggleBool',
      title: 'Toggle',
      arguments: [{ key: element.key }],
    };
    return item;
  }

  async getChildren(element?: ProjectTreeElement): Promise<ProjectTreeElement[]> {
    if (element && element.kind !== 'group') {
      return [];
    }

    const root = getWorkspaceRoot();
    const blockReason = getTrustedWorkspaceBlockReason({
      trusted: vscode.workspace.isTrusted,
      root,
    });

    if (blockReason) {
      const hint = !root ? 'Open a workspace folder' : 'Open a trusted workspace folder';
      return [{ kind: 'hint', text: hint }];
    }

    if (!element) {
      return [
        { kind: 'action', command: 'latexOneClick.compile', title: 'Compile document', iconId: 'play' },
        { kind: 'action', command: 'latexOneClick.openPdf', title: 'Open PDF preview', iconId: 'file-pdf' },
        { kind: 'group', id: 'advanced', title: 'Advanced' },
      ];
    }

    const workspacePath = root!;
    const uri = vscode.Uri.file(workspacePath);
    const settings = getSettings(uri);
    const openEditor = vscode.window.activeTextEditor?.document.uri.fsPath;

    const mainResolved = await resolveMainFile({
      workspaceRoot: workspacePath,
      settingMainFile: settings.mainFile || undefined,
      openEditorFile: openEditor,
      fs: nodeFileSystemOps,
    });

    const relativeMain = mainResolved
      ? vscode.workspace.asRelativePath(mainResolved, false)
      : '(not set — click to choose)';

    const toggleOn = (key: SidebarToggleKey): boolean => {
      switch (key) {
        case 'autoCompileOnSave':
          return settings.autoCompileOnSave;
        case 'offlineOnly':
          return settings.offlineOnly;
        case 'syncTeX':
          return settings.syncTeX;
        case 'previewAutoOpen':
          return settings.previewAutoOpen;
        case 'previewPreserveFocus':
          return settings.previewPreserveFocus;
      }
    };

    const toggles: ProjectTreeElement[] = (
      [
        'autoCompileOnSave',
        'offlineOnly',
        'syncTeX',
        'previewAutoOpen',
        'previewPreserveFocus',
      ] as SidebarToggleKey[]
    ).map((key) => ({
      kind: 'toggle' as const,
      key,
      on: toggleOn(key),
    }));

    return [
      { kind: 'mainFile', relativeDisplay: relativeMain },
      { kind: 'outputDir', value: settings.outputDirectory || '(default)' },
      ...toggles,
      { kind: 'action', command: 'latexOneClick.clean', title: 'Clean build artifacts', iconId: 'trash' },
      { kind: 'action', command: 'latexOneClick.doctor', title: 'Doctor', iconId: 'wrench' },
    ];
  }
}

function sidebarToggleConfigKey(key: string): string | undefined {
  return TOGGLE_CONFIG_KEY[key as SidebarToggleKey];
}

export async function sidebarToggleBoolCommand(args?: { key?: string }): Promise<void> {
  const blockReason = getTrustedWorkspaceBlockReason({
    trusted: vscode.workspace.isTrusted,
    root: getWorkspaceRoot(),
  });
  if (blockReason) {
    await vscode.window.showWarningMessage(formatWorkspaceAccessWarning(blockReason));
    return;
  }
  const root = getWorkspaceRoot();
  if (!root || !args?.key) {
    return;
  }
  const cfgKey = sidebarToggleConfigKey(args.key);
  if (!cfgKey) {
    return;
  }
  const scope = vscode.Uri.file(root);
  const cfg = vscode.workspace.getConfiguration('latexOneClick', scope);
  const current = cfg.get<boolean>(cfgKey);
  if (typeof current !== 'boolean') {
    return;
  }
  await cfg.update(cfgKey, !current, vscode.ConfigurationTarget.Workspace);
}

export async function sidebarEditOutputDirectoryCommand(): Promise<void> {
  const blockReason = getTrustedWorkspaceBlockReason({
    trusted: vscode.workspace.isTrusted,
    root: getWorkspaceRoot(),
  });
  if (blockReason) {
    await vscode.window.showWarningMessage(formatWorkspaceAccessWarning(blockReason));
    return;
  }
  const root = getWorkspaceRoot();
  if (!root) {
    return;
  }
  const scope = vscode.Uri.file(root);
  const settings = getSettings(scope);
  const next = await vscode.window.showInputBox({
    title: 'LaTeX output directory',
    value: settings.outputDirectory,
    prompt: 'Relative to workspace folder or absolute path',
  });
  if (next === undefined) {
    return;
  }
  await vscode.workspace
    .getConfiguration('latexOneClick', scope)
    .update('outputDirectory', next.trim(), vscode.ConfigurationTarget.Workspace);
}
