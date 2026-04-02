import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import { getRuntimeDir, getBinaryName, getBinaryPath, getManifestPath, TECTONIC_VERSION } from '../../runtime/paths';

const STORAGE = '/home/user/.vscode/extensions/latex-one-click';

describe('runtime/paths', () => {
  it('TECTONIC_VERSION is a semver string', () => {
    expect(TECTONIC_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('getRuntimeDir returns storagePath/runtime', () => {
    expect(getRuntimeDir(STORAGE)).toBe(path.join(STORAGE, 'runtime'));
  });

  it('getBinaryName returns tectonic on non-windows', () => {
    if (os.platform() !== 'win32') {
      expect(getBinaryName()).toBe('tectonic');
    }
  });

  it('getBinaryName returns tectonic.exe on windows', () => {
    if (os.platform() === 'win32') {
      expect(getBinaryName()).toBe('tectonic.exe');
    }
  });

  it('getBinaryPath returns the correct path to the binary', () => {
    const expected = path.join(STORAGE, 'runtime', getBinaryName());
    expect(getBinaryPath(STORAGE)).toBe(expected);
  });

  it('getManifestPath returns storagePath/runtime/manifest.json', () => {
    expect(getManifestPath(STORAGE)).toBe(path.join(STORAGE, 'runtime', 'manifest.json'));
  });

  it('getRuntimeDir uses the provided storage path', () => {
    const custom = '/tmp/custom-storage';
    expect(getRuntimeDir(custom)).toBe(path.join(custom, 'runtime'));
  });
});
