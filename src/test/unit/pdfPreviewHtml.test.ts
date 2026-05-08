import { describe, expect, it } from 'vitest';
import { buildPdfPreviewHtml } from '../../preview/pdfPreviewHtml';

function extractStringLiteral(html: string, pattern: RegExp, description: string): string {
  const match = pattern.exec(html);
  if (!match) {
    throw new Error(`Missing ${description}`);
  }

  const parsed: unknown = JSON.parse(match[1]);
  if (typeof parsed !== 'string') {
    throw new Error(`${description} is not a string literal`);
  }
  return parsed;
}

describe('pdfPreviewHtml', () => {
  it('escapes preview titles and script resource URLs for hostile PDF names', () => {
    const pdfUri = 'vscode-resource://workspace dir/final "Q2" & </script><img src=x>.pdf';
    const pdfJsUri = 'vscode-resource://extension dir/pdf.mjs';
    const workerUri = 'vscode-resource://extension dir/pdf.worker.mjs';
    const cMapsUri = 'vscode-resource://extension dir/cmaps';
    const standardFontsUri = 'vscode-resource://extension dir/standard fonts';

    const html = buildPdfPreviewHtml({
      cspSource: 'vscode-resource:',
      pdfFileName: 'final "Q2" & </title><script>.pdf',
      pdfUri,
      pdfJsUri,
      workerUri,
      cMapsUri,
      standardFontsUri,
      nonce: 'fixed-nonce',
    });

    expect(html).toContain('<title>final &quot;Q2&quot; &amp; &lt;/title&gt;&lt;script&gt;.pdf</title>');
    expect(html).toContain('<div class="title">final &quot;Q2&quot; &amp; &lt;/title&gt;&lt;script&gt;.pdf</div>');
    expect(html).toContain("script-src 'nonce-fixed-nonce' vscode-resource:");
    expect(html).toContain('<script nonce="fixed-nonce" type="module">');
    expect(html).not.toContain(pdfUri);
    expect(html).not.toContain('</script><img src=x>');
    expect(html).not.toContain('</title><script>');

    expect(extractStringLiteral(html, /import \* as pdfjsLib from ([^\n;]+);/, 'PDF.js import URI')).toBe(pdfJsUri);
    expect(extractStringLiteral(html, /const pdfUrl = ([^\n;]+);/, 'PDF URL')).toBe(pdfUri);
    expect(extractStringLiteral(html, /workerSrc = ([^\n;]+);/, 'worker URI')).toBe(workerUri);
    expect(extractStringLiteral(html, /cMapUrl: ([^\n,]+),/, 'cMap URI')).toBe(`${cMapsUri}/`);
    expect(extractStringLiteral(html, /standardFontDataUrl: ([^\n]+)\n/, 'standard font URI')).toBe(
      `${standardFontsUri}/`
    );
  });

  it('preserves single trailing slashes for PDF.js resource directories', () => {
    const html = buildPdfPreviewHtml({
      cspSource: 'vscode-resource:',
      pdfFileName: 'main.pdf',
      pdfUri: 'vscode-resource://workspace/main.pdf',
      pdfJsUri: 'vscode-resource://extension/pdf.mjs',
      workerUri: 'vscode-resource://extension/pdf.worker.mjs',
      cMapsUri: 'vscode-resource://extension/cmaps/',
      standardFontsUri: 'vscode-resource://extension/standard_fonts/',
      nonce: 'fixed-nonce',
    });

    expect(extractStringLiteral(html, /cMapUrl: ([^\n,]+),/, 'cMap URI')).toBe('vscode-resource://extension/cmaps/');
    expect(extractStringLiteral(html, /standardFontDataUrl: ([^\n]+)\n/, 'standard font URI')).toBe(
      'vscode-resource://extension/standard_fonts/'
    );
  });
});
