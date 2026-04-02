import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getBundleCacheDir, ensureBundleCacheDir } from '../../runtime/bundleManager';

let tmpStorage: string;

beforeAll(() => {
  tmpStorage = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-manager-test-'));
});

afterAll(() => {
  fs.rmSync(tmpStorage, { recursive: true, force: true });
});

describe('bundleManager', () => {
  it('getBundleCacheDir returns storagePath/bundle-cache', () => {
    expect(getBundleCacheDir(tmpStorage)).toBe(path.join(tmpStorage, 'bundle-cache'));
  });

  it('ensureBundleCacheDir creates the directory if it does not exist', () => {
    const dir = ensureBundleCacheDir(tmpStorage);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('ensureBundleCacheDir returns the bundle cache directory path', () => {
    const dir = ensureBundleCacheDir(tmpStorage);
    expect(dir).toBe(path.join(tmpStorage, 'bundle-cache'));
  });

  it('ensureBundleCacheDir is idempotent (safe to call multiple times)', () => {
    expect(() => ensureBundleCacheDir(tmpStorage)).not.toThrow();
    expect(() => ensureBundleCacheDir(tmpStorage)).not.toThrow();
    expect(fs.existsSync(getBundleCacheDir(tmpStorage))).toBe(true);
  });

  it('getBundleCacheDir uses the provided storage path', () => {
    const custom = '/some/other/path';
    expect(getBundleCacheDir(custom)).toBe(path.join(custom, 'bundle-cache'));
  });
});
