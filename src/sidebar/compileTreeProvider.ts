import * as vscode from 'vscode';
import type { LogEntry } from '../core/logParser';
import { getWorkspaceRoot } from '../core/projectLocator';
import { getTrustedWorkspaceBlockReason } from '../core/workspaceAccess';
import { getCompileSnapshot } from './compileSidebarState';
import { splitClippedLogLines } from './compileLogLines';

type CompileGroupId = 'errors' | 'warnings' | 'log';

export type CompileTreeElement =
  | { kind: 'hint'; text: string }
  | { kind: 'summary'; text: string; success?: boolean; timedOut?: boolean; finishedAtMs?: number }
  | { kind: 'group'; id: CompileGroupId; count?: number; hasSnapshot: boolean }
  | { kind: 'diag'; entry: LogEntry }
  | { kind: 'empty'; text: string }
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
    if (element.kind === 'summary') {
      const item = new vscode.TreeItem(element.text, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon(
        element.timedOut ? 'watch' : element.success === undefined ? 'info' : element.success ? 'check' : 'error'
      );
      if (element.finishedAtMs) {
        item.description = new Date(element.finishedAtMs).toLocaleTimeString();
      }
      return item;
    }
    if (element.kind === 'group') {
      const item = new vscode.TreeItem(
        GROUP_LABEL[element.id],
        element.id === 'log'
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.Expanded
      );
      item.iconPath = new vscode.ThemeIcon(GROUP_ICON[element.id]);
      if (element.id !== 'log') {
        item.description = element.hasSnapshot ? String(element.count ?? 0) : '0';
      }
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
    if (element.kind === 'empty') {
      const item = new vscode.TreeItem(element.text, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('circle-slash');
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

    const snap = root ? getCompileSnapshot(root) : undefined;

    if (!element) {
      const errors = snap?.logs.filter((e) => e.severity === 'error') ?? [];
      const warnings = snap?.logs.filter((e) => e.severity === 'warning') ?? [];
      return [
        {
          kind: 'summary',
          text: snap?.summary ?? 'No compile output yet. Run Compile.',
          success: snap?.success,
          timedOut: snap?.timedOut,
          finishedAtMs: snap?.finishedAtMs,
        },
        { kind: 'group', id: 'errors', count: errors.length, hasSnapshot: Boolean(snap) },
        { kind: 'group', id: 'warnings', count: warnings.length, hasSnapshot: Boolean(snap) },
        { kind: 'group', id: 'log', hasSnapshot: Boolean(snap) },
      ];
    }

    if (element.kind !== 'group') {
      return [];
    }

    if (element.id === 'errors') {
      const entries = snap?.logs.filter((e) => e.severity === 'error') ?? [];
      if (entries.length === 0) {
        return [{ kind: 'empty', text: snap ? 'No errors' : 'No compile output yet.' }];
      }
      return entries.map((e) => ({ kind: 'diag', entry: e }));
    }

    if (element.id === 'warnings') {
      const entries = snap?.logs.filter((e) => e.severity === 'warning') ?? [];
      if (entries.length === 0) {
        return [{ kind: 'empty', text: snap ? 'No warnings' : 'No compile output yet.' }];
      }
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
