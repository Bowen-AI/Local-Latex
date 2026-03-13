import { spawn } from 'child_process';

export interface ProcessOptions {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  signal?: AbortSignal;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export async function runProcess(options: ProcessOptions): Promise<ProcessResult> {
  const { command, args, cwd, timeoutMs, signal, onStdout, onStderr } = options;

  return new Promise((resolve) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    let timedOut = false;

    const proc = spawn(command, args, { cwd, shell: false });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, timeoutMs);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      proc.kill('SIGTERM');
    });

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout.push(text);
      onStdout?.(text);
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr.push(text);
      onStderr?.(text);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout: stdout.join(''),
        stderr: stderr.join(''),
        timedOut,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout: stdout.join(''),
        stderr: err.message,
        timedOut: false,
      });
    });
  });
}
