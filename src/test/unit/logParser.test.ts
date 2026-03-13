import { describe, it, expect } from 'vitest';
import { parseLog } from '../../core/logParser';

describe('logParser', () => {
  it('parses a LaTeX error', () => {
    const log = `! LaTeX Error: File \`missing.sty' not found.\nl.5 \\usepackage{missing}`;
    const entries = parseLog(log, 'main.tex');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].severity).toBe('error');
    expect(entries[0].message).toContain('LaTeX Error');
  });

  it('parses a LaTeX warning', () => {
    const log = `LaTeX Warning: Label \`fig:1' multiply defined.`;
    const entries = parseLog(log, 'main.tex');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].severity).toBe('warning');
  });

  it('returns empty array for clean output', () => {
    const log = `This is pdfTeX, Version 3.141592653\n(./main.tex\n) [1]\nOutput written to main.pdf`;
    const entries = parseLog(log);
    expect(entries).toHaveLength(0);
  });

  it('sets default file when no file is specified', () => {
    const log = `! Missing } inserted.\nl.10 }`;
    const entries = parseLog(log, 'custom.tex');
    expect(entries[0].file).toBe('custom.tex');
  });

  it('parses line number from error', () => {
    const log = `! Undefined control sequence.\nl.42 \\unknowncommand`;
    const entries = parseLog(log, 'main.tex');
    expect(entries[0].line).toBe(42);
  });
});
