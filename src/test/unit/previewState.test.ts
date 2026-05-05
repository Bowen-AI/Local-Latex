import { describe, expect, it } from 'vitest';
import {
  clearPreviewState,
  getCurrentPdf,
  getCurrentPdfPath,
  setCurrentPdf,
  updateCurrentPdfView,
} from '../../preview/previewState';

describe('previewState', () => {
  const workspace = '/workspace/project';

  it('keeps track of base pdf path and latest fragment', () => {
    setCurrentPdf(workspace, 'file:///workspace/project/out/main.pdf');
    updateCurrentPdfView(workspace, 'file:///workspace/project/out/main.pdf#page=3');

    expect(getCurrentPdf(workspace)).toBe('file:///workspace/project/out/main.pdf#page=3');
    expect(getCurrentPdfPath(workspace)).toBe('file:///workspace/project/out/main.pdf');

    clearPreviewState(workspace);
  });

  it('ignores fragment updates for other files', () => {
    setCurrentPdf(workspace, 'file:///workspace/project/out/main.pdf#page=2');
    updateCurrentPdfView(workspace, 'file:///workspace/project/out/other.pdf#page=7');

    expect(getCurrentPdf(workspace)).toBe('file:///workspace/project/out/main.pdf#page=2');

    clearPreviewState(workspace);
  });
});
