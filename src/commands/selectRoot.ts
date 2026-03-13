import * as vscode from 'vscode';
import { findTexFiles, getWorkspaceRoot } from '../core/projectLocator';

export async function selectRootCommand(): Promise<string | undefined> {
  const root = getWorkspaceRoot();
  if (!root) {
    await vscode.window.showWarningMessage('LaTeX One-Click: No workspace folder open.');
    return undefined;
  }

  const files = await findTexFiles(root);
  if (files.length === 0) {
    await vscode.window.showWarningMessage('LaTeX One-Click: No .tex files found in workspace.');
    return undefined;
  }

  const items = files.map((f) => ({
    label: vscode.workspace.asRelativePath(f),
    description: f,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select the main LaTeX file to compile',
  });

  if (!picked) return undefined;

  await vscode.workspace.getConfiguration('latexOneClick').update(
    'mainFile',
    vscode.workspace.asRelativePath(picked.description),
    vscode.ConfigurationTarget.Workspace
  );

  return picked.description;
}
