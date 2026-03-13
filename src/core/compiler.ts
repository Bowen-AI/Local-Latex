import * as path from 'path';
import { runProcess } from './processRunner';
import { parseLog, LogEntry } from './logParser';

export interface CompileOptions {
  binaryPath: string;
  mainFile: string;
  outputDirectory: string;
  workspaceRoot: string;
  timeoutMs: number;
  offlineOnly: boolean;
  signal?: AbortSignal;
  onOutput?: (data: string) => void;
}

export interface CompileResult {
  success: boolean;
  logs: LogEntry[];
  stdout: string;
  stderr: string;
  durationMs: number;
  outputPdf?: string;
  timedOut: boolean;
}

export async function compile(options: CompileOptions): Promise<CompileResult> {
  const {
    binaryPath,
    mainFile,
    outputDirectory,
    workspaceRoot,
    timeoutMs,
    offlineOnly,
    signal,
    onOutput,
  } = options;

  const args = ['compile', '--outdir', outputDirectory];
  if (offlineOnly) {
    args.push('--only-cached');
  }
  args.push(mainFile);

  const start = Date.now();

  const result = await runProcess({
    command: binaryPath,
    args,
    cwd: workspaceRoot,
    timeoutMs,
    signal,
    onStdout: onOutput,
    onStderr: onOutput,
  });

  const durationMs = Date.now() - start;
  const combined = result.stdout + result.stderr;
  const logs = parseLog(combined, path.basename(mainFile));

  const outputPdf = result.exitCode === 0
    ? path.join(workspaceRoot, outputDirectory, path.basename(mainFile, '.tex') + '.pdf')
    : undefined;

  return {
    success: result.exitCode === 0,
    logs,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs,
    outputPdf,
    timedOut: result.timedOut,
  };
}
