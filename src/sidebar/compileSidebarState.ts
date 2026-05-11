import * as vscode from 'vscode';
import type { CompileResult } from '../core/compiler';
import type { LogEntry } from '../core/logParser';

export interface CompileSnapshot {
  finishedAtMs: number;
  logs: LogEntry[];
  notesText: string;
  success: boolean;
  timedOut: boolean;
  summary: string;
}

const snapshots = new Map<string, CompileSnapshot>();

const snapshotUpdatedEmitter = new vscode.EventEmitter<string>();

export const onCompileSnapshotUpdated = snapshotUpdatedEmitter.event;

export function getCompileSnapshot(workspaceRoot: string): CompileSnapshot | undefined {
  return snapshots.get(workspaceRoot);
}

function buildSnapshotSummary(result: CompileResult): string {
  if (result.timedOut) {
    return 'Timed out';
  }
  if (result.success) {
    return `Compiled in ${(result.durationMs / 1000).toFixed(1)}s`;
  }
  const firstErr = result.logs.find((e) => e.severity === 'error');
  const tail = result.stderr.trim() || result.stdout.trim();
  return (
    firstErr?.message ??
    (tail ? tail.split('\n').pop()!.slice(0, 200) : 'Compile failed')
  );
}

function clipNotes(combined: string, maxChars = 200_000): string {
  if (combined.length <= maxChars) {
    return combined;
  }
  return `…(truncated)\n${combined.slice(-maxChars)}`;
}

export function captureCompileSnapshot(workspaceRoot: string, result: CompileResult): void {
  const combined = result.stdout + result.stderr;
  snapshots.set(workspaceRoot, {
    finishedAtMs: Date.now(),
    logs: result.logs,
    notesText: clipNotes(combined),
    success: result.success,
    timedOut: result.timedOut,
    summary: buildSnapshotSummary(result),
  });
  snapshotUpdatedEmitter.fire(workspaceRoot);
}
