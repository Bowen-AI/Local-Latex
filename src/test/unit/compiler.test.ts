import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

// Mock processRunner before importing compiler
vi.mock('../../core/processRunner', () => ({
  runProcess: vi.fn(),
}));

import { compile } from '../../core/compiler';
import { runProcess } from '../../core/processRunner';

const mockRunProcess = vi.mocked(runProcess);

const BASE_OPTIONS = {
  binaryPath: '/usr/local/bin/tectonic',
  mainFile: '/workspace/main.tex',
  outputDirectory: 'out',
  workspaceRoot: '/workspace',
  timeoutMs: 60000,
  offlineOnly: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('compiler', () => {
  it('calls runProcess with correct arguments for a basic compile', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });

    await compile(BASE_OPTIONS);

    expect(mockRunProcess).toHaveBeenCalledOnce();
    const call = mockRunProcess.mock.calls[0][0];
    expect(call.command).toBe('/usr/local/bin/tectonic');
    expect(call.args).toContain('compile');
    expect(call.args).toContain('--outdir');
    expect(call.args).toContain('out');
    expect(call.args).toContain('/workspace/main.tex');
    expect(call.cwd).toBe('/workspace');
    expect(call.timeoutMs).toBe(60000);
  });

  it('adds --only-cached flag when offlineOnly is true', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });

    await compile({ ...BASE_OPTIONS, offlineOnly: true });

    const call = mockRunProcess.mock.calls[0][0];
    expect(call.args).toContain('--only-cached');
  });

  it('does not add --only-cached flag when offlineOnly is false', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });

    await compile({ ...BASE_OPTIONS, offlineOnly: false });

    const call = mockRunProcess.mock.calls[0][0];
    expect(call.args).not.toContain('--only-cached');
  });

  it('returns success=true and outputPdf when exit code is 0', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: 'Output written.', stderr: '', timedOut: false });

    const result = await compile(BASE_OPTIONS);

    expect(result.success).toBe(true);
    expect(result.outputPdf).toBe(path.join('/workspace', 'out', 'main.pdf'));
    expect(result.timedOut).toBe(false);
  });

  it('returns success=false and no outputPdf when exit code is non-zero', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 1, stdout: '', stderr: '! LaTeX Error: bad.', timedOut: false });

    const result = await compile(BASE_OPTIONS);

    expect(result.success).toBe(false);
    expect(result.outputPdf).toBeUndefined();
  });

  it('returns timedOut=true when process times out', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 1, stdout: '', stderr: '', timedOut: true });

    const result = await compile(BASE_OPTIONS);

    expect(result.timedOut).toBe(true);
    expect(result.success).toBe(false);
  });

  it('parses log entries from combined stdout+stderr', async () => {
    const stderr = `! LaTeX Error: File \`missing.sty' not found.\nl.3 \\usepackage{missing}`;
    mockRunProcess.mockResolvedValue({ exitCode: 1, stdout: '', stderr, timedOut: false });

    const result = await compile(BASE_OPTIONS);

    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.logs[0].severity).toBe('error');
  });

  it('includes durationMs in result', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });

    const result = await compile(BASE_OPTIONS);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('passes AbortSignal through to runProcess', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });
    const controller = new AbortController();

    await compile({ ...BASE_OPTIONS, signal: controller.signal });

    const call = mockRunProcess.mock.calls[0][0];
    expect(call.signal).toBe(controller.signal);
  });

  it('passes onOutput callback as both onStdout and onStderr', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });
    const onOutput = vi.fn();

    await compile({ ...BASE_OPTIONS, onOutput });

    const call = mockRunProcess.mock.calls[0][0];
    expect(call.onStdout).toBe(onOutput);
    expect(call.onStderr).toBe(onOutput);
  });

  it('derives PDF name from main tex file basename', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });

    const result = await compile({ ...BASE_OPTIONS, mainFile: '/workspace/thesis.tex' });

    expect(result.outputPdf).toBe(path.join('/workspace', 'out', 'thesis.pdf'));
  });
});
