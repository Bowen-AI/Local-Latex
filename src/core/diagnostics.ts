import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LogEntry } from './logParser';

let collection: vscode.DiagnosticCollection | undefined;

export function getDiagnosticsCollection(): vscode.DiagnosticCollection {
  if (!collection) {
    collection = vscode.languages.createDiagnosticCollection('latex-one-click');
  }
  return collection;
}

export interface DiagnosticsContext {
  workspaceRoot: string;
  /** Absolute path to the main .tex file we're compiling. Errors that can't be
   *  attributed to a real file fall back here so the user can always jump to
   *  *somewhere* useful. */
  mainFile?: string;
}

function existsSyncSafe(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Try to resolve a log-reported file path to a real workspace file.
 *
 * The TeX log can reference paths in several confusing forms:
 *   - absolute (already useful)
 *   - relative to workspace root
 *   - relative to main file directory (multi-file projects)
 *   - bare basename (no path)
 *   - paths starting with `./` from kpathsea
 *
 * If none of those land on a real file, search the workspace by basename.
 * As a last resort, attach the diagnostic to the main file so the user has
 * a clickable destination instead of the diagnostic vanishing from the UI.
 */
function resolveFilePath(rawFile: string, context: DiagnosticsContext): string | undefined {
  const cleaned = rawFile.replace(/^\.\//, '').trim();
  if (!cleaned) return context.mainFile;

  const candidates: string[] = [];
  if (path.isAbsolute(cleaned)) {
    candidates.push(cleaned);
  } else {
    candidates.push(path.resolve(context.workspaceRoot, cleaned));
    if (context.mainFile) {
      candidates.push(path.resolve(path.dirname(context.mainFile), cleaned));
    }
  }

  for (const candidate of candidates) {
    if (existsSyncSafe(candidate)) return candidate;
  }

  const basename = path.basename(cleaned);
  const found = findInWorkspace(context.workspaceRoot, basename);
  if (found) return found;

  return context.mainFile;
}

const SEARCH_MAX_FILES = 2000;
const SEARCH_EXCLUDE_DIRS = new Set(['node_modules', '.git', 'out', 'build', 'dist', '.vscode']);

function findInWorkspace(root: string, basename: string): string | undefined {
  if (!basename) return undefined;
  const stack: string[] = [root];
  let visited = 0;
  const target = basename.toLowerCase();

  while (stack.length > 0 && visited < SEARCH_MAX_FILES) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      visited += 1;
      if (visited >= SEARCH_MAX_FILES) break;
      if (entry.isDirectory()) {
        if (SEARCH_EXCLUDE_DIRS.has(entry.name)) continue;
        stack.push(path.join(dir, entry.name));
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase() === target) {
        return path.join(dir, entry.name);
      }
    }
  }

  return undefined;
}

function severityOrder(entry: LogEntry): number {
  if (entry.severity === 'error') return 0;
  if (entry.severity === 'warning') return 1;
  return 2;
}

function sortEntries(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort((a, b) => {
    const sev = severityOrder(a) - severityOrder(b);
    if (sev !== 0) return sev;
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return (a.line || 0) - (b.line || 0);
  });
}

export function applyDiagnostics(
  entries: LogEntry[],
  workspaceRootOrContext: string | DiagnosticsContext
): void {
  const context: DiagnosticsContext =
    typeof workspaceRootOrContext === 'string'
      ? { workspaceRoot: workspaceRootOrContext }
      : workspaceRootOrContext;

  const col = getDiagnosticsCollection();
  col.clear();

  const grouped = new Map<string, vscode.Diagnostic[]>();
  const sorted = sortEntries(entries);

  for (const entry of sorted) {
    const resolved = resolveFilePath(entry.file, context);
    if (!resolved) continue;

    const uri = vscode.Uri.file(resolved);
    const key = uri.toString();

    const severity =
      entry.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : entry.severity === 'warning'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information;

    const line = Math.max(0, (entry.line ?? 1) - 1);
    const column = Math.max(0, entry.column ?? 0);
    const range = new vscode.Range(line, column, line, column + 1);

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
