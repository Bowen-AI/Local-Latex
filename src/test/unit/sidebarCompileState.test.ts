import { describe, expect, it } from 'vitest';
import {
  SIDEBAR_LOG_MAX_LINE_LENGTH,
  SIDEBAR_LOG_MAX_LINES,
  splitClippedLogLines,
} from '../../sidebar/compileLogLines';

describe('sidebar compile log helpers', () => {
  it('splits on newlines and normalizes CRLF', () => {
    expect(splitClippedLogLines('a\r\nb\nc', 10, 100)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the last maxLines when over limit', () => {
    const lines = Array.from({ length: SIDEBAR_LOG_MAX_LINES + 5 }, (_, i) => `L${i}`);
    const input = lines.join('\n');
    const out = splitClippedLogLines(input);
    expect(out).toHaveLength(SIDEBAR_LOG_MAX_LINES);
    expect(out[0]).toBe('L5');
    expect(out[out.length - 1]).toBe(`L${lines.length - 1}`);
  });

  it('truncates long lines with ellipsis marker', () => {
    const long = 'x'.repeat(SIDEBAR_LOG_MAX_LINE_LENGTH + 10);
    const out = splitClippedLogLines(long, 10, SIDEBAR_LOG_MAX_LINE_LENGTH);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(SIDEBAR_LOG_MAX_LINE_LENGTH + 1);
    expect(out[0].endsWith('…')).toBe(true);
  });
});
