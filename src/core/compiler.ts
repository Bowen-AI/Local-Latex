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
  synctex: boolean;
  tectonicPrint?: boolean;
  tectonicKeepLogs?: boolean;
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

export function resolveOutputDirectory(workspaceRoot: string, outputDirectory: string): string {
  return path.isAbsolute(outputDirectory)
    ? outputDirectory
    : path.resolve(workspaceRoot, outputDirectory);
}

function getTexOutputBaseName(mainFile: string): string {
  return path.basename(mainFile).replace(/\.tex$/i, '');
}

export function getOutputPdfPath(
  workspaceRoot: string,
  outputDirectory: string,
  mainFile: string
): string {
  return path.join(resolveOutputDirectory(workspaceRoot, outputDirectory), `${getTexOutputBaseName(mainFile)}.pdf`);
}

export function buildCompileArgs(
  options: Pick<
    CompileOptions,
    'outputDirectory' | 'offlineOnly' | 'mainFile' | 'synctex' | 'tectonicPrint' | 'tectonicKeepLogs'
  >
): string[] {
  const args = ['--outdir', options.outputDirectory];
  if (options.synctex) {
    args.push('--synctex');
  }
  if (options.offlineOnly) {
    args.push('--only-cached');
  }
  if (options.tectonicPrint) {
    args.push('--print');
  }
  if (options.tectonicKeepLogs) {
    args.push('--keep-logs');
  }
  args.push(options.mainFile);
  return args;
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

  const args = buildCompileArgs({
    outputDirectory,
    offlineOnly,
    mainFile,
    synctex: options.synctex,
    tectonicPrint: options.tectonicPrint,
    tectonicKeepLogs: options.tectonicKeepLogs,
  });

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
    ? getOutputPdfPath(workspaceRoot, outputDirectory, mainFile)
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
