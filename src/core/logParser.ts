export type LogSeverity = 'error' | 'warning' | 'info';

export interface LogEntry {
  file: string;
  line: number;
  column: number;
  severity: LogSeverity;
  message: string;
}

const ERROR_REGEX = /^! (.+)$/m;
const LINE_REGEX = /^l\.(\d+)/m;
const FILE_REGEX = /\(([^)]+\.tex)/;
const WARNING_REGEX = /^LaTeX Warning: (.+)$/m;
const WARNING_LINE_REGEX = /(?:on input line|line) (\d+)/i;
const OVERFULL_REGEX = /^(Overfull|Underfull) \\([hv])box (.+) at lines? (\d+)/m;
const TECTONIC_SOURCE_EXTENSIONS = 'tex|bbl|bib|sty|cls|ltx|cfg|def|clo|aux|log';
const TECTONIC_DIAG_REGEX = new RegExp(
  `^(error|warning):\\s+(.+\\.(?:${TECTONIC_SOURCE_EXTENSIONS})):(\\d+):\\s+(.+)$`,
  'i'
);
const TECTONIC_CAUSED_BY_REGEX = new RegExp(
  `^caused by:\\s+(.+\\.(?:${TECTONIC_SOURCE_EXTENSIONS})):(\\d+):\\s+(.+)$`,
  'i'
);

function parseTectonicDiagnosticLine(line: string): LogEntry | null {
  const diagMatch = TECTONIC_DIAG_REGEX.exec(line);
  if (diagMatch) {
    return {
      file: diagMatch[2].trim(),
      line: parseInt(diagMatch[3], 10),
      column: 0,
      severity: diagMatch[1].toLowerCase() === 'warning' ? 'warning' : 'error',
      message: diagMatch[4].trim(),
    };
  }

  const causedByMatch = TECTONIC_CAUSED_BY_REGEX.exec(line);
  if (causedByMatch) {
    return {
      file: causedByMatch[1].trim(),
      line: parseInt(causedByMatch[2], 10),
      column: 0,
      severity: 'error',
      message: causedByMatch[3].trim(),
    };
  }

  return null;
}

function parseSingleBlock(block: string, defaultFile: string): LogEntry | null {
  const errorMatch = ERROR_REGEX.exec(block);
  if (errorMatch) {
    const lineMatch = LINE_REGEX.exec(block);
    const fileMatch = FILE_REGEX.exec(block);
    return {
      file: fileMatch ? fileMatch[1] : defaultFile,
      line: lineMatch ? parseInt(lineMatch[1], 10) : 0,
      column: 0,
      severity: 'error',
      message: errorMatch[1].trim(),
    };
  }

  const warnMatch = WARNING_REGEX.exec(block);
  if (warnMatch) {
    const fileMatch = FILE_REGEX.exec(block);
    const lineMatch = WARNING_LINE_REGEX.exec(warnMatch[1]);
    return {
      file: fileMatch ? fileMatch[1] : defaultFile,
      line: lineMatch ? parseInt(lineMatch[1], 10) : 0,
      column: 0,
      severity: 'warning',
      message: warnMatch[1].trim(),
    };
  }

  const overfullMatch = OVERFULL_REGEX.exec(block);
  if (overfullMatch) {
    return {
      file: defaultFile,
      line: parseInt(overfullMatch[4], 10),
      column: 0,
      severity: 'warning',
      message: `${overfullMatch[1]} \\${overfullMatch[2]}box ${overfullMatch[3]}`.trim(),
    };
  }

  return null;
}

export function parseLog(logText: string, defaultFile = 'main.tex'): LogEntry[] {
  const entries: LogEntry[] = [];
  const lines = logText.split('\n');
  let block = '';

  for (const line of lines) {
    const tectonicEntry = parseTectonicDiagnosticLine(line);
    if (tectonicEntry) {
      if (block) {
        const entry = parseSingleBlock(block, defaultFile);
        if (entry) entries.push(entry);
        block = '';
      }
      entries.push(tectonicEntry);
      continue;
    }

    if (line.startsWith('!') || line.startsWith('LaTeX Warning') || line.startsWith('Overfull') || line.startsWith('Underfull')) {
      if (block) {
        const entry = parseSingleBlock(block, defaultFile);
        if (entry) entries.push(entry);
      }
      block = line + '\n';
    } else {
      block += line + '\n';
    }
  }

  if (block.trim()) {
    const entry = parseSingleBlock(block, defaultFile);
    if (entry) entries.push(entry);
  }

  return entries;
}
