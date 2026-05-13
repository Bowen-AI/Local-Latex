import { describe, it, expect } from 'vitest';
import { buildCompileArgs, getOutputPdfPath, resolveOutputDirectory } from '../../core/compiler';

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
