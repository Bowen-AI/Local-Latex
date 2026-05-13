import { describe, it, expect } from 'vitest';
import * as path from 'path';
import type { FileSystemOps } from '../../core/mainFileResolver';
import { detectEmptyBibliographyHint } from '../../core/bibliographyHints';

const ROOT = '/workspace';
const MAIN = path.join(ROOT, 'main.tex');
const BBL_MISSING_ITEM_LOG = "error: main.bbl:2: LaTeX Error: Something's wrong--perhaps a missing \\item.";

function makeFs(contents: Record<string, string>, foundFiles = Object.keys(contents)): FileSystemOps {
  return {
    exists: async (filePath) => contents[filePath] !== undefined,
    readFile: async (filePath) => {
      const content = contents[filePath];
      if (content === undefined) {
        throw new Error(`Missing file: ${filePath}`);
      }
      return content;
    },
    findFiles: async (root, pattern) => {
      if (root !== ROOT) {
        return [];
      }
      return foundFiles.filter((filePath) => pattern.test(filePath));
    },
  };
}

describe('bibliography hints', () => {
  it('points empty generated bibliography failures at the source bibliography command', async () => {
    const fs = makeFs({
      [MAIN]: [
        '\\documentclass{article}',
        '\\begin{document}',
        'No citations yet.',
        '\\bibliographystyle{IEEEtran}',
        '\\bibliography{bibliography}',
        '\\end{document}',
      ].join('\n'),
    });

    const hint = await detectEmptyBibliographyHint({
      workspaceRoot: ROOT,
      mainFile: MAIN,
      output: BBL_MISSING_ITEM_LOG,
      fs,
    });

    expect(hint).toMatchObject({
      file: 'main.tex',
      line: 5,
      severity: 'error',
    });
    expect(hint?.message).toContain('\\cite{key}');
    expect(hint?.message).toContain('\\nocite{*}');
  });

  it('ignores commented citations when detecting an empty bibliography', async () => {
    const fs = makeFs({
      [MAIN]: [
        '\\documentclass{article}',
        '\\begin{document}',
        '% \\cite{placeholder}',
        '\\bibliography{bibliography}',
        '\\end{document}',
      ].join('\n'),
    });

    const hint = await detectEmptyBibliographyHint({
      workspaceRoot: ROOT,
      mainFile: MAIN,
      output: BBL_MISSING_ITEM_LOG,
      fs,
    });

    expect(hint).toBeDefined();
  });

  it('does not add a no-citation hint when the workspace has citations', async () => {
    const section = path.join(ROOT, 'sections', 'intro.tex');
    const fs = makeFs({
      [MAIN]: [
        '\\documentclass{article}',
        '\\begin{document}',
        '\\input{sections/intro}',
        '\\bibliography{bibliography}',
        '\\end{document}',
      ].join('\n'),
      [section]: 'Important prior work \\cite{10684546}.',
    });

    const hint = await detectEmptyBibliographyHint({
      workspaceRoot: ROOT,
      mainFile: MAIN,
      output: BBL_MISSING_ITEM_LOG,
      fs,
    });

    expect(hint).toBeUndefined();
  });

  it('does not add a no-citation hint when nocite is present', async () => {
    const fs = makeFs({
      [MAIN]: [
        '\\documentclass{article}',
        '\\begin{document}',
        '\\nocite{*}',
        '\\bibliography{bibliography}',
        '\\end{document}',
      ].join('\n'),
    });

    const hint = await detectEmptyBibliographyHint({
      workspaceRoot: ROOT,
      mainFile: MAIN,
      output: BBL_MISSING_ITEM_LOG,
      fs,
    });

    expect(hint).toBeUndefined();
  });

  it('ignores unrelated compile failures', async () => {
    const fs = makeFs({
      [MAIN]: '\\documentclass{article}\n\\begin{document}\n\\bibliography{bibliography}\n\\end{document}',
    });

    const hint = await detectEmptyBibliographyHint({
      workspaceRoot: ROOT,
      mainFile: MAIN,
      output: '! Undefined control sequence.',
      fs,
    });

    expect(hint).toBeUndefined();
  });
});
