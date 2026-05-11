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
    let settled = false;

    const proc = spawn(command, args, { cwd, shell: false });
    let timer: NodeJS.Timeout | undefined;
    let killTimer: NodeJS.Timeout | undefined;

    const safeKill = (signal: NodeJS.Signals): void => {
      try {
        proc.kill(signal);
      } catch {
        // Ignore kill failures (e.g. EACCES in restricted sandboxes).
      }
    };

    const terminate = (): void => {
      if (killTimer) return;
      safeKill('SIGTERM');
      killTimer = setTimeout(() => {
        safeKill('SIGKILL');
      }, 2000);
    };

    const finish = (result: ProcessResult): void => {
      if (settled) return;
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (killTimer) {
        clearTimeout(killTimer);
      }
      signal?.removeEventListener('abort', abort);
      resolve(result);
    };

    const abort = (): void => {
      if (timer) {
        clearTimeout(timer);
      }
      terminate();
    };

    timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, timeoutMs);

    if (signal?.aborted) {
      abort();
    } else {
      signal?.addEventListener('abort', abort, { once: true });
    }

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
      finish({
        exitCode: code ?? 1,
        stdout: stdout.join(''),
        stderr: stderr.join(''),
        timedOut,
      });
    });

    proc.on('error', (err) => {
      const stderrText = stderr.join('');
      const merged =
        stderrText && err.message
          ? `${stderrText}\n${err.message}`
          : stderrText || err.message;
      finish({
        exitCode: 1,
        stdout: stdout.join(''),
        stderr: merged,
        timedOut,
      });
    });
  });
}
