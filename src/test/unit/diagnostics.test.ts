import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal vscode mock for diagnostics
const mockDiagnosticCollection = {
  clear: vi.fn(),
  set: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('vscode', () => ({
  languages: {
    createDiagnosticCollection: vi.fn(() => mockDiagnosticCollection),
  },
  Uri: {
    file: (p: string) => ({ fsPath: p, toString: () => `file://${p}` }),
    parse: (s: string) => ({ fsPath: s, toString: () => s }),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
  },
  Range: class {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
    constructor(sl: number, sc: number, el: number, ec: number) {
      this.startLine = sl;
      this.startCharacter = sc;
      this.endLine = el;
      this.endCharacter = ec;
    }
  },
  Diagnostic: class {
    range: unknown;
    message: string;
    severity: number;
    source?: string;
    constructor(range: unknown, message: string, severity: number) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  },
}));

import { applyDiagnostics, clearDiagnostics, disposeDiagnostics } from '../../core/diagnostics';
import type { LogEntry } from '../../core/logParser';
import * as vscode from 'vscode';

const WS_ROOT = '/workspace';

beforeEach(() => {
  vi.clearAllMocks();
  disposeDiagnostics();
});

describe('core/diagnostics', () => {
  it('clears the diagnostic collection before applying new entries', () => {
    applyDiagnostics([], WS_ROOT);
    expect(mockDiagnosticCollection.clear).toHaveBeenCalled();
  });

  it('applies no diagnostics for an empty log entry list', () => {
    applyDiagnostics([], WS_ROOT);
    expect(mockDiagnosticCollection.set).not.toHaveBeenCalled();
  });

  it('groups diagnostics by file and calls set once per file', () => {
    const entries: LogEntry[] = [
      { file: 'main.tex', line: 5, severity: 'error', message: 'Error 1' },
      { file: 'main.tex', line: 10, severity: 'warning', message: 'Warning 1' },
    ];
    applyDiagnostics(entries, WS_ROOT);
    expect(mockDiagnosticCollection.set).toHaveBeenCalledOnce();
  });

  it('calls set once per distinct file', () => {
    const entries: LogEntry[] = [
      { file: 'main.tex', line: 1, severity: 'error', message: 'Error in main' },
      { file: 'chapter1.tex', line: 2, severity: 'warning', message: 'Warning in chapter' },
    ];
    applyDiagnostics(entries, WS_ROOT);
    expect(mockDiagnosticCollection.set).toHaveBeenCalledTimes(2);
  });

  it('maps error severity correctly', () => {
    const entries: LogEntry[] = [
      { file: 'main.tex', line: 1, severity: 'error', message: 'An error' },
    ];
    applyDiagnostics(entries, WS_ROOT);
    const [, diags] = mockDiagnosticCollection.set.mock.calls[0] as [unknown, { severity: number }[]];
    expect(diags[0].severity).toBe(vscode.DiagnosticSeverity.Error);
  });

  it('maps warning severity correctly', () => {
    const entries: LogEntry[] = [
      { file: 'main.tex', line: 1, severity: 'warning', message: 'A warning' },
    ];
    applyDiagnostics(entries, WS_ROOT);
    const [, diags] = mockDiagnosticCollection.set.mock.calls[0] as [unknown, { severity: number }[]];
    expect(diags[0].severity).toBe(vscode.DiagnosticSeverity.Warning);
  });

  it('maps info severity correctly', () => {
    const entries: LogEntry[] = [
      { file: 'main.tex', line: 1, severity: 'info', message: 'Info message' },
    ];
    applyDiagnostics(entries, WS_ROOT);
    const [, diags] = mockDiagnosticCollection.set.mock.calls[0] as [unknown, { severity: number }[]];
    expect(diags[0].severity).toBe(vscode.DiagnosticSeverity.Information);
  });

  it('uses absolute path when entry file is absolute', () => {
    const absFile = '/workspace/main.tex';
    const entries: LogEntry[] = [
      { file: absFile, line: 1, severity: 'error', message: 'Error' },
    ];
    applyDiagnostics(entries, WS_ROOT);
    const [uri] = mockDiagnosticCollection.set.mock.calls[0] as [{ toString(): string }, unknown];
    expect(uri.toString()).toContain('main.tex');
  });

  it('resolves relative file paths against workspaceRoot', () => {
    const entries: LogEntry[] = [
      { file: 'sub/chapter.tex', line: 1, severity: 'error', message: 'Error' },
    ];
    applyDiagnostics(entries, WS_ROOT);
    const [uri] = mockDiagnosticCollection.set.mock.calls[0] as [{ toString(): string }, unknown];
    expect(uri.toString()).toContain('chapter.tex');
  });

  it('clearDiagnostics clears the collection', () => {
    clearDiagnostics();
    expect(mockDiagnosticCollection.clear).toHaveBeenCalled();
  });

  it('sets diagnostic source to "LaTeX One-Click"', () => {
    const entries: LogEntry[] = [
      { file: 'main.tex', line: 1, severity: 'error', message: 'An error' },
    ];
    applyDiagnostics(entries, WS_ROOT);
    const [, diags] = mockDiagnosticCollection.set.mock.calls[0] as [unknown, { source: string }[]];
    expect(diags[0].source).toBe('LaTeX One-Click');
  });
});
