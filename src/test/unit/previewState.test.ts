import { describe, it, expect, beforeEach } from 'vitest';
import { setCurrentPdf, getCurrentPdf, clearPreviewState } from '../../preview/previewState';

const WS = '/workspace/preview-test';

beforeEach(() => {
  clearPreviewState(WS);
});

describe('previewState', () => {
  it('returns undefined when no PDF has been set', () => {
    expect(getCurrentPdf(WS)).toBeUndefined();
  });

  it('stores and retrieves the current PDF path', () => {
    setCurrentPdf(WS, '/out/main.pdf');
    expect(getCurrentPdf(WS)).toBe('/out/main.pdf');
  });

  it('updates the PDF path on subsequent calls', () => {
    setCurrentPdf(WS, '/out/v1.pdf');
    setCurrentPdf(WS, '/out/v2.pdf');
    expect(getCurrentPdf(WS)).toBe('/out/v2.pdf');
  });

  it('clears the stored PDF path', () => {
    setCurrentPdf(WS, '/out/main.pdf');
    clearPreviewState(WS);
    expect(getCurrentPdf(WS)).toBeUndefined();
  });

  it('tracks PDFs independently per workspace', () => {
    const ws2 = '/workspace/other';
    setCurrentPdf(WS, '/out/a.pdf');
    setCurrentPdf(ws2, '/out/b.pdf');
    expect(getCurrentPdf(WS)).toBe('/out/a.pdf');
    expect(getCurrentPdf(ws2)).toBe('/out/b.pdf');
    clearPreviewState(ws2);
  });
});
