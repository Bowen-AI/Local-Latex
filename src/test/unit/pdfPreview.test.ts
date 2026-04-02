import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

// Mock vscode before importing modules that depend on it
vi.mock('vscode', () => ({
  Uri: {
    file: (p: string) => ({ fsPath: p, toString: () => `file://${p}` }),
    parse: (s: string) => ({ toString: () => s }),
  },
  ViewColumn: { Beside: 2 },
  commands: {
    executeCommand: vi.fn().mockResolvedValue(undefined),
  },
  workspace: {
    openTextDocument: vi.fn().mockResolvedValue({}),
  },
  window: {
    showTextDocument: vi.fn().mockResolvedValue(undefined),
  },
}));

import { openPdf, getPdfPathForTex } from '../../preview/pdfPreview';
import { getCurrentPdf, clearPreviewState } from '../../preview/previewState';
import * as vscode from 'vscode';

const WS = '/workspace';

beforeEach(() => {
  clearPreviewState(WS);
  vi.clearAllMocks();
});

describe('pdfPreview – getPdfPathForTex', () => {
  it('returns the PDF path in the output directory', () => {
    const result = getPdfPathForTex('/workspace/main.tex', 'out');
    expect(result).toBe(path.join('/workspace', 'out', 'main.pdf'));
  });

  it('replaces .tex extension with .pdf', () => {
    const result = getPdfPathForTex('/workspace/thesis.tex', 'build');
    expect(result).toBe(path.join('/workspace', 'build', 'thesis.pdf'));
  });

  it('places the PDF inside the output directory relative to the tex file', () => {
    const result = getPdfPathForTex('/project/docs/report.tex', 'out');
    expect(result).toBe(path.join('/project', 'docs', 'out', 'report.pdf'));
  });
});

describe('pdfPreview – openPdf', () => {
  it('stores the current PDF in preview state', async () => {
    await openPdf('/out/main.pdf', WS);
    expect(getCurrentPdf(WS)).toBe('/out/main.pdf');
  });

  it('calls vscode.commands.executeCommand with vscode.open', async () => {
    await openPdf('/out/main.pdf', WS);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.open',
      expect.objectContaining({ fsPath: '/out/main.pdf' }),
      expect.objectContaining({ viewColumn: 2 })
    );
  });

  it('falls back to openTextDocument when executeCommand throws', async () => {
    vi.mocked(vscode.commands.executeCommand).mockRejectedValueOnce(new Error('no pdf viewer'));

    await openPdf('/out/main.pdf', WS);

    expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
    expect(vscode.window.showTextDocument).toHaveBeenCalled();
  });

  it('respects the preserveFocus option', async () => {
    await openPdf('/out/main.pdf', WS, false);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.open',
      expect.anything(),
      expect.objectContaining({ preserveFocus: false })
    );
  });
});
