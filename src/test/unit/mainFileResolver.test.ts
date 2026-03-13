import { describe, it, expect } from 'vitest';
import { resolveMainFile, FileSystemOps } from '../../core/mainFileResolver';
import * as path from 'path';

function makeFs(
  existingFiles: string[],
  fileContents: Record<string, string> = {},
  dirFiles: Record<string, string[]> = {}
): FileSystemOps {
  return {
    exists: async (p) => existingFiles.includes(p),
    readFile: async (p) => {
      if (fileContents[p] !== undefined) return fileContents[p];
      throw new Error(`File not found: ${p}`);
    },
    findFiles: async (root, pattern) => {
      const files = dirFiles[root] ?? [];
      return files.filter((f) => pattern.test(f));
    },
  };
}

const ROOT = '/workspace';

describe('mainFileResolver', () => {
  it('returns setting mainFile if it exists', async () => {
    const mainFile = path.join(ROOT, 'thesis.tex');
    const fs = makeFs([mainFile]);
    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      settingMainFile: 'thesis.tex',
      fs,
    });
    expect(result).toBe(mainFile);
  });

  it('returns main.tex if it exists and no setting', async () => {
    const mainFile = path.join(ROOT, 'main.tex');
    const fs = makeFs([mainFile]);
    const result = await resolveMainFile({ workspaceRoot: ROOT, fs });
    expect(result).toBe(mainFile);
  });

  it('returns undefined if nothing found', async () => {
    const fs = makeFs([]);
    const result = await resolveMainFile({ workspaceRoot: ROOT, fs });
    expect(result).toBeUndefined();
  });

  it('resolves TEX root directive from open editor file', async () => {
    const editorFile = path.join(ROOT, 'chapter1.tex');
    const rootFile = path.join(ROOT, 'main.tex');
    const fs = makeFs(
      [editorFile, rootFile],
      { [editorFile]: '% !TEX root = main.tex\n\\section{Ch1}' }
    );
    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      openEditorFile: editorFile,
      fs,
    });
    expect(result).toBe(rootFile);
  });

  it('returns single .tex file if only one in root', async () => {
    const singleFile = path.join(ROOT, 'document.tex');
    const fs = makeFs(
      [singleFile],
      {},
      { [ROOT]: [singleFile] }
    );
    const result = await resolveMainFile({ workspaceRoot: ROOT, fs });
    expect(result).toBe(singleFile);
  });
});
