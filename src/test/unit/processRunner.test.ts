import { describe, it, expect } from 'vitest';
import { runProcess } from '../../core/processRunner';
import * as os from 'os';
import * as process from 'process';

// Use Node itself as a portable, always-available binary with an absolute path
const NODE = process.execPath;

describe('processRunner', () => {
  it('captures stdout from a successful command', async () => {
    const result = await runProcess({
      command: NODE,
      args: ['-e', "process.stdout.write('hello')"],
      cwd: os.tmpdir(),
      timeoutMs: 5000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
    expect(result.timedOut).toBe(false);
  });

  it('returns non-zero exit code for a failing command', async () => {
    const result = await runProcess({
      command: NODE,
      args: ['-e', 'process.exit(1)'],
      cwd: os.tmpdir(),
      timeoutMs: 5000,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.timedOut).toBe(false);
  });

  it('captures stderr output', async () => {
    const result = await runProcess({
      command: NODE,
      args: ['-e', "process.stderr.write('err')"],
      cwd: os.tmpdir(),
      timeoutMs: 5000,
    });
    expect(result.stderr.trim()).toBe('err');
  });

  it('times out a long-running process', async () => {
    const result = await runProcess({
      command: NODE,
      args: ['-e', 'setTimeout(() => {}, 10000)'],
      cwd: os.tmpdir(),
      timeoutMs: 100,
    });
    expect(result.timedOut).toBe(true);
  }, 3000);

  it('respects AbortSignal cancellation', async () => {
    const controller = new AbortController();
    const resultPromise = runProcess({
      command: NODE,
      args: ['-e', 'setTimeout(() => {}, 10000)'],
      cwd: os.tmpdir(),
      timeoutMs: 5000,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 50);
    const result = await resultPromise;
    expect(result.exitCode).not.toBe(0);
  }, 3000);

  it('invokes onStdout callback with data chunks', async () => {
    const chunks: string[] = [];
    await runProcess({
      command: NODE,
      args: ['-e', "process.stdout.write('data')"],
      cwd: os.tmpdir(),
      timeoutMs: 5000,
      onStdout: (text) => chunks.push(text),
    });
    expect(chunks.join('').trim()).toBe('data');
  });

  it('resolves with exitCode 1 for an unknown binary', async () => {
    const result = await runProcess({
      command: '/this/binary/does/not/exist/xyz',
      args: [],
      cwd: os.tmpdir(),
      timeoutMs: 5000,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBeTruthy();
  });
});
