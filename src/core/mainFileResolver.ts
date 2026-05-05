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
const TEX_FILE_REGEX = /\.tex$/i;

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

  // 4. main.tex anywhere in the workspace
  const allTex = await fs.findFiles(workspaceRoot, TEX_FILE_REGEX);
  const nestedMainTex = allTex.find((file) => path.basename(file).toLowerCase() === 'main.tex');
  if (nestedMainTex) {
    return nestedMainTex;
  }

  // 5. Current editor if it is a .tex file
  if (openEditorFile && TEX_FILE_REGEX.test(openEditorFile) && await fs.exists(openEditorFile)) {
    return openEditorFile;
  }

  // 6. Single .tex file in workspace
  const rootTex = allTex.filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`));
  if (rootTex.length === 1) {
    return rootTex[0];
  }

  return undefined;
}
