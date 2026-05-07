import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isPathInside, validateWorkspaceOutputDirectory } from '../../core/workspaceSafety';

let tmpRoot: string | undefined;

function createWorkspacePair(): { root: string; outside: string } {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-one-click-safety-'));
  const root = path.join(tmpRoot, 'workspace');
  const outside = path.join(tmpRoot, 'outside');
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  return { root, outside };
}

function symlinkDirectory(target: string, linkPath: string): void {
  fs.symlinkSync(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

afterEach(() => {
  if (tmpRoot) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    tmpRoot = undefined;
  }
});

describe('workspaceSafety', () => {
  it('recognizes paths inside and outside a workspace', () => {
    expect(isPathInside('/workspace', '/workspace/out')).toBe(true);
    expect(isPathInside('/workspace', '/workspace')).toBe(true);
    expect(isPathInside('/workspace', '/workspace-other/out')).toBe(false);
    expect(isPathInside('/workspace', '/tmp/out')).toBe(false);
  });

  it('allows nested output directories', () => {
    expect(validateWorkspaceOutputDirectory('/workspace', '/workspace/out')).toBeUndefined();
    expect(validateWorkspaceOutputDirectory('/workspace', path.join('/workspace', 'build', '..', 'out'))).toBeUndefined();
  });

  it('blocks unsafe output directories for compile and clean flows', () => {
    expect(validateWorkspaceOutputDirectory('/workspace', '/workspace')).toContain('workspace root');
    expect(validateWorkspaceOutputDirectory('/workspace', path.parse('/workspace').root)).toContain('filesystem root');
    expect(validateWorkspaceOutputDirectory('/workspace', os.homedir())).toContain('home directory');
    expect(validateWorkspaceOutputDirectory('/workspace', '/tmp/out')).toContain('outside the workspace');
  });

  it('blocks existing output directories that are symlinks outside the workspace', () => {
    const { root, outside } = createWorkspacePair();
    const linkPath = path.join(root, 'out');
    symlinkDirectory(outside, linkPath);

    expect(validateWorkspaceOutputDirectory(root, linkPath)).toContain('outside the workspace');
  });

  it('blocks output directories below symlinked ancestors outside the workspace', () => {
    const { root, outside } = createWorkspacePair();
    const linkPath = path.join(root, 'linked');
    symlinkDirectory(outside, linkPath);

    expect(validateWorkspaceOutputDirectory(root, path.join(linkPath, 'nested'))).toContain('outside the workspace');
  });
});
