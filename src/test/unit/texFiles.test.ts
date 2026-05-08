import { describe, expect, it } from 'vitest';
import { isTexFile, TEX_FILE_GLOB } from '../../core/texFiles';

describe('texFiles', () => {
  it('recognizes TeX files case-insensitively', () => {
    expect(isTexFile('/workspace/main.tex')).toBe(true);
    expect(isTexFile('/workspace/Paper.TEX')).toBe(true);
    expect(isTexFile('/workspace/Chapter.TeX')).toBe(true);
    expect(isTexFile('/workspace/not-tex.txt')).toBe(false);
  });

  it('uses a VS Code glob that matches mixed-case TeX extensions', () => {
    expect(TEX_FILE_GLOB).toBe('**/*.[tT][eE][xX]');
  });
});
