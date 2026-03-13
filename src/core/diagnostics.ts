import * as vscode from 'vscode';
import { LogEntry } from './logParser';
import * as path from 'path';

let collection: vscode.DiagnosticCollection | undefined;

export function getDiagnosticsCollection(): vscode.DiagnosticCollection {
  if (!collection) {
    collection = vscode.languages.createDiagnosticCollection('latex-one-click');
  }
  return collection;
}

export function applyDiagnostics(entries: LogEntry[], workspaceRoot: string): void {
  const col = getDiagnosticsCollection();
  col.clear();

  const grouped = new Map<string, vscode.Diagnostic[]>();

  for (const entry of entries) {
    const absFile = path.isAbsolute(entry.file)
      ? entry.file
      : path.join(workspaceRoot, entry.file);
    const uri = vscode.Uri.file(absFile);
    const key = uri.toString();

    const severity =
      entry.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : entry.severity === 'warning'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information;

    const line = Math.max(0, (entry.line ?? 1) - 1);
    const col = Math.max(0, (entry.column ?? 0));
    const range = new vscode.Range(line, col, line, col + 1);

    const diag = new vscode.Diagnostic(range, entry.message, severity);
    diag.source = 'LaTeX One-Click';

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(diag);
  }

  for (const [key, diags] of grouped) {
    col.set(vscode.Uri.parse(key), diags);
  }
}

export function clearDiagnostics(): void {
  getDiagnosticsCollection().clear();
}

export function disposeDiagnostics(): void {
  collection?.dispose();
  collection = undefined;
}
