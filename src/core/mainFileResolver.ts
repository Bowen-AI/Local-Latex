import * as path from 'path';
import { isPathInside } from './workspaceSafety';
import { isTexFile, TEX_FILE_REGEX } from './texFiles';

export interface FileSystemOps {
  exists(filePath: string): Promise<boolean>;
  readFile(filePath: string): Promise<string>;
  findFiles(root: string, pattern: RegExp): Promise<string[]>;
  realpath?(filePath: string): Promise<string | undefined>;
}

export interface ResolveOptions {
  workspaceRoot: string;
  settingMainFile?: string;
  openEditorFile?: string;
  fs: FileSystemOps;
}

const TEX_ROOT_REGEX = /^%\s*!TEX\s+root\s*=\s*(.+)$/im;

async function realpathIfAvailable(
  fs: FileSystemOps,
  filePath: string
): Promise<string | undefined> {
  try {
    return await fs.realpath?.(filePath);
  } catch {
    return undefined;
  }
}

async function toWorkspaceTexPath(
  workspaceRoot: string,
  filePath: string,
  fs: FileSystemOps
): Promise<string | undefined> {
  const resolved = path.resolve(filePath);
  if (!isTexFile(resolved)) {
    return undefined;
  }
  if (!isPathInside(workspaceRoot, resolved)) {
    return undefined;
  }

  if (!fs.realpath) {
    return resolved;
  }

  const exists = await fs.exists(resolved);
  if (!exists) {
    return resolved;
  }

  const realCandidate = await realpathIfAvailable(fs, resolved);
  if (!realCandidate) {
    return undefined;
  }

  const realWorkspace = await realpathIfAvailable(fs, workspaceRoot);
  const comparisonRoot = realWorkspace ?? path.resolve(workspaceRoot);
  if (!isPathInside(comparisonRoot, realCandidate)) {
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
    const candidate = await toWorkspaceTexPath(workspaceRoot, abs, fs);
    if (candidate && await fs.exists(candidate)) {
      return candidate;
    }
  }

  // 2. TEX root directive from currently open file
  const workspaceEditorFile = openEditorFile
    ? await toWorkspaceTexPath(workspaceRoot, openEditorFile, fs)
    : undefined;
  if (workspaceEditorFile) {
    const root = await parseTexRootDirective(workspaceEditorFile, fs);
    if (root) {
      const abs = path.isAbsolute(root) ? root : path.resolve(path.dirname(workspaceEditorFile), root);
      const candidate = await toWorkspaceTexPath(workspaceRoot, abs, fs);
      if (candidate && await fs.exists(candidate)) {
        return candidate;
      }
    }
  }

  // 3. main.tex in workspace root
  const mainTex = await toWorkspaceTexPath(workspaceRoot, path.join(workspaceRoot, 'main.tex'), fs);
  if (mainTex && await fs.exists(mainTex)) {
    return mainTex;
  }

  // 4. main.tex anywhere in the workspace
  const foundTex = await fs.findFiles(workspaceRoot, TEX_FILE_REGEX);
  const allTex: string[] = [];
  for (const file of foundTex) {
    const candidate = await toWorkspaceTexPath(workspaceRoot, file, fs);
    if (candidate) {
      allTex.push(candidate);
    }
  }

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
