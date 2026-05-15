import * as fs from 'fs';
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
  /** Absolute path to PDF if it was actually written (regardless of exit code). */
  outputPdf?: string;
  /** Expected PDF path even if not produced (for UI to show "should have built here"). */
  expectedPdfPath: string;
  /** True when Tectonic exited 0 but no PDF appeared on disk. */
  pdfMissing: boolean;
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

function pdfExistsWithContent(pdfPath: string): boolean {
  try {
    const stat = fs.statSync(pdfPath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function buildSyntheticErrorEntry(message: string, defaultFile: string): LogEntry {
  return {
    file: defaultFile,
    line: 0,
    column: 0,
    severity: 'error',
    message,
  };
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
  const mainFileBasename = path.basename(mainFile);
  const logs = parseLog(combined, mainFileBasename);

  const expectedPdfPath = getOutputPdfPath(workspaceRoot, outputDirectory, mainFile);
  const pdfOnDisk = pdfExistsWithContent(expectedPdfPath);
  const exitOk = result.exitCode === 0;

  let success = exitOk && pdfOnDisk;
  let outputPdf: string | undefined;
  let pdfMissing = false;

  if (pdfOnDisk) {
    outputPdf = expectedPdfPath;
  }

  if (exitOk && !pdfOnDisk) {
    pdfMissing = true;
    success = false;
    if (!logs.some((entry) => entry.severity === 'error')) {
      logs.push(
        buildSyntheticErrorEntry(
          `Tectonic reported success but no PDF was written to ${path.basename(expectedPdfPath)}. The log above may hint at the cause; common reasons are an empty document or a fatal package error swallowed by Tectonic.`,
          mainFileBasename
        )
      );
    }
  }

  if (!exitOk && !logs.some((entry) => entry.severity === 'error') && !result.timedOut) {
    const fallback = (result.stderr.trim() || result.stdout.trim() || 'Compile failed without diagnostic output.')
      .split('\n')
      .pop()!
      .slice(0, 500);
    logs.push(buildSyntheticErrorEntry(fallback, mainFileBasename));
  }

  return {
    success,
    logs,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs,
    outputPdf,
    expectedPdfPath,
    pdfMissing,
    timedOut: result.timedOut,
  };
}
