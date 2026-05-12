export type TectonicProgressKind = 'download' | 'phase' | 'warning';

export interface TectonicProgressUpdate {
  kind: TectonicProgressKind;
  message: string;
}

const DOWNLOAD_REGEX = /^note:\s+downloading\s+(.+)$/i;
const RUNNING_TEX_REGEX = /^note:\s+Running TeX/i;
const RERUNNING_TEX_REGEX = /^note:\s+Rerunning TeX/i;
const RUNNING_PDF_REGEX = /^note:\s+Running xdvipdfmx/i;
const FETCH_FAILURE_REGEX = /^warning:\s+failure fetching\s+"?([^"\s]+)"?/i;

export function summarizeTectonicProgress(chunk: string): TectonicProgressUpdate | undefined {
  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.reverse()) {
    const download = DOWNLOAD_REGEX.exec(line);
    if (download) {
      return {
        kind: 'download',
        message: `Downloading TeX package ${download[1]}`,
      };
    }

    const fetchFailure = FETCH_FAILURE_REGEX.exec(line);
    if (fetchFailure) {
      return {
        kind: 'warning',
        message: `Retrying TeX package ${fetchFailure[1]}`,
      };
    }

    if (RUNNING_PDF_REGEX.test(line)) {
      return { kind: 'phase', message: 'Writing PDF' };
    }

    if (RERUNNING_TEX_REGEX.test(line)) {
      return { kind: 'phase', message: 'Resolving references' };
    }

    if (RUNNING_TEX_REGEX.test(line)) {
      return { kind: 'phase', message: 'Running TeX' };
    }
  }

  return undefined;
}

export function hasTectonicPackageDownload(output: string): boolean {
  return output.split(/\r?\n/).some((line) => DOWNLOAD_REGEX.test(line.trim()));
}

export function hasTectonicFetchFailure(output: string): boolean {
  return output.split(/\r?\n/).some((line) => FETCH_FAILURE_REGEX.test(line.trim()));
}
