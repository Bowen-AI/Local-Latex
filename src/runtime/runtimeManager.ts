import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { getPlatformId } from './platform';
import { getBinaryPath, getRuntimeDir, TECTONIC_VERSION } from './paths';
import { verifyChecksum } from './checksum';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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

function loadManifest(): RuntimeManifest {
  const manifestPath = path.join(__dirname, '..', '..', 'resources', 'runtime-manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw) as RuntimeManifest;
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const location = response.headers.location;
        if (!location) { reject(new Error('Redirect with no location')); return; }
        downloadFile(location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode ?? 'unknown'}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  await execFileAsync('tar', ['-xzf', archivePath, '-C', destDir]);
}

async function extractZip(archivePath: string, destDir: string): Promise<void> {
  await execFileAsync('unzip', ['-o', archivePath, '-d', destDir]);
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
    return TECTONIC_VERSION;
  }

  async isReady(): Promise<boolean> {
    const bp = this.binaryPath;
    if (!fs.existsSync(bp)) return false;
    return true;
  }

  async ensureRuntime(onProgress?: (msg: string) => void): Promise<void> {
    if (await this.isReady()) return;

    const manifest = loadManifest();
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

    onProgress?.(`Downloading Tectonic ${TECTONIC_VERSION} for ${platformId}...`);
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
    if (isZip) {
      await extractZip(archivePath, runtimeDir);
    } else {
      await extractTarGz(archivePath, runtimeDir);
    }

    fs.unlinkSync(archivePath);

    const bp = this.binaryPath;
    if (!fs.existsSync(bp)) {
      throw new Error(`Binary not found after extraction: ${bp}`);
    }

    if (process.platform !== 'win32') {
      fs.chmodSync(bp, 0o755);
    }

    onProgress?.('Tectonic runtime ready.');
  }
}
