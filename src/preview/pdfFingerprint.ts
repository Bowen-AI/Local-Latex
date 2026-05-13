import * as crypto from 'crypto';
import * as fs from 'fs';
import * as zlib from 'zlib';

const INDIRECT_OBJECT_REGEX = /(?:^|\n)(\d+)\s+0\s+obj\s*([\s\S]*?)\s*endobj/g;
const STREAM_REGEX = /(<<[\s\S]*?>>)\s*stream\r?\n([\s\S]*?)\r?\nendstream/;

function normalizePdfText(value: string): string {
  return value
    .replace(/\/CreationDate\s*\([^)]*\)/g, '/CreationDate(NORMALIZED)')
    .replace(/\/ModDate\s*\([^)]*\)/g, '/ModDate(NORMALIZED)')
    .replace(/\/ID\s*\[[^\]]+\]/g, '/ID[NORMALIZED]');
}

function normalizeObjectStream(objectBody: string): string | undefined {
  if (!/\/Type\s*\/ObjStm\b/.test(objectBody) || !/\/FlateDecode\b/.test(objectBody)) {
    return undefined;
  }

  const match = STREAM_REGEX.exec(objectBody);
  if (!match) {
    return undefined;
  }

  try {
    const inflated = zlib.inflateSync(Buffer.from(match[2], 'latin1')).toString('latin1');
    const dictionary = normalizePdfText(match[1]).replace(/\/Length\s+\d+\b/g, '/Length NORMALIZED');
    return `${dictionary}\nstream\n${normalizePdfText(inflated)}\nendstream`;
  } catch {
    return undefined;
  }
}

export async function computeStablePdfFingerprint(pdfPath: string): Promise<string> {
  const raw = await fs.promises.readFile(pdfPath);
  const pdf = raw.toString('latin1');
  const hash = crypto.createHash('sha256');
  let objectCount = 0;
  let stableSize = 0;

  const updateStableHash = (value: string): void => {
    hash.update(value, 'latin1');
    stableSize += Buffer.byteLength(value, 'latin1');
  };

  for (const match of pdf.matchAll(INDIRECT_OBJECT_REGEX)) {
    const objectNumber = match[1];
    const objectBody = match[2];
    if (/\/Type\s*\/XRef\b/.test(objectBody)) {
      continue;
    }

    objectCount += 1;
    updateStableHash(`obj:${objectNumber}\n`);
    updateStableHash(normalizeObjectStream(objectBody) ?? normalizePdfText(objectBody));
    updateStableHash('\n');
  }

  if (objectCount === 0) {
    updateStableHash(normalizePdfText(pdf));
  }

  return `${hash.digest('hex')}-${objectCount}-${stableSize}`;
}
