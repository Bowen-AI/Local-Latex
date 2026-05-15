import * as vscode from 'vscode';
import type { LogEntry } from '../core/logParser';
import { getWorkspaceRoot } from '../core/projectLocator';
import { getTrustedWorkspaceBlockReason } from '../core/workspaceAccess';
import { getCompileSnapshot } from './compileSidebarState';
import { splitClippedLogLines } from './compileLogLines';

type CompileGroupId = 'errors' | 'warnings' | 'log';

export type CompileTreeElement =
  | { kind: 'hint'; text: string }
  | { kind: 'summary'; text: string; success?: boolean; timedOut?: boolean; pdfMissing?: boolean; finishedAtMs?: number }
  | { kind: 'action'; id: string; label: string; iconId: string; commandId: string; args?: unknown[]; description?: string }
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
        element.timedOut
          ? 'watch'
          : element.success === undefined
          ? 'info'
          : element.success
          ? 'check'
          : element.pdfMissing
          ? 'warning'
          : 'error'
      );
      if (element.finishedAtMs) {
        item.description = new Date(element.finishedAtMs).toLocaleTimeString();
      }
      item.tooltip = element.text;
      return item;
    }
    if (element.kind === 'action') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon(element.iconId);
      item.description = element.description;
      item.command = {
        command: element.commandId,
        title: element.label,
        arguments: element.args,
      };
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
      const locationText = entry.line > 0 ? `${entry.file}:${entry.line}` : entry.file;
      item.description = locationText;
      item.tooltip = `${locationText}\n${entry.message}`;
      item.iconPath = new vscode.ThemeIcon(
        entry.severity === 'error' ? 'error' : entry.severity === 'warning' ? 'warning' : 'info'
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
      const items: CompileTreeElement[] = [
        {
          kind: 'summary',
          text: snap?.summary ?? 'No compile output yet. Run Compile.',
          success: snap?.success,
          timedOut: snap?.timedOut,
          pdfMissing: snap?.pdfMissing,
          finishedAtMs: snap?.finishedAtMs,
        },
        {
          kind: 'action',
          id: 'compile',
          label: snap ? 'Recompile' : 'Compile',
          iconId: 'play',
          commandId: 'latexOneClick.compile',
        },
      ];

      if (snap) {
        if (errors.length > 0) {
          items.push({
            kind: 'action',
            id: 'jumpFirstError',
            label: 'Jump to first error',
            iconId: 'arrow-right',
            commandId: 'latexOneClick.jumpToFirstError',
            description: errors[0]?.line ? `line ${errors[0].line}` : undefined,
          });
        }
        items.push({
          kind: 'action',
          id: 'showLog',
          label: 'Open full log',
          iconId: 'output',
          commandId: 'latexOneClick.showCompileLog',
        });
        items.push({
          kind: 'action',
          id: 'copyLog',
          label: 'Copy log to clipboard',
          iconId: 'clippy',
          commandId: 'latexOneClick.copyCompileLog',
        });
      }

      items.push(
        { kind: 'group', id: 'errors', count: errors.length, hasSnapshot: Boolean(snap) },
        { kind: 'group', id: 'warnings', count: warnings.length, hasSnapshot: Boolean(snap) },
        { kind: 'group', id: 'log', hasSnapshot: Boolean(snap) }
      );
      return items;
    }

    if (element.kind !== 'group') {
      return [];
    }

    if (element.id === 'errors') {
      const entries = snap?.logs.filter((e) => e.severity === 'error') ?? [];
      if (entries.length === 0) {
        if (!snap) {
          return [{ kind: 'empty', text: 'No compile output yet.' }];
        }
        if (snap.success) {
          return [{ kind: 'empty', text: 'No errors. Build succeeded.' }];
        }
        return [{ kind: 'empty', text: 'No errors parsed — check Compile output below for raw details.' }];
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
