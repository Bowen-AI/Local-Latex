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
    expect(html).toContain('rel="modulepreload" href="vscode-resource://extension dir/pdf.mjs"');
    expect(html).toContain('rel="preload" href="vscode-resource://extension dir/pdf.worker.mjs"');
    expect(html).toContain('as="worker"');
    expect(html).toContain('frame-src vscode-resource:');
    expect(html).toContain("script-src 'nonce-fixed-nonce' vscode-resource:");
    expect(html).toContain('<script nonce="fixed-nonce">');
    expect(html).toContain('<script nonce="fixed-nonce" type="module">');
    expect(html).not.toContain(pdfUri);
    expect(html).not.toContain('</script><img src=x>');
    expect(html).not.toContain('</title><script>');

    expect(extractStringLiteral(html, /import \* as pdfjsLib from ([^\n;]+);/, 'PDF.js import URI')).toBe(pdfJsUri);
    expect(extractStringLiteral(html, /let pdfSource = createPdfSource\(([^,\n]+),/, 'PDF URL')).toBe(pdfUri);
    expect(extractStringLiteral(html, /const workerUri = ([^\n;]+);/, 'worker URI')).toBe(workerUri);
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
    expect(html).toContain('showPdfJsViewer()');
    expect(html).toContain('window.setTimeout(() => setupLazyPages(generation, firstViewport), 0)');
    expect(html).not.toContain('for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {');
  });

  it('shows a quick PDF frame while PDF.js prepares the canvas viewer', () => {
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

    expect(html).toContain('<iframe id="quickPdf" src="vscode-resource://workspace/main.pdf?v=123"');
    expect(html).toContain('<main id="viewer" class="isHidden"></main>');
    expect(html).toContain('showQuickPdf(pdfSource.url)');
    expect(html).toContain('showQuickPdf(nextPdfSource.url)');
    expect(html).toContain("quickPdf?.classList.add('isHidden')");
  });

  it('can reload a rebuilt PDF with fresh inline bytes and an acknowledgement', () => {
    const html = buildPdfPreviewHtml({
      cspSource: 'vscode-resource:',
      pdfFileName: 'main.pdf',
      pdfUri: 'vscode-resource://workspace/main.pdf?v=123',
      pdfDataBase64: 'JVBERi0xLjQK',
      pdfDataBytes: 9,
      pdfJsUri: 'vscode-resource://extension/pdf.mjs',
      workerUri: 'vscode-resource://extension/pdf.worker.mjs',
      cMapsUri: 'vscode-resource://extension/cmaps',
      standardFontsUri: 'vscode-resource://extension/standard_fonts',
      nonce: 'fixed-nonce',
    });

    expect(html).toContain("event.data?.type === 'reloadPdf'");
    expect(html).toContain("type: 'reloadPdfAccepted'");
    expect(html).toContain("vscode.postMessage({ type: 'previewReady' })");
    expect(html).toContain('event.data.pdfDataBase64');
    expect(html).toContain('documentSource.data = decodeBase64Pdf(pdfSource.dataBase64)');
    expect(html).toContain('documentSource.url = pdfSource.url');
    expect(html).toContain('const worker = await getReadyPdfWorker(timings)');
    expect(html).toContain('worker,');
    expect(html).not.toContain('async function fetchPdfBytes(url)');
    expect(html).not.toContain("fetch(url, { cache: 'no-store' })");
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

    expect(html).toContain('const defaultScale = 1;');
    expect(html).toContain('verbosity: pdfjsLib.VerbosityLevel.ERRORS');
    expect(html).toContain('Math.min(rawDpr, 1.5)');
    expect(html).toContain('pdfJsModuleMs');
    expect(html).toContain('workerCreateMs');
    expect(html).toContain('workerReadyMs');
    expect(html).toContain('workerStartupFallbackMs');
    expect(html).toContain('fallbackWorkerImportMs');
    expect(html).toContain('openTaskMs');
    expect(html).toContain('decodeMs');
    expect(html).toContain('inlineBytes');
    expect(html).toContain('parseMs');
    expect(html).toContain('firstRenderMs');
    expect(html).toContain("type: 'previewPerf'");
    expect(html).toContain('previewLoadProgress');
    expect(html).toContain('task.onProgress');
  });
});
