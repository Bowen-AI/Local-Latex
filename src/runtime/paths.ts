import * as path from 'path';
import * as os from 'os';

export const TECTONIC_VERSION = '0.15.0';

export function getRuntimeDir(storagePath: string): string {
  return path.join(storagePath, 'runtime');
}

export function getBinaryName(): string {
  return os.platform() === 'win32' ? 'tectonic.exe' : 'tectonic';
}

export function getBinaryPath(storagePath: string): string {
  return path.join(getRuntimeDir(storagePath), getBinaryName());
}

export function getManifestPath(storagePath: string): string {
  return path.join(getRuntimeDir(storagePath), 'manifest.json');
}
