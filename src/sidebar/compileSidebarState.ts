import * as path from 'path';
import * as vscode from 'vscode';
import type { CompileResult } from '../core/compiler';
import type { LogEntry } from '../core/logParser';
import { hasTectonicFetchFailure, hasTectonicPackageDownload } from '../core/tectonicProgress';

export interface CompileSnapshot {
  finishedAtMs: number;
  logs: LogEntry[];
  notesText: string;
  success: boolean;
  timedOut: boolean;
  pdfMissing: boolean;
  summary: string;
  /** Absolute path to the main .tex file from this compile, when available. */
  mainFile?: string;
  /** Absolute path to the PDF that *should* have been produced. */
  expectedPdfPath?: string;
}

const snapshots = new Map<string, CompileSnapshot>();

const snapshotUpdatedEmitter = new vscode.EventEmitter<string>();

export const onCompileSnapshotUpdated = snapshotUpdatedEmitter.event;

export function getCompileSnapshot(workspaceRoot: string): CompileSnapshot | undefined {
  return snapshots.get(workspaceRoot);
}

function buildSnapshotSummary(result: CompileResult): string {
  const output = result.stdout + result.stderr;
  if (result.timedOut) {
    return 'Timed out';
  }
  if (result.success) {
    const suffix = hasTectonicPackageDownload(output) ? ' (fetched TeX packages)' : '';
    return `Compiled in ${(result.durationMs / 1000).toFixed(1)}s${suffix}`;
  }
  if (result.pdfMissing) {
    return `No PDF produced: ${path.basename(result.expectedPdfPath)} was not written`;
  }
  if (hasTectonicFetchFailure(output)) {
    return 'TeX package download failed';
  }
  const firstErr = result.logs.find((e) => e.severity === 'error');
  if (firstErr) {
    return firstErr.message.length > 200 ? `${firstErr.message.slice(0, 197)}…` : firstErr.message;
  }
  const tail = result.stderr.trim() || result.stdout.trim();
  if (tail) {
    const lastLine = tail.split('\n').pop()!;
    return lastLine.length > 200 ? `${lastLine.slice(0, 197)}…` : lastLine;
  }
  return 'Compile failed';
}

function clipNotes(combined: string, maxChars = 200_000): string {
  if (combined.length <= maxChars) {
    return combined;
  }
  return `…(truncated)\n${combined.slice(-maxChars)}`;
}

export interface SnapshotInput {
  result: CompileResult;
  mainFile?: string;
}

export function captureCompileSnapshot(
  workspaceRoot: string,
  resultOrInput: CompileResult | SnapshotInput
): void {
  const input: SnapshotInput =
    'result' in resultOrInput ? resultOrInput : { result: resultOrInput };
  const { result, mainFile } = input;
  const combined = result.stdout + result.stderr;
  snapshots.set(workspaceRoot, {
    finishedAtMs: Date.now(),
    logs: result.logs,
    notesText: clipNotes(combined),
    success: result.success,
    timedOut: result.timedOut,
    pdfMissing: result.pdfMissing,
    summary: buildSnapshotSummary(result),
    mainFile,
    expectedPdfPath: result.expectedPdfPath,
  });
  snapshotUpdatedEmitter.fire(workspaceRoot);
}

export function clearCompileSnapshot(workspaceRoot: string): void {
  if (snapshots.delete(workspaceRoot)) {
    snapshotUpdatedEmitter.fire(workspaceRoot);
  }
}
