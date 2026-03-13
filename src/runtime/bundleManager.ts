import * as fs from 'fs';
import * as path from 'path';

export function getBundleCacheDir(storagePath: string): string {
  return path.join(storagePath, 'bundle-cache');
}

export function ensureBundleCacheDir(storagePath: string): string {
  const dir = getBundleCacheDir(storagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
