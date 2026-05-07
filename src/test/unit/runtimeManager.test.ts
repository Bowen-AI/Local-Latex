import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RuntimeManager, getZipExtractionCommand, loadRuntimeManifest } from '../../runtime/runtimeManager';
import { getBinaryPath, getManifestPath, getRuntimeDir, TECTONIC_VERSION } from '../../runtime/paths';
import { getPlatformId, SUPPORTED_PLATFORMS } from '../../runtime/platform';

let tmpDir: string | undefined;

function createStorage(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-one-click-runtime-'));
  fs.mkdirSync(getRuntimeDir(tmpDir), { recursive: true });
  return tmpDir;
}

function writeBinary(storagePath: string): void {
  const binaryPath = getBinaryPath(storagePath);
  fs.writeFileSync(binaryPath, 'runtime');
  if (process.platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }
}

function writeInstalledManifest(
  storagePath: string,
  overrides: Partial<{
    version: string;
    platform: string;
    sha256: string;
    binary: string;
  }> = {}
): void {
  const manifest = loadRuntimeManifest();
  const platformId = getPlatformId();
  const entry = manifest.platforms[platformId];

  fs.writeFileSync(
    getManifestPath(storagePath),
    JSON.stringify(
      {
        version: manifest.version,
        platform: platformId,
        sha256: entry.sha256,
        binary: entry.binary,
        ...overrides,
      },
      null,
      2
    )
  );
}

afterEach(() => {
  if (tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

describe('RuntimeManager', () => {
  it('keeps the bundled runtime manifest aligned with supported platforms', () => {
    const manifest = loadRuntimeManifest();

    expect(manifest.version).toBe(TECTONIC_VERSION);
    expect(Object.keys(manifest.platforms).sort()).toEqual([...SUPPORTED_PLATFORMS].sort());

    for (const [platformId, entry] of Object.entries(manifest.platforms)) {
      expect(entry.url).toContain(manifest.version);
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.sha256).not.toContain('PLACEHOLDER');
      expect(entry.binary).toMatch(platformId.startsWith('windows') ? /^tectonic\.exe$/ : /^tectonic$/);
    }
  });

  it('uses PowerShell to extract Windows zip runtimes', () => {
    const command = getZipExtractionCommand('C:\\runtime.zip', 'C:\\runtime', 'win32');

    expect(command.command).toBe('powershell.exe');
    expect(command.args).toContain('Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force');
    expect(command.args).toContain('C:\\runtime.zip');
    expect(command.args).toContain('C:\\runtime');
  });

  it('uses unzip to extract zip runtimes on Unix platforms', () => {
    expect(getZipExtractionCommand('/tmp/runtime.zip', '/tmp/runtime', 'darwin')).toEqual({
      command: 'unzip',
      args: ['-o', '/tmp/runtime.zip', '-d', '/tmp/runtime'],
    });
  });

  it('does not treat a bare binary as ready without installed manifest metadata', async () => {
    const storagePath = createStorage();
    writeBinary(storagePath);

    await expect(new RuntimeManager({ storagePath }).isReady()).resolves.toBe(false);
  });

  it('treats a binary as ready when installed metadata matches the bundled manifest', async () => {
    const storagePath = createStorage();
    writeBinary(storagePath);
    writeInstalledManifest(storagePath);

    await expect(new RuntimeManager({ storagePath }).isReady()).resolves.toBe(true);
  });

  it('requires installed runtime metadata to match the bundled manifest version', async () => {
    const storagePath = createStorage();
    writeBinary(storagePath);
    writeInstalledManifest(storagePath, { version: '0.0.0' });

    await expect(new RuntimeManager({ storagePath }).isReady()).resolves.toBe(false);
  });

  it('requires the runtime binary to be executable on Unix platforms', async () => {
    if (process.platform === 'win32') {
      return;
    }

    const storagePath = createStorage();
    const binaryPath = getBinaryPath(storagePath);
    fs.writeFileSync(binaryPath, 'runtime');
    fs.chmodSync(binaryPath, 0o644);
    writeInstalledManifest(storagePath);

    await expect(new RuntimeManager({ storagePath }).isReady()).resolves.toBe(false);
  });
});
