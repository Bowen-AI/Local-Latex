/**
 * Integration tests using real fixture .tex files.
 *
 * These tests demonstrate end-to-end behavior using the fixture projects:
 *   - hello-world/   : minimal valid LaTeX document
 *   - error-missing-brace/ : document with an intentional syntax error
 *   - multi-file/    : document that \input{} an external chapter file
 *
 * They exercise logParser, mainFileResolver, and processRunner together
 * without requiring Tectonic to be installed (processRunner is mocked for
 * compile runs; file-system operations use the real fixture files).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { parseLog } from '../../core/logParser';
import { resolveMainFile } from '../../core/mainFileResolver';

vi.mock('../../core/processRunner', () => ({ runProcess: vi.fn() }));

import { compile } from '../../core/compiler';
import { runProcess } from '../../core/processRunner';

const mockRunProcess = vi.mocked(runProcess);
const FIXTURES = path.resolve(__dirname, '../fixtures');

// Real filesystem ops backed by the actual fixture directory
const realFs = {
  exists: async (p: string) => fs.existsSync(p),
  readFile: async (p: string) => fs.readFileSync(p, 'utf-8'),
  findFiles: async (root: string, pattern: RegExp) => {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && pattern.test(e.name))
      .map((e) => path.join(root, e.name));
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// hello-world fixture
// ---------------------------------------------------------------------------
describe('fixture: hello-world', () => {
  const fixtureDir = path.join(FIXTURES, 'hello-world');

  it('fixture file exists', () => {
    expect(fs.existsSync(path.join(fixtureDir, 'main.tex'))).toBe(true);
  });

  it('fixture contains a valid \\begin{document} ... \\end{document} block', () => {
    const content = fs.readFileSync(path.join(fixtureDir, 'main.tex'), 'utf-8');
    expect(content).toContain('\\begin{document}');
    expect(content).toContain('\\end{document}');
  });

  it('resolves main.tex as the entry point', async () => {
    const result = await resolveMainFile({ workspaceRoot: fixtureDir, fs: realFs });
    expect(result).toBe(path.join(fixtureDir, 'main.tex'));
  });

  it('produces no log errors for a clean compile output', () => {
    const cleanLog = `This is Tectonic, version 0.15.0\nNo errors.\nOutput written to out/main.pdf`;
    const entries = parseLog(cleanLog, 'main.tex');
    expect(entries.filter((e) => e.severity === 'error')).toHaveLength(0);
  });

  it('simulated compile returns success=true and outputPdf', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: 'Output written.', stderr: '', timedOut: false });

    const result = await compile({
      binaryPath: '/usr/local/bin/tectonic',
      mainFile: path.join(fixtureDir, 'main.tex'),
      outputDirectory: 'out',
      workspaceRoot: fixtureDir,
      timeoutMs: 60000,
      offlineOnly: false,
    });

    expect(result.success).toBe(true);
    expect(result.outputPdf).toBe(path.join(fixtureDir, 'out', 'main.pdf'));
    expect(result.timedOut).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// error-missing-brace fixture
// ---------------------------------------------------------------------------
describe('fixture: error-missing-brace', () => {
  const fixtureDir = path.join(FIXTURES, 'error-missing-brace');

  it('fixture file exists', () => {
    expect(fs.existsSync(path.join(fixtureDir, 'main.tex'))).toBe(true);
  });

  it('fixture contains intentional syntax error (unclosed brace)', () => {
    const content = fs.readFileSync(path.join(fixtureDir, 'main.tex'), 'utf-8');
    // \textbf{World is intentionally not closed
    expect(content).toMatch(/\\textbf\{World\s*$/m);
  });

  it('resolves main.tex as the entry point', async () => {
    const result = await resolveMainFile({ workspaceRoot: fixtureDir, fs: realFs });
    expect(result).toBe(path.join(fixtureDir, 'main.tex'));
  });

  it('parseLog detects error from tectonic error output', () => {
    const errorLog = `! Missing } inserted.\n<inserted text>\n\t}\nl.4 \\end{document}`;
    const entries = parseLog(errorLog, 'main.tex');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].severity).toBe('error');
  });

  it('simulated compile returns success=false with error log entries', async () => {
    const stderr = `! Missing } inserted.\nl.4 \\end{document}`;
    mockRunProcess.mockResolvedValue({ exitCode: 1, stdout: '', stderr, timedOut: false });

    const result = await compile({
      binaryPath: '/usr/local/bin/tectonic',
      mainFile: path.join(fixtureDir, 'main.tex'),
      outputDirectory: 'out',
      workspaceRoot: fixtureDir,
      timeoutMs: 60000,
      offlineOnly: false,
    });

    expect(result.success).toBe(false);
    expect(result.outputPdf).toBeUndefined();
    expect(result.logs.some((e) => e.severity === 'error')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// multi-file fixture
// ---------------------------------------------------------------------------
describe('fixture: multi-file', () => {
  const fixtureDir = path.join(FIXTURES, 'multi-file');

  it('fixture files exist (main.tex and chapter1.tex)', () => {
    expect(fs.existsSync(path.join(fixtureDir, 'main.tex'))).toBe(true);
    expect(fs.existsSync(path.join(fixtureDir, 'chapter1.tex'))).toBe(true);
  });

  it('main.tex uses \\input to include chapter1', () => {
    const content = fs.readFileSync(path.join(fixtureDir, 'main.tex'), 'utf-8');
    expect(content).toContain('\\input{chapter1}');
  });

  it('resolves main.tex as entry point (not chapter1.tex)', async () => {
    const result = await resolveMainFile({ workspaceRoot: fixtureDir, fs: realFs });
    expect(result).toBe(path.join(fixtureDir, 'main.tex'));
  });

  it('resolves TEX root directive in chapter1.tex pointing to main.tex', async () => {
    // Simulate chapter1.tex having a % !TEX root = main.tex directive
    const chapterWithRoot = path.join(fixtureDir, 'chapter1.tex');
    const chapter1Content = fs.readFileSync(chapterWithRoot, 'utf-8');

    // Create an in-memory fs that adds the directive to chapter1
    const patchedFs = {
      exists: realFs.exists,
      findFiles: realFs.findFiles,
      readFile: async (p: string) => {
        if (p === chapterWithRoot) return `% !TEX root = main.tex\n${chapter1Content}`;
        return realFs.readFile(p);
      },
    };

    const result = await resolveMainFile({
      workspaceRoot: fixtureDir,
      openEditorFile: chapterWithRoot,
      fs: patchedFs,
    });
    expect(result).toBe(path.join(fixtureDir, 'main.tex'));
  });

  it('simulated multi-file compile succeeds', async () => {
    mockRunProcess.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });

    const result = await compile({
      binaryPath: '/usr/local/bin/tectonic',
      mainFile: path.join(fixtureDir, 'main.tex'),
      outputDirectory: 'out',
      workspaceRoot: fixtureDir,
      timeoutMs: 60000,
      offlineOnly: false,
    });

    expect(result.success).toBe(true);
    expect(result.outputPdf).toBe(path.join(fixtureDir, 'out', 'main.pdf'));
  });
});

// ---------------------------------------------------------------------------
// Example run: overfull hbox warning
// ---------------------------------------------------------------------------
describe('example run: overfull hbox warning parsing', () => {
  it('parses an overfull hbox warning from tectonic output', () => {
    const log = `Overfull \\hbox (5.00pt too wide) in paragraph at lines 12--13`;
    const entries = parseLog(log, 'main.tex');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].severity).toBe('warning');
    expect(entries[0].message).toContain('Overfull');
  });

  it('parses multiple errors and warnings from a realistic log', () => {
    const log = [
      `! LaTeX Error: File \`unknown.sty' not found.`,
      `l.3 \\usepackage{unknown}`,
      ``,
      `LaTeX Warning: Label \`fig:1' multiply defined.`,
      ``,
      `Overfull \\hbox (2.3pt too wide) in paragraph at lines 20--21`,
    ].join('\n');

    const entries = parseLog(log, 'main.tex');
    const errors = entries.filter((e) => e.severity === 'error');
    const warnings = entries.filter((e) => e.severity === 'warning');
    expect(errors.length).toBeGreaterThan(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
