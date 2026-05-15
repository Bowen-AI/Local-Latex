import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildCompileArgs,
  compile,
  getOutputPdfPath,
  resolveOutputDirectory,
} from '../../core/compiler';

describe('compiler args', () => {
  it('includes --synctex by default workflow when enabled', () => {
    const args = buildCompileArgs({
      outputDirectory: 'out',
      offlineOnly: false,
      mainFile: '/workspace/main.tex',
      synctex: true,
    });

    expect(args).toEqual([
      '--outdir',
      'out',
      '--synctex',
      '/workspace/main.tex',
    ]);
  });

  it('adds --only-cached when offline mode is enabled', () => {
    const args = buildCompileArgs({
      outputDirectory: 'build',
      offlineOnly: true,
      mainFile: '/workspace/thesis.tex',
      synctex: false,
    });

    expect(args).toEqual([
      '--outdir',
      'build',
      '--only-cached',
      '/workspace/thesis.tex',
    ]);
  });

  it('adds --print and --keep-logs when Tectonic diagnostic flags are enabled', () => {
    const args = buildCompileArgs({
      outputDirectory: 'out',
      offlineOnly: false,
      mainFile: '/workspace/main.tex',
      synctex: false,
      tectonicPrint: true,
      tectonicKeepLogs: true,
    });

    expect(args).toEqual([
      '--outdir',
      'out',
      '--print',
      '--keep-logs',
      '/workspace/main.tex',
    ]);
  });

  it('resolves relative output directories inside the workspace', () => {
    expect(resolveOutputDirectory('/workspace', 'out')).toBe('/workspace/out');
  });

  it('preserves absolute output directories', () => {
    expect(resolveOutputDirectory('/workspace', '/tmp/build')).toBe('/tmp/build');
  });

  it('computes output PDF names for upper-case TeX extensions', () => {
    expect(getOutputPdfPath('/workspace', 'out', '/workspace/Paper.TEX')).toBe('/workspace/out/Paper.pdf');
  });
});

describe('compiler PDF verification', () => {
  let tmpRoot: string;
  let fakeBinary: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'compiler-pdfcheck-'));

    // Build a fake "tectonic" binary that we can configure per test by writing files.
    // We use `/bin/sh` shim that checks for a marker file and either creates a PDF or not.
    fakeBinary = path.join(tmpRoot, 'fake-tectonic');
    const script = `#!/bin/sh
# Args: --outdir <dir> [--synctex] [--only-cached] [--print] [--keep-logs] <mainfile>
OUTDIR=""
MAIN=""
while [ $# -gt 0 ]; do
  case "$1" in
    --outdir) OUTDIR="$2"; shift 2 ;;
    --synctex|--only-cached|--print|--keep-logs) shift ;;
    *) MAIN="$1"; shift ;;
  esac
done
BASENAME=$(basename "$MAIN" .tex)
MODE_FILE="$OUTDIR/.mode"
if [ -f "$MODE_FILE" ]; then
  MODE=$(cat "$MODE_FILE")
else
  MODE=ok
fi
if [ "$MODE" = "ok" ]; then
  printf 'pretending to compile %s\\n' "$MAIN"
  printf 'pdf bytes' > "$OUTDIR/$BASENAME.pdf"
  exit 0
elif [ "$MODE" = "silent-success" ]; then
  printf 'pretending success but writing no pdf\\n'
  exit 0
elif [ "$MODE" = "silent-fail" ]; then
  exit 1
else
  printf '! Undefined control sequence.\\nl.5 \\\\unknown\\n' 1>&2
  exit 1
fi
`;
    fs.writeFileSync(fakeBinary, script, { mode: 0o755 });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  function makeWorkspace(mode: string): { workspaceRoot: string; mainFile: string; outDir: string } {
    const workspaceRoot = fs.mkdtempSync(path.join(tmpRoot, 'ws-'));
    const mainFile = path.join(workspaceRoot, 'main.tex');
    fs.writeFileSync(mainFile, '\\documentclass{article}\\begin{document}hi\\end{document}\n');
    const outDir = path.join(workspaceRoot, 'out');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, '.mode'), mode);
    return { workspaceRoot, mainFile, outDir };
  }

  it('reports success and the produced PDF path when Tectonic exits 0 and the PDF exists', async () => {
    const { workspaceRoot, mainFile } = makeWorkspace('ok');
    const result = await compile({
      binaryPath: fakeBinary,
      mainFile,
      outputDirectory: 'out',
      workspaceRoot,
      timeoutMs: 5000,
      offlineOnly: false,
      synctex: false,
    });

    expect(result.success).toBe(true);
    expect(result.pdfMissing).toBe(false);
    expect(result.outputPdf).toBeDefined();
    expect(fs.existsSync(result.outputPdf!)).toBe(true);
    expect(result.expectedPdfPath).toBe(result.outputPdf);
  });

  it('flags pdfMissing and synthesizes an error when Tectonic exits 0 but no PDF is written', async () => {
    const { workspaceRoot, mainFile } = makeWorkspace('silent-success');
    const result = await compile({
      binaryPath: fakeBinary,
      mainFile,
      outputDirectory: 'out',
      workspaceRoot,
      timeoutMs: 5000,
      offlineOnly: false,
      synctex: false,
    });

    expect(result.success).toBe(false);
    expect(result.pdfMissing).toBe(true);
    expect(result.outputPdf).toBeUndefined();
    expect(result.expectedPdfPath).toMatch(/main\.pdf$/);
    const errors = result.logs.filter((entry) => entry.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/no PDF was written/i);
  });

  it('synthesizes a fallback error entry when Tectonic fails without diagnostic output', async () => {
    const { workspaceRoot, mainFile } = makeWorkspace('silent-fail');
    const result = await compile({
      binaryPath: fakeBinary,
      mainFile,
      outputDirectory: 'out',
      workspaceRoot,
      timeoutMs: 5000,
      offlineOnly: false,
      synctex: false,
    });

    expect(result.success).toBe(false);
    expect(result.pdfMissing).toBe(false);
    const errors = result.logs.filter((entry) => entry.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('parses real errors when Tectonic fails with diagnostic output', async () => {
    const { workspaceRoot, mainFile } = makeWorkspace('fail');
    const result = await compile({
      binaryPath: fakeBinary,
      mainFile,
      outputDirectory: 'out',
      workspaceRoot,
      timeoutMs: 5000,
      offlineOnly: false,
      synctex: false,
    });

    expect(result.success).toBe(false);
    const errors = result.logs.filter((entry) => entry.severity === 'error');
    expect(errors[0].message).toMatch(/Undefined control sequence/);
    expect(errors[0].line).toBe(5);
  });
});
