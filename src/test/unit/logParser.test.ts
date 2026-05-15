import { describe, it, expect } from 'vitest';
import { parseLog } from '../../core/logParser';

describe('logParser', () => {
  it('parses a LaTeX error', () => {
    const log = `! LaTeX Error: File \`missing.sty' not found.\nl.5 \\usepackage{missing}`;
    const entries = parseLog(log, 'main.tex');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].severity).toBe('error');
    expect(entries[0].message).toContain('LaTeX Error');
    expect(entries[0].line).toBe(5);
  });

  it('parses a LaTeX warning', () => {
    const log = `LaTeX Warning: Label \`fig:1' multiply defined on input line 12.`;
    const entries = parseLog(log, 'main.tex');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].severity).toBe('warning');
    expect(entries[0].line).toBe(12);
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

  it('keeps the box type for underfull vbox diagnostics', () => {
    const log = `Underfull \\vbox (badness 10000) has occurred while \\output is active at lines 7--8`;
    const entries = parseLog(log, 'main.tex');

    expect(entries[0]).toMatchObject({
      severity: 'warning',
      line: 7,
      message: 'Underfull \\vbox (badness 10000) has occurred while \\output is active',
    });
  });

  it('parses Tectonic file diagnostics', () => {
    const log = `error: main.bbl:2: LaTeX Error: Something's wrong--perhaps a missing \\item.`;
    const entries = parseLog(log, 'main.tex');

    expect(entries[0]).toMatchObject({
      file: 'main.bbl',
      line: 2,
      severity: 'error',
      message: "LaTeX Error: Something's wrong--perhaps a missing \\item.",
    });
  });

  it('parses Tectonic caused-by diagnostics', () => {
    const log = `error: halted on potentially-recoverable error as specified\ncaused by: sections/intro.tex:15: Undefined control sequence.`;
    const entries = parseLog(log, 'main.tex');

    const causedBy = entries.find((entry) => entry.file === 'sections/intro.tex');
    expect(causedBy).toMatchObject({
      file: 'sections/intro.tex',
      line: 15,
      severity: 'error',
      message: 'Undefined control sequence.',
    });
  });

  it('attributes errors to the most recently opened file via paren stack', () => {
    const log = [
      'This is pdfTeX',
      '(./main.tex',
      'LaTeX2e <2024-10-30>',
      '(./article.cls',
      'Document Class: article',
      ')',
      '(./chapters/intro.tex',
      '! Undefined control sequence.',
      'l.42 \\unknowncommand',
      '))',
    ].join('\n');

    const entries = parseLog(log, 'main.tex');
    expect(entries[0]).toMatchObject({
      file: './chapters/intro.tex',
      line: 42,
      severity: 'error',
    });
  });

  it('parses package errors with their package name', () => {
    const log = `! Package amsmath Error: \\begin{align*} allowed only in paragraph mode.\nl.7 \\begin{align*}`;
    const entries = parseLog(log, 'main.tex');
    expect(entries[0]).toMatchObject({
      severity: 'error',
      line: 7,
    });
    expect(entries[0].message).toContain('Package amsmath');
  });

  it('parses package warnings with line numbers', () => {
    const log = `Package hyperref Warning: Token not allowed in a PDF string (Unicode): on input line 23.`;
    const entries = parseLog(log, 'main.tex');
    expect(entries[0]).toMatchObject({
      severity: 'warning',
      line: 23,
    });
    expect(entries[0].message).toContain('Package hyperref');
  });

  it('dedupes identical entries', () => {
    const log = [
      '! Undefined control sequence.',
      'l.5 \\foo',
      '',
      '! Undefined control sequence.',
      'l.5 \\foo',
    ].join('\n');
    const entries = parseLog(log, 'main.tex');
    expect(entries).toHaveLength(1);
  });

  it('does not push closed sibling files onto the stack', () => {
    const log = [
      '(./main.tex',
      '(./a.sty)',
      '(./b.sty)',
      '! Undefined control sequence.',
      'l.99 \\bad',
      ')',
    ].join('\n');
    const entries = parseLog(log, 'main.tex');
    expect(entries[0].file).toBe('./main.tex');
    expect(entries[0].line).toBe(99);
  });
});
