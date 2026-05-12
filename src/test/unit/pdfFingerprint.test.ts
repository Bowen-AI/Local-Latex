import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import { computeStablePdfFingerprint } from '../../preview/pdfFingerprint';

let tmpDir: string | undefined;

function createTempPdf(name: string, objectStreamText: string): string {
  tmpDir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'latex-one-click-pdf-fingerprint-'));
  const objectStream = zlib.deflateSync(Buffer.from(objectStreamText, 'latin1')).toString('latin1');
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(
    filePath,
    [
      '%PDF-1.5',
      '1 0 obj',
      '<< /Type /Catalog /Pages 2 0 R >>',
      'endobj',
      '2 0 obj',
      '<< /Type /Pages /Kids [] /Count 0 >>',
      'endobj',
      '3 0 obj',
      `<< /Type /ObjStm /N 1 /First 0 /Filter /FlateDecode /Length ${objectStream.length} >>`,
      'stream',
      objectStream,
      'endstream',
      'endobj',
      '4 0 obj',
      '<< /Type /XRef /ID[<volatile><volatile>] /Root 1 0 R >>',
      'stream',
      'volatile xref bytes',
      'endstream',
      'endobj',
      '%%EOF',
      '',
    ].join('\n'),
    'latin1'
  );
  return filePath;
}

afterEach(() => {
  if (tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

describe('pdfFingerprint', () => {
  it('ignores volatile creation dates inside compressed object streams', async () => {
    const first = createTempPdf('first.pdf', "<</Producer(xdvipdfmx)/CreationDate(D:20260512000100-00\\'00\\')>>");
    const second = createTempPdf('second.pdf', "<</Producer(xdvipdfmx)/CreationDate(D:20260512000200-00\\'00\\')>>");

    await expect(computeStablePdfFingerprint(first)).resolves.toBe(await computeStablePdfFingerprint(second));
  });

  it('changes when stable PDF object content changes', async () => {
    const first = createTempPdf('first.pdf', '<</Producer(xdvipdfmx)/Title(First)>>');
    const second = createTempPdf('second.pdf', '<</Producer(xdvipdfmx)/Title(Second)>>');

    await expect(computeStablePdfFingerprint(first)).resolves.not.toBe(await computeStablePdfFingerprint(second));
  });
});
