import { describe, expect, it } from 'vitest';
import { runProcess } from '../../core/processRunner';

describe('processRunner', () => {
  it('captures stdout and stderr', async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const result = await runProcess({
      command: process.execPath,
      args: ['-e', "process.stdout.write('ok'); process.stderr.write('warn');"],
      cwd: process.cwd(),
      timeoutMs: 1000,
      onStdout: (data) => stdout.push(data),
      onStderr: (data) => stderr.push(data),
    });

    expect(result).toMatchObject({
      exitCode: 0,
      stdout: 'ok',
      stderr: 'warn',
      timedOut: false,
    });
    expect(stdout.join('')).toBe('ok');
    expect(stderr.join('')).toBe('warn');
  });

  it('marks a process as timed out', async () => {
    const result = await runProcess({
      command: process.execPath,
      args: ['-e', 'setTimeout(() => undefined, 1000);'],
      cwd: process.cwd(),
      timeoutMs: 20,
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.timedOut).toBe(true);
  });

  it('eventually settles when a timed-out process ignores SIGTERM', async () => {
    const result = await runProcess({
      command: process.execPath,
      args: [
        '-e',
        "process.on('SIGTERM', () => undefined); setInterval(() => undefined, 1000);",
      ],
      cwd: process.cwd(),
      timeoutMs: 20,
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.timedOut).toBe(true);
  });

  it('settles with an error result for missing commands', async () => {
    const result = await runProcess({
      command: 'definitely-not-a-real-latex-one-click-command',
      args: [],
      cwd: process.cwd(),
      timeoutMs: 1000,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('definitely-not-a-real-latex-one-click-command');
    expect(result.timedOut).toBe(false);
  });
});
