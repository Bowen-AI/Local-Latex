import * as path from 'path';

export interface FileSystemOps {
  exists(filePath: string): Promise<boolean>;
  readFile(filePath: string): Promise<string>;
  findFiles(root: string, pattern: RegExp): Promise<string[]>;
}

export interface ResolveOptions {
  workspaceRoot: string;
  settingMainFile?: string;
  openEditorFile?: string;
  fs: FileSystemOps;
}

const TEX_ROOT_REGEX = /^%\s*!TEX\s+root\s*=\s*(.+)$/im;

async function parseTexRootDirective(
  filePath: string,
  fs: FileSystemOps
): Promise<string | undefined> {
  try {
    const content = await fs.readFile(filePath);
    const match = TEX_ROOT_REGEX.exec(content);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // ignore
  }
  return undefined;
}

export async function resolveMainFile(options: ResolveOptions): Promise<string | undefined> {
  const { workspaceRoot, settingMainFile, openEditorFile, fs } = options;

  // 1. User setting
  if (settingMainFile) {
    const abs = path.isAbsolute(settingMainFile)
      ? settingMainFile
      : path.join(workspaceRoot, settingMainFile);
    if (await fs.exists(abs)) {
      return abs;
    }
  }

  // 2. TEX root directive from currently open file
  if (openEditorFile) {
    const root = await parseTexRootDirective(openEditorFile, fs);
    if (root) {
      const abs = path.isAbsolute(root) ? root : path.join(path.dirname(openEditorFile), root);
      if (await fs.exists(abs)) {
        return abs;
      }
    }
  }

  // 3. main.tex in workspace root
  const mainTex = path.join(workspaceRoot, 'main.tex');
  if (await fs.exists(mainTex)) {
    return mainTex;
  }

  // 4. Single .tex file in workspace root
  const allTex = await fs.findFiles(workspaceRoot, /\.tex$/);
  const rootTex = allTex.filter((f) => path.dirname(f) === workspaceRoot);
  if (rootTex.length === 1) {
    return rootTex[0];
  }

  return undefined;
}
