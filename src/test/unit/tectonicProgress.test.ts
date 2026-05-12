import { describe, expect, it } from 'vitest';
import {
  hasTectonicFetchFailure,
  hasTectonicPackageDownload,
  summarizeTectonicProgress,
} from '../../core/tectonicProgress';

describe('tectonicProgress', () => {
  it('summarizes package downloads', () => {
    expect(summarizeTectonicProgress('note: downloading size10.clo')).toEqual({
      kind: 'download',
      message: 'Downloading TeX package size10.clo',
    });
  });

  it('summarizes compile phases', () => {
    expect(summarizeTectonicProgress('note: Running TeX ...')).toEqual({
      kind: 'phase',
      message: 'Running TeX',
    });
    expect(summarizeTectonicProgress('note: Rerunning TeX because "main.aux" changed ...')).toEqual({
      kind: 'phase',
      message: 'Resolving references',
    });
    expect(summarizeTectonicProgress('note: Running xdvipdfmx ...')).toEqual({
      kind: 'phase',
      message: 'Writing PDF',
    });
  });

  it('detects package download and fetch failures in combined output', () => {
    const output = [
      'note: downloading size10.clo',
      'warning: failure fetching "size10.clo" from network (1/3)',
    ].join('\n');

    expect(hasTectonicPackageDownload(output)).toBe(true);
    expect(hasTectonicFetchFailure(output)).toBe(true);
    expect(summarizeTectonicProgress(output)).toEqual({
      kind: 'warning',
      message: 'Retrying TeX package size10.clo',
    });
  });
});
