export type LogSeverity = 'error' | 'warning' | 'info';

export interface LogEntry {
  file: string;
  line: number;
  column: number;
  severity: LogSeverity;
  message: string;
}

const TECTONIC_SOURCE_EXTENSIONS = 'tex|ltx|sty|cls|cfg|def|clo|aux|bbl|bib|toc|out|log|ldf|fd';
const TECTONIC_DIAG_REGEX = new RegExp(
  `^(error|warning):\\s+(.+\\.(?:${TECTONIC_SOURCE_EXTENSIONS})):(\\d+):\\s+(.+)$`,
  'i'
);
const TECTONIC_CAUSED_BY_REGEX = new RegExp(
  `^caused by:\\s+(.+\\.(?:${TECTONIC_SOURCE_EXTENSIONS})):(\\d+):\\s+(.+)$`,
  'i'
);
const PACKAGE_ERROR_REGEX = /^! Package (\S+) Error:\s*(.+)$/;
const CLASS_ERROR_REGEX = /^! Class (\S+) Error:\s*(.+)$/;
const LATEX_ERROR_REGEX = /^! LaTeX Error:\s*(.+)$/;
const PDFTEX_ERROR_REGEX = /^! pdfTeX (?:error|warning)(?:\s+\(.+?\))?:\s*(.+)$/;
const GENERIC_ERROR_REGEX = /^!\s+(.+)$/;
const LINE_REF_REGEX = /^l\.(\d+)\b/;
const PACKAGE_WARNING_REGEX = /^Package (\S+) Warning:\s*(.+?)(?:\s+on input line (\d+))?\.?$/;
const CLASS_WARNING_REGEX = /^Class (\S+) Warning:\s*(.+?)(?:\s+on input line (\d+))?\.?$/;
const LATEX_WARNING_REGEX = /^LaTeX Warning:\s*(.+?)(?:\s+on input line (\d+))?\.?$/;
const PDFTEX_WARNING_REGEX = /^pdfTeX warning(?:\s+\(.+?\))?:\s*(.+)$/;
const OVERFULL_REGEX = /^(Overfull|Underfull)\s+\\([hv])box\b.*? at lines? (\d+)(?:--\d+)?\b/;
const FILE_LINE_REGEX = /^(\S+\.(?:tex|ltx|sty|cls|cfg|def|clo|aux|bbl|bib|toc|out|log|ldf|fd)):(\d+):\s*(.+)$/i;
const ON_INPUT_LINE_REGEX = /(?:on input line|line) (\d+)/i;

interface ParseContext {
  defaultFile: string;
  fileStack: string[];
}

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

/**
 * TeX log parens nest like `(./main.tex ... (./sub.tex ... ))`. We maintain a
 * stack so an error following an open paren can be attributed to the most
 * recently opened source file. Filenames inside parens may be split across
 * lines and the path matching must skip non-source-file tokens (e.g. font
 * metrics, encoding tables) that TeX also wraps in parens.
 */
function updateFileStack(rawLine: string, stack: string[]): void {
  for (let i = 0; i < rawLine.length; i += 1) {
    const ch = rawLine[i];
    if (ch === '(') {
      const rest = rawLine.slice(i + 1);
      const fileMatch = /^([^()\s]+)/.exec(rest);
      if (fileMatch && isSourceFilePath(fileMatch[1])) {
        stack.push(fileMatch[1]);
      } else {
        stack.push('');
      }
    } else if (ch === ')') {
      stack.pop();
    }
  }
}

function isSourceFilePath(token: string): boolean {
  if (!token) return false;
  if (token.startsWith('"')) return false;
  return /\.(tex|ltx|sty|cls|cfg|def|clo|aux|bbl|bib|toc|out|log|ldf|fd)$/i.test(token);
}

function currentFile(stack: string[], fallback: string): string {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i]) return stack[i];
  }
  return fallback;
}

interface ErrorBlock {
  headLine: string;
  lookahead: string[];
}

function parseErrorBlock(block: ErrorBlock, context: ParseContext): LogEntry | null {
  const { headLine, lookahead } = block;
  const message = extractErrorMessage(headLine, lookahead);
  if (!message) return null;

  const line = extractErrorLine(lookahead);
  const file = extractErrorFile(headLine, lookahead, context);

  return {
    file,
    line,
    column: 0,
    severity: 'error',
    message,
  };
}

function extractErrorMessage(headLine: string, lookahead: string[]): string | null {
  const packageMatch = PACKAGE_ERROR_REGEX.exec(headLine);
  if (packageMatch) {
    const detail = collectContinuation(lookahead);
    return `Package ${packageMatch[1]}: ${packageMatch[2].trim()}${detail ? ` (${detail})` : ''}`;
  }

  const classMatch = CLASS_ERROR_REGEX.exec(headLine);
  if (classMatch) {
    const detail = collectContinuation(lookahead);
    return `Class ${classMatch[1]}: ${classMatch[2].trim()}${detail ? ` (${detail})` : ''}`;
  }

  const latexMatch = LATEX_ERROR_REGEX.exec(headLine);
  if (latexMatch) {
    const detail = collectContinuation(lookahead);
    return `LaTeX Error: ${latexMatch[1].trim()}${detail ? ` (${detail})` : ''}`;
  }

  const pdfTexMatch = PDFTEX_ERROR_REGEX.exec(headLine);
  if (pdfTexMatch) {
    return `pdfTeX: ${pdfTexMatch[1].trim()}`;
  }

  const generic = GENERIC_ERROR_REGEX.exec(headLine);
  if (generic) {
    return generic[1].trim();
  }

  return null;
}

/** Collects continuation lines after the head until a blank or a `?` prompt. */
function collectContinuation(lookahead: string[]): string {
  const out: string[] = [];
  for (const line of lookahead) {
    const trimmed = line.trim();
    if (!trimmed) break;
    if (trimmed.startsWith('?')) break;
    if (LINE_REF_REGEX.test(trimmed)) break;
    if (trimmed.startsWith('!')) break;
    if (trimmed.startsWith('See the LaTeX manual') || trimmed.startsWith('Type  H <return>')) break;
    out.push(trimmed);
    if (out.length >= 3) break;
  }
  return out.join(' ');
}

function extractErrorLine(lookahead: string[]): number {
  for (const line of lookahead) {
    const match = LINE_REF_REGEX.exec(line.trim());
    if (match) return parseInt(match[1], 10);
    const onInput = ON_INPUT_LINE_REGEX.exec(line);
    if (onInput) return parseInt(onInput[1], 10);
  }
  return 0;
}

function extractErrorFile(headLine: string, lookahead: string[], context: ParseContext): string {
  const fileLineMatch = FILE_LINE_REGEX.exec(headLine);
  if (fileLineMatch) return fileLineMatch[1];

  for (const line of lookahead) {
    const m = FILE_LINE_REGEX.exec(line.trim());
    if (m) return m[1];
  }

  return currentFile(context.fileStack, context.defaultFile);
}

function parseWarningLine(rawLine: string, context: ParseContext): LogEntry | null {
  const packageMatch = PACKAGE_WARNING_REGEX.exec(rawLine);
  if (packageMatch) {
    return {
      file: currentFile(context.fileStack, context.defaultFile),
      line: packageMatch[3] ? parseInt(packageMatch[3], 10) : 0,
      column: 0,
      severity: 'warning',
      message: `Package ${packageMatch[1]}: ${packageMatch[2].trim()}`,
    };
  }

  const classMatch = CLASS_WARNING_REGEX.exec(rawLine);
  if (classMatch) {
    return {
      file: currentFile(context.fileStack, context.defaultFile),
      line: classMatch[3] ? parseInt(classMatch[3], 10) : 0,
      column: 0,
      severity: 'warning',
      message: `Class ${classMatch[1]}: ${classMatch[2].trim()}`,
    };
  }

  const latexMatch = LATEX_WARNING_REGEX.exec(rawLine);
  if (latexMatch) {
    return {
      file: currentFile(context.fileStack, context.defaultFile),
      line: latexMatch[2] ? parseInt(latexMatch[2], 10) : 0,
      column: 0,
      severity: 'warning',
      message: `LaTeX Warning: ${latexMatch[1].trim()}`,
    };
  }

  const pdfTexMatch = PDFTEX_WARNING_REGEX.exec(rawLine);
  if (pdfTexMatch) {
    return {
      file: currentFile(context.fileStack, context.defaultFile),
      line: 0,
      column: 0,
      severity: 'warning',
      message: `pdfTeX warning: ${pdfTexMatch[1].trim()}`,
    };
  }

  const overfull = OVERFULL_REGEX.exec(rawLine);
  if (overfull) {
    const cleaned = rawLine.replace(/\s+at lines? \d+(?:--\d+)?.*$/, '').trim();
    return {
      file: currentFile(context.fileStack, context.defaultFile),
      line: parseInt(overfull[3], 10),
      column: 0,
      severity: 'warning',
      message: cleaned,
    };
  }

  return null;
}

function parseFileLineErrorMode(rawLine: string): LogEntry | null {
  const match = FILE_LINE_REGEX.exec(rawLine);
  if (!match) return null;
  const lower = match[3].toLowerCase();
  const severity: LogSeverity = lower.includes('warning') ? 'warning' : 'error';
  return {
    file: match[1],
    line: parseInt(match[2], 10),
    column: 0,
    severity,
    message: match[3].trim(),
  };
}

function isErrorHead(line: string): boolean {
  return line.startsWith('!') || /^[A-Z][\w./-]*\.[a-z]{2,5}:\d+:/i.test(line);
}

function dedupe(entries: LogEntry[]): LogEntry[] {
  const seen = new Set<string>();
  const result: LogEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.severity}:${entry.file}:${entry.line}:${entry.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

export function parseLog(logText: string, defaultFile = 'main.tex'): LogEntry[] {
  const entries: LogEntry[] = [];
  const lines = logText.replace(/\r\n/g, '\n').split('\n');
  const context: ParseContext = { defaultFile, fileStack: [] };

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    const tectonicEntry = parseTectonicDiagnosticLine(trimmed);
    if (tectonicEntry) {
      entries.push(tectonicEntry);
      updateFileStack(rawLine, context.fileStack);
      continue;
    }

    if (isErrorHead(trimmed)) {
      const lookahead = lines.slice(i + 1, i + 8).map((line) => line.trim());

      const fileLineEntry = parseFileLineErrorMode(trimmed);
      if (fileLineEntry) {
        entries.push(fileLineEntry);
        updateFileStack(rawLine, context.fileStack);
        continue;
      }

      const entry = parseErrorBlock({ headLine: trimmed, lookahead }, context);
      if (entry) {
        entries.push(entry);
      }
      updateFileStack(rawLine, context.fileStack);
      continue;
    }

    const warning = parseWarningLine(trimmed, context);
    if (warning) {
      entries.push(warning);
      updateFileStack(rawLine, context.fileStack);
      continue;
    }

    updateFileStack(rawLine, context.fileStack);
  }

  return dedupe(entries);
}
