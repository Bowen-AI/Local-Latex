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

  it('ignores configured main files outside the workspace', async () => {
    const outsideFile = path.join(ROOT, '..', 'outside.tex');
    const fallback = path.join(ROOT, 'main.tex');
    const fs = makeFs([outsideFile, fallback]);

    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      settingMainFile: outsideFile,
      fs,
    });

    expect(result).toBe(fallback);
  });

  it('ignores configured main files that are not TeX documents', async () => {
    const readme = path.join(ROOT, 'README.md');
    const fallback = path.join(ROOT, 'main.tex');
    const fs = makeFs([readme, fallback]);

    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      settingMainFile: 'README.md',
      fs,
    });

    expect(result).toBe(fallback);
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

  it('resolves quoted TEX root directive with trailing comments', async () => {
    const editorFile = path.join(ROOT, 'sections', 'chapter1.tex');
    const rootFile = path.join(ROOT, 'main.tex');
    const fs = makeFs(
      [editorFile, rootFile],
      { [editorFile]: '% !TEX root = "../main.tex" % editor metadata\n\\section{Ch1}' }
    );

    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      openEditorFile: editorFile,
      fs,
    });

    expect(result).toBe(rootFile);
  });

  it('does not follow TEX root directives outside the workspace', async () => {
    const editorFile = path.join(ROOT, 'sections', 'chapter1.tex');
    const outsideFile = path.join(ROOT, '..', 'outside.tex');
    const fs = makeFs(
      [editorFile, outsideFile],
      { [editorFile]: '% !TEX root = ../../outside.tex\n\\section{Ch1}' }
    );

    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      openEditorFile: editorFile,
      fs,
    });

    expect(result).toBe(editorFile);
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

  it('returns nested main.tex if workspace root has no main.tex', async () => {
    const nestedMain = path.join(ROOT, 'paper', 'main.tex');
    const fs = makeFs(
      [nestedMain],
      {},
      { [ROOT]: [nestedMain] }
    );

    const result = await resolveMainFile({ workspaceRoot: ROOT, fs });
    expect(result).toBe(nestedMain);
  });

  it('returns current editor .tex file when there is no main file', async () => {
    const editorFile = path.join(ROOT, 'chapter.tex');
    const fs = makeFs(
      [editorFile],
      { [editorFile]: '\\section{Standalone}' },
      { [ROOT]: [editorFile, path.join(ROOT, 'notes.tex')] }
    );

    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      openEditorFile: editorFile,
      fs,
    });

    expect(result).toBe(editorFile);
  });
});
