import * as vscode from 'vscode';
import * as path from 'path';

export function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }
  return folders[0].uri.fsPath;
}

export async function findTexFiles(workspaceRoot: string): Promise<string[]> {
  const pattern = new vscode.RelativePattern(workspaceRoot, '**/*.tex');
  const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
  return files.map((f) => f.fsPath);
}

export async function findTectonicToml(workspaceRoot: string): Promise<string | undefined> {
  const pattern = new vscode.RelativePattern(workspaceRoot, '**/Tectonic.toml');
  const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
  return files[0]?.fsPath;
}

export function resolveRelative(workspaceRoot: string, relative: string): string {
  return path.resolve(workspaceRoot, relative);
}
