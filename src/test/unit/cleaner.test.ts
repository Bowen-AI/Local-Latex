import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { cleanOutputDirectory, validateCleanTarget } from '../../core/cleaner';

let tmpRoot: string | undefined;

function createWorkspace(): string {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-one-click-clean-'));
  return tmpRoot;
}

function createWorkspacePair(): { root: string; outside: string } {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-one-click-clean-'));
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

describe('cleaner', () => {
  it('removes entries from a workspace output directory', () => {
    const root = createWorkspace();
    const outDir = path.join(root, 'out');
    fs.mkdirSync(path.join(outDir, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(outDir, 'main.pdf'), 'pdf');
    fs.writeFileSync(path.join(outDir, 'nested', 'main.aux'), 'aux');

    const result = cleanOutputDirectory(root, outDir);

    expect(result).toEqual({ removed: 2, missing: false });
    expect(fs.readdirSync(outDir)).toHaveLength(0);
  });

  it('reports missing output directories without creating them', () => {
    const root = createWorkspace();
    const outDir = path.join(root, 'out');

    expect(cleanOutputDirectory(root, outDir)).toEqual({ removed: 0, missing: true });
    expect(fs.existsSync(outDir)).toBe(false);
  });

  it('blocks unsafe clean targets', () => {
    const root = createWorkspace();

    expect(validateCleanTarget(root, root)).toContain('workspace root');
    expect(validateCleanTarget(root, path.parse(root).root)).toContain('filesystem root');
    expect(validateCleanTarget(root, os.homedir())).toContain('home directory');
    expect(validateCleanTarget(root, path.join(root, '..', 'outside'))).toContain('outside the workspace');
  });

  it('does not clean through a symlink that points outside the workspace', () => {
    const { root, outside } = createWorkspacePair();
    const linkPath = path.join(root, 'out');
    const outsideFile = path.join(outside, 'main.pdf');
    fs.writeFileSync(outsideFile, 'pdf');
    symlinkDirectory(outside, linkPath);

    const result = cleanOutputDirectory(root, linkPath);

    expect(result.blockedReason).toContain('outside the workspace');
    expect(fs.existsSync(outsideFile)).toBe(true);
  });
});
