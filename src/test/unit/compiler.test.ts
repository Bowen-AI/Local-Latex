import { describe, it, expect } from 'vitest';
import { buildCompileArgs } from '../../core/compiler';

describe('compiler args', () => {
  it('includes --synctex by default workflow when enabled', () => {
    const args = buildCompileArgs({
      outputDirectory: 'out',
      offlineOnly: false,
      mainFile: '/workspace/main.tex',
      synctex: true,
    });

    expect(args).toEqual([
      'compile',
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
      'compile',
      '--outdir',
      'build',
      '--only-cached',
      '/workspace/thesis.tex',
    ]);
  });
});
