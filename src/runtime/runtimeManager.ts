import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { getPlatformId } from './platform';
import { getBinaryPath, getManifestPath, getRuntimeDir } from './paths';
import { verifyChecksum } from './checksum';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const MAX_DOWNLOAD_REDIRECTS = 5;

export interface PlatformManifestEntry {
  url: string;
  sha256: string;
  binary: string;
}

export interface RuntimeManifest {
  version: string;
  releaseDate: string;
  platforms: Record<string, PlatformManifestEntry>;
}

interface InstalledRuntimeManifest {
  version: string;
  platform: string;
  sha256: string;
  binary: string;
}

export function loadRuntimeManifest(): RuntimeManifest {
  const manifestPath = path.join(__dirname, '..', '..', 'resources', 'runtime-manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw) as RuntimeManifest;
}

function readInstalledManifest(storagePath: string): InstalledRuntimeManifest | undefined {
  const manifestPath = getManifestPath(storagePath);
  if (!fs.existsSync(manifestPath)) {
    return undefined;
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw) as InstalledRuntimeManifest;
  } catch {
    return undefined;
  }
}

function writeInstalledManifest(storagePath: string, manifest: InstalledRuntimeManifest): void {
  fs.writeFileSync(getManifestPath(storagePath), JSON.stringify(manifest, null, 2));
}

function downloadFile(url: string, dest: string, redirects = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let file: fs.WriteStream | undefined;

    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      file?.destroy();
      fs.rmSync(dest, { force: true });
      reject(error);
    };

    https.get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
        const location = response.headers.location;
        response.resume();
        if (!location) {
          fail(new Error('Redirect with no location'));
          return;
        }
        if (redirects >= MAX_DOWNLOAD_REDIRECTS) {
          fail(new Error('Too many redirects while downloading runtime'));
          return;
        }

        const nextUrl = new URL(location, url).toString();
        downloadFile(nextUrl, dest, redirects + 1).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        fail(new Error(`HTTP ${response.statusCode ?? 'unknown'}`));
        return;
      }
      file = fs.createWriteStream(dest);
      response.on('error', fail);
      response.pipe(file);
      file.on('finish', () => {
        if (settled) return;
        settled = true;
        file?.close(() => resolve());
      });
      file.on('error', fail);
    }).on('error', fail);
  });
}

async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  await execFileAsync('tar', ['-xzf', archivePath, '-C', destDir]);
}

export interface ExtractionCommand {
  command: string;
  args: string[];
}

export function getZipExtractionCommand(
  archivePath: string,
  destDir: string,
  platform: NodeJS.Platform = process.platform
): ExtractionCommand {
  if (platform === 'win32') {
    return {
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force',
        archivePath,
        destDir,
      ],
    };
  }

  return {
    command: 'unzip',
    args: ['-o', archivePath, '-d', destDir],
  };
}

async function extractZip(archivePath: string, destDir: string): Promise<void> {
  const { command, args } = getZipExtractionCommand(archivePath, destDir);
  await execFileAsync(command, args);
}

function findExtractedBinary(runtimeDir: string, binary: string): string | undefined {
  const direct = path.join(runtimeDir, binary);
  if (fs.existsSync(direct)) {
    return direct;
  }

  const targetName = path.basename(binary);
  const visit = (dir: string): string | undefined => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === targetName) {
        return fullPath;
      }
      if (entry.isDirectory()) {
        const found = visit(fullPath);
        if (found) return found;
      }
    }
    return undefined;
  };

  return visit(runtimeDir);
}

export interface RuntimeManagerOptions {
  storagePath: string;
}

export class RuntimeManager {
  private readonly storagePath: string;

  constructor(options: RuntimeManagerOptions) {
    this.storagePath = options.storagePath;
  }

  get binaryPath(): string {
    return getBinaryPath(this.storagePath);
  }

  get version(): string {
    return loadRuntimeManifest().version;
  }

  async isReady(): Promise<boolean> {
    const bp = this.binaryPath;
    if (!fs.existsSync(bp)) return false;

    try {
      const manifest = loadRuntimeManifest();
      const platformId = getPlatformId();
      const entry = manifest.platforms[platformId];
      const installed = readInstalledManifest(this.storagePath);
      if (process.platform !== 'win32') {
        fs.accessSync(bp, fs.constants.X_OK);
      }

      return Boolean(
        entry &&
        installed &&
        installed.version === manifest.version &&
        installed.platform === platformId &&
        installed.sha256 === entry.sha256 &&
        installed.binary === entry.binary
      );
    } catch {
      return false;
    }
  }

  async ensureRuntime(onProgress?: (msg: string) => void): Promise<void> {
    if (await this.isReady()) return;

    const manifest = loadRuntimeManifest();
    const platformId = getPlatformId();
    const entry = manifest.platforms[platformId];

    if (!entry) {
      throw new Error(`No runtime available for platform: ${platformId}`);
    }

    const runtimeDir = getRuntimeDir(this.storagePath);
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }

    const isZip = entry.url.endsWith('.zip');
    const archiveExt = isZip ? '.zip' : '.tar.gz';
    const archivePath = path.join(runtimeDir, `tectonic${archiveExt}`);
    const bp = this.binaryPath;

    onProgress?.(`Downloading Tectonic ${manifest.version} for ${platformId}...`);
    await downloadFile(entry.url, archivePath);

    if (!entry.sha256.startsWith('PLACEHOLDER')) {
      onProgress?.('Verifying checksum...');
      const valid = await verifyChecksum(archivePath, entry.sha256);
      if (!valid) {
        fs.unlinkSync(archivePath);
        throw new Error('Checksum verification failed');
      }
    }

    onProgress?.('Extracting...');
    const extractDir = path.join(runtimeDir, 'extract');
    fs.rmSync(extractDir, { recursive: true, force: true });
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      if (isZip) {
        await extractZip(archivePath, extractDir);
      } else {
        await extractTarGz(archivePath, extractDir);
      }

      const extractedBinary = findExtractedBinary(extractDir, entry.binary);
      if (!extractedBinary) {
        throw new Error(`Binary not found after extraction: ${bp}`);
      }

      fs.rmSync(bp, { force: true });
      fs.copyFileSync(extractedBinary, bp);

      if (process.platform !== 'win32') {
        fs.chmodSync(bp, 0o755);
      }

      writeInstalledManifest(this.storagePath, {
        version: manifest.version,
        platform: platformId,
        sha256: entry.sha256,
        binary: entry.binary,
      });
    } finally {
      fs.rmSync(archivePath, { force: true });
      fs.rmSync(extractDir, { recursive: true, force: true });
    }

    onProgress?.('Tectonic runtime ready.');
  }
}
