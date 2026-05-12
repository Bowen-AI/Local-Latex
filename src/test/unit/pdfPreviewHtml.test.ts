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
    expect(html).toContain('<script nonce="fixed-nonce">');
    expect(html).toContain('<script nonce="fixed-nonce" type="module">');
    expect(html).not.toContain(pdfUri);
    expect(html).not.toContain('</script><img src=x>');
    expect(html).not.toContain('</title><script>');

    expect(extractStringLiteral(html, /import \* as pdfjsLib from ([^\n;]+);/, 'PDF.js import URI')).toBe(pdfJsUri);
    expect(extractStringLiteral(html, /let pdfUrl = ([^\n;]+);/, 'PDF URL')).toBe(pdfUri);
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

  it('renders compile and keyboard zoom controls in the preview toolbar', () => {
    const html = buildPdfPreviewHtml({
      cspSource: 'vscode-resource:',
      pdfFileName: 'main.pdf',
      pdfUri: 'vscode-resource://workspace/main.pdf',
      pdfJsUri: 'vscode-resource://extension/pdf.mjs',
      workerUri: 'vscode-resource://extension/pdf.worker.mjs',
      cMapsUri: 'vscode-resource://extension/cmaps',
      standardFontsUri: 'vscode-resource://extension/standard_fonts',
      nonce: 'fixed-nonce',
    });

    expect(html).toContain('<button id="compile" class="primaryButton" title="Compile PDF">Compile</button>');
    expect(html).toContain('title="Zoom out (Ctrl+-)"');
    expect(html).toContain('title="Zoom in (Ctrl+= / Ctrl++)"');
    expect(html).toContain("window.addEventListener('keydown'");
    expect(html).toContain("event.key === '+' || event.key === '=' || event.code === 'NumpadAdd'");
    expect(html).toContain("event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract'");
  });

  it('renders the PDF lazily instead of eagerly rendering every page', () => {
    const html = buildPdfPreviewHtml({
      cspSource: 'vscode-resource:',
      pdfFileName: 'main.pdf',
      pdfUri: 'vscode-resource://workspace/main.pdf?v=123',
      pdfJsUri: 'vscode-resource://extension/pdf.mjs',
      workerUri: 'vscode-resource://extension/pdf.worker.mjs',
      cMapsUri: 'vscode-resource://extension/cmaps',
      standardFontsUri: 'vscode-resource://extension/standard_fonts',
      nonce: 'fixed-nonce',
    });

    expect(html).toContain('new IntersectionObserver');
    expect(html).toContain('setupLazyPages');
    expect(html).toContain('createPagePlaceholder');
    expect(html).toContain('await renderPage(firstPlaceholder, 1, generation, firstPage)');
    expect(html).toContain('window.setTimeout(() => setupLazyPages(generation, firstViewport), 0)');
    expect(html).not.toContain('for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {');
  });

  it('can reload a rebuilt PDF without rebuilding the whole webview or bypassing local cache', () => {
    const html = buildPdfPreviewHtml({
      cspSource: 'vscode-resource:',
      pdfFileName: 'main.pdf',
      pdfUri: 'vscode-resource://workspace/main.pdf?v=123',
      pdfJsUri: 'vscode-resource://extension/pdf.mjs',
      workerUri: 'vscode-resource://extension/pdf.worker.mjs',
      cMapsUri: 'vscode-resource://extension/cmaps',
      standardFontsUri: 'vscode-resource://extension/standard_fonts',
      nonce: 'fixed-nonce',
    });

    expect(html).toContain("event.data?.type === 'reloadPdf'");
    expect(html).toContain('void loadPdf(event.data.pdfUri)');
    expect(html).toContain('url: pdfUrl,');
    expect(html).toContain('worker: pdfWorker,');
    expect(html).not.toContain('async function fetchPdfBytes(url)');
    expect(html).not.toContain("fetch(url, { cache: 'no-store' })");
    expect(html).not.toContain('data,');
  });

  it('reports preview timing stages to the extension host', () => {
    const html = buildPdfPreviewHtml({
      cspSource: 'vscode-resource:',
      pdfFileName: 'main.pdf',
      pdfUri: 'vscode-resource://workspace/main.pdf?v=123',
      pdfJsUri: 'vscode-resource://extension/pdf.mjs',
      workerUri: 'vscode-resource://extension/pdf.worker.mjs',
      cMapsUri: 'vscode-resource://extension/cmaps',
      standardFontsUri: 'vscode-resource://extension/standard_fonts',
      nonce: 'fixed-nonce',
    });

    expect(html).toContain('__latexOneClickPreviewBootStarted');
    expect(html).toContain('pdfJsModuleMs');
    expect(html).toContain('workerCreateMs');
    expect(html).toContain('openTaskMs');
    expect(html).toContain('parseMs');
    expect(html).toContain('firstRenderMs');
    expect(html).toContain("type: 'previewPerf'");
  });
});
