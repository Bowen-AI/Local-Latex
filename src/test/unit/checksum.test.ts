import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { computeFileChecksum, verifyChecksum } from '../../runtime/checksum';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

let tmpFile: string;
const content = 'Hello, World!';
const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

beforeAll(() => {
  tmpFile = path.join(os.tmpdir(), `checksum-test-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, content, 'utf-8');
});

afterAll(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

describe('checksum', () => {
  it('computeFileChecksum returns correct SHA256', async () => {
    const hash = await computeFileChecksum(tmpFile);
    expect(hash).toBe(expectedHash);
  });

  it('verifyChecksum returns true for correct checksum', async () => {
    const valid = await verifyChecksum(tmpFile, expectedHash);
    expect(valid).toBe(true);
  });

  it('verifyChecksum returns false for incorrect checksum', async () => {
    const valid = await verifyChecksum(tmpFile, 'deadbeef');
    expect(valid).toBe(false);
  });

  it('verifyChecksum is case-insensitive', async () => {
    const valid = await verifyChecksum(tmpFile, expectedHash.toUpperCase());
    expect(valid).toBe(true);
  });

  it('verifyChecksum returns false for non-existent file', async () => {
    const valid = await verifyChecksum('/non/existent/file.txt', expectedHash);
    expect(valid).toBe(false);
  });
});
