import { describe, expect, it } from 'vitest';
import { findSyncTexTarget, parseSyncTex } from '../../preview/synctex';

const SYNC_TEX = `SyncTeX Version:1
Input:1:/workspace/main.tex
Input:2:/workspace/sections/findings.tex
Output:pdf
Content:
{1
(1,10:6553600,13107200:655360,655360,0
(2,4:6553600,19660800:655360,655360,0
}1
`;

describe('synctex', () => {
  it('parses input files and source records', () => {
    const doc = parseSyncTex(SYNC_TEX);

    expect(doc.inputs.get(1)).toBe('/workspace/main.tex');
    expect(doc.records).toHaveLength(2);
    expect(doc.records[1]).toMatchObject({
      file: '/workspace/sections/findings.tex',
      line: 4,
      page: 1,
    });
  });

  it('finds the nearest source line for a PDF click', () => {
    const doc = parseSyncTex(SYNC_TEX);
    const target = findSyncTexTarget(doc, {
      page: 1,
      pdfX: 100,
      pdfY: 592,
      pageHeight: 792,
    }, '/workspace');

    expect(target).toEqual({
      file: '/workspace/main.tex',
      line: 10,
    });
  });

  it('returns undefined when the click is too far from text', () => {
    const doc = parseSyncTex(SYNC_TEX);
    const target = findSyncTexTarget(doc, {
      page: 1,
      pdfX: 100,
      pdfY: 100,
      pageHeight: 792,
    }, '/workspace');

    expect(target).toBeUndefined();
  });
});
