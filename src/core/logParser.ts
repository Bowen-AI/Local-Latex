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
const OVERFULL_REGEX = /^(Overfull|Underfull) \\[hv]box (.+) at lines? (\d+)/m;

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
    return {
      file: fileMatch ? fileMatch[1] : defaultFile,
      line: 0,
      column: 0,
      severity: 'warning',
      message: warnMatch[1].trim(),
    };
  }

  const overfullMatch = OVERFULL_REGEX.exec(block);
  if (overfullMatch) {
    return {
      file: defaultFile,
      line: parseInt(overfullMatch[3], 10),
      column: 0,
      severity: 'warning',
      message: `${overfullMatch[1]} \\hbox ${overfullMatch[2]}`.trim(),
    };
  }

  return null;
}

export function parseLog(logText: string, defaultFile = 'main.tex'): LogEntry[] {
  const entries: LogEntry[] = [];
  const lines = logText.split('\n');
  let block = '';

  for (const line of lines) {
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
