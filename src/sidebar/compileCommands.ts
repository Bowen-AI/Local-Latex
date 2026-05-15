import * as vscode from 'vscode';
import { getWorkspaceRoot } from '../core/projectLocator';
import { show as showOutputChannel } from '../core/outputChannel';
import { getCompileSnapshot } from './compileSidebarState';

export async function jumpToFirstErrorCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) return;
  const snap = getCompileSnapshot(root);
  const first = snap?.logs.find((entry) => entry.severity === 'error');
  if (!first) {
    await vscode.window.showInformationMessage('LaTeX One-Click: No errors to jump to.');
    return;
  }
  await vscode.commands.executeCommand(
    'latexOneClick.revealTexLocation',
    root,
    first.file,
    first.line,
    first.column
  );
}

export function showCompileLogCommand(): void {
  showOutputChannel();
}

export async function copyCompileLogCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) return;
  const snap = getCompileSnapshot(root);
  if (!snap) {
    await vscode.window.showInformationMessage('LaTeX One-Click: No compile log to copy.');
    return;
  }
  await vscode.env.clipboard.writeText(snap.notesText);
  await vscode.window.showInformationMessage('LaTeX One-Click: Compile log copied to clipboard.');
}
