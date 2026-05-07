import * as path from 'path';
import { isPathInside } from './workspaceSafety';

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

function toWorkspaceTexPath(workspaceRoot: string, filePath: string): string | undefined {
  const resolved = path.resolve(filePath);
  if (!TEX_FILE_REGEX.test(resolved)) {
    return undefined;
  }
  if (!isPathInside(workspaceRoot, resolved)) {
    return undefined;
  }
  return resolved;
}

function cleanTexRootValue(value: string): string {
  return value
    .replace(/\s+%.*$/, '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

async function parseTexRootDirective(
  filePath: string,
  fs: FileSystemOps
): Promise<string | undefined> {
  try {
    const content = await fs.readFile(filePath);
    const match = TEX_ROOT_REGEX.exec(content);
    if (match) {
      return cleanTexRootValue(match[1]);
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
      : path.resolve(workspaceRoot, settingMainFile);
    const candidate = toWorkspaceTexPath(workspaceRoot, abs);
    if (candidate && await fs.exists(candidate)) {
      return candidate;
    }
  }

  // 2. TEX root directive from currently open file
  const workspaceEditorFile = openEditorFile
    ? toWorkspaceTexPath(workspaceRoot, openEditorFile)
    : undefined;
  if (workspaceEditorFile) {
    const root = await parseTexRootDirective(workspaceEditorFile, fs);
    if (root) {
      const abs = path.isAbsolute(root) ? root : path.resolve(path.dirname(workspaceEditorFile), root);
      const candidate = toWorkspaceTexPath(workspaceRoot, abs);
      if (candidate && await fs.exists(candidate)) {
        return candidate;
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
  if (workspaceEditorFile && await fs.exists(workspaceEditorFile)) {
    return workspaceEditorFile;
  }

  // 6. Single .tex file in workspace
  const rootTex = allTex.filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`));
  if (rootTex.length === 1) {
    return rootTex[0];
  }

  return undefined;
}
