import * as crypto from 'crypto';
import * as fs from 'fs';

export async function computeFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export async function verifyChecksum(filePath: string, expected: string): Promise<boolean> {
  try {
    const actual = await computeFileChecksum(filePath);
    return actual.toLowerCase() === expected.toLowerCase();
  } catch {
    return false;
  }
}
