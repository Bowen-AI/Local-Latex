import { describe, it, expect } from 'vitest';
import { resolveMainFile, FileSystemOps } from '../../core/mainFileResolver';
import * as path from 'path';

function makeFs(
  existingFiles: string[],
  fileContents: Record<string, string> = {},
  dirFiles: Record<string, string[]> = {},
  realpaths?: Record<string, string | undefined>
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
    realpath: realpaths
      ? async (p) => realpaths[p]
      : undefined,
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

  it('ignores configured main files that resolve outside the workspace through symlinks', async () => {
    const linkedFile = path.join(ROOT, 'linked.tex');
    const outsideFile = path.join('/outside', 'linked.tex');
    const fallback = path.join(ROOT, 'main.tex');
    const fs = makeFs(
      [linkedFile, fallback],
      {},
      {},
      {
        [ROOT]: ROOT,
        [linkedFile]: outsideFile,
        [fallback]: fallback,
      }
    );

    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      settingMainFile: 'linked.tex',
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

  it('returns configured mixed-case TeX files', async () => {
    const mainFile = path.join(ROOT, 'Paper.TeX');
    const fs = makeFs([mainFile]);

    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      settingMainFile: 'Paper.TeX',
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

  it('ignores TEX root directives that resolve outside the workspace through symlinks', async () => {
    const editorFile = path.join(ROOT, 'sections', 'chapter1.tex');
    const linkedRoot = path.join(ROOT, 'linked-main.tex');
    const outsideFile = path.join('/outside', 'main.tex');
    const fs = makeFs(
      [editorFile, linkedRoot],
      { [editorFile]: '% !TEX root = ../linked-main.tex\n\\section{Ch1}' },
      {},
      {
        [ROOT]: ROOT,
        [editorFile]: editorFile,
        [linkedRoot]: outsideFile,
      }
    );

    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      openEditorFile: editorFile,
      fs,
    });

    expect(result).toBe(editorFile);
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

  it('ignores active editors that resolve outside the workspace through symlinks', async () => {
    const linkedEditor = path.join(ROOT, 'chapter.tex');
    const outsideFile = path.join('/outside', 'chapter.tex');
    const fallback = path.join(ROOT, 'main.tex');
    const fs = makeFs(
      [linkedEditor, fallback],
      { [linkedEditor]: '\\section{Standalone}' },
      {},
      {
        [ROOT]: ROOT,
        [linkedEditor]: outsideFile,
        [fallback]: fallback,
      }
    );

    const result = await resolveMainFile({
      workspaceRoot: ROOT,
      openEditorFile: linkedEditor,
      fs,
    });

    expect(result).toBe(fallback);
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

  it('ignores discovered main files that resolve outside the workspace through symlinks', async () => {
    const linkedMain = path.join(ROOT, 'paper', 'main.tex');
    const outsideFile = path.join('/outside', 'main.tex');
    const fs = makeFs(
      [linkedMain],
      {},
      { [ROOT]: [linkedMain] },
      {
        [ROOT]: ROOT,
        [linkedMain]: outsideFile,
      }
    );

    const result = await resolveMainFile({ workspaceRoot: ROOT, fs });

    expect(result).toBeUndefined();
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

  it('returns current editor mixed-case TeX file when there is no main file', async () => {
    const editorFile = path.join(ROOT, 'Appendix.TEX');
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
