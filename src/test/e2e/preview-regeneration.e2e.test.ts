import { describe, expect, it } from 'vitest';
import { setCurrentPdf, getCurrentPdf, updateCurrentPdfView } from '../../preview/previewState';

describe('preview regeneration flow (e2e-style)', () => {
  it('restores the same page fragment after rebuild', () => {
    const workspace = '/workspace/demo';
    const pdf = 'file:///workspace/demo/out/main.pdf';

    setCurrentPdf(workspace, pdf);
    updateCurrentPdfView(workspace, `${pdf}#page=3`);

    // Simulate a rebuild outputting the same PDF path.
    setCurrentPdf(workspace, getCurrentPdf(workspace) ?? pdf);

    expect(getCurrentPdf(workspace)).toBe(`${pdf}#page=3`);
  });
});
