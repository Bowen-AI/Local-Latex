import * as vscode from 'vscode';
import type { LogEntry } from '../core/logParser';
import { getWorkspaceRoot } from '../core/projectLocator';
import { getTrustedWorkspaceBlockReason } from '../core/workspaceAccess';
import { getCompileSnapshot } from './compileSidebarState';
import { splitClippedLogLines } from './compileLogLines';

type CompileGroupId = 'errors' | 'warnings' | 'log';

export type CompileTreeElement =
  | { kind: 'hint'; text: string }
  | { kind: 'group'; id: CompileGroupId }
  | { kind: 'diag'; entry: LogEntry }
  | { kind: 'logLine'; text: string };

const GROUP_LABEL: Record<CompileGroupId, string> = {
  errors: 'Errors',
  warnings: 'Warnings',
  log: 'Compile output',
};

const GROUP_ICON: Record<CompileGroupId, string> = {
  errors: 'error',
  warnings: 'warning',
  log: 'output',
};

export class CompileTreeProvider implements vscode.TreeDataProvider<CompileTreeElement> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<CompileTreeElement | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CompileTreeElement): vscode.TreeItem {
    if (element.kind === 'hint') {
      return new vscode.TreeItem(element.text, vscode.TreeItemCollapsibleState.None);
    }
    if (element.kind === 'group') {
      const item = new vscode.TreeItem(
        GROUP_LABEL[element.id],
        vscode.TreeItemCollapsibleState.Collapsed
      );
      item.iconPath = new vscode.ThemeIcon(GROUP_ICON[element.id]);
      return item;
    }
    if (element.kind === 'diag') {
      const { entry } = element;
      const item = new vscode.TreeItem(entry.message, vscode.TreeItemCollapsibleState.None);
      item.tooltip = `${entry.file}:${entry.line}: ${entry.message}`;
      item.iconPath = new vscode.ThemeIcon(
        entry.severity === 'error' ? 'close' : 'warning'
      );
      const root = getWorkspaceRoot();
      if (root) {
        item.command = {
          command: 'latexOneClick.revealTexLocation',
          title: 'Reveal',
          arguments: [root, entry.file, entry.line, entry.column],
        };
      }
      return item;
    }
    const item = new vscode.TreeItem(element.text, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('debug-console');
    return item;
  }

  getChildren(element?: CompileTreeElement): vscode.ProviderResult<CompileTreeElement[]> {
    const root = getWorkspaceRoot();
    const blockReason = getTrustedWorkspaceBlockReason({
      trusted: vscode.workspace.isTrusted,
      root,
    });

    if (blockReason) {
      if (element) {
        return [];
      }
      const hint = !root ? 'Open a workspace folder' : 'Open a trusted workspace folder';
      return [{ kind: 'hint', text: hint }];
    }

    if (!element) {
      return [
        { kind: 'group', id: 'errors' },
        { kind: 'group', id: 'warnings' },
        { kind: 'group', id: 'log' },
      ];
    }

    if (element.kind !== 'group') {
      return [];
    }

    const snap = root ? getCompileSnapshot(root) : undefined;

    if (element.id === 'errors') {
      const entries = snap?.logs.filter((e) => e.severity === 'error') ?? [];
      return entries.map((e) => ({ kind: 'diag', entry: e }));
    }

    if (element.id === 'warnings') {
      const entries = snap?.logs.filter((e) => e.severity === 'warning') ?? [];
      return entries.map((e) => ({ kind: 'diag', entry: e }));
    }

    if (!snap) {
      return [{ kind: 'logLine', text: 'No compile output yet. Run Compile.' }];
    }

    const lines = splitClippedLogLines(snap.notesText);
    if (lines.length === 0) {
      return [{ kind: 'logLine', text: '(empty log)' }];
    }

    return lines.map((text) => ({ kind: 'logLine', text }));
  }
}
