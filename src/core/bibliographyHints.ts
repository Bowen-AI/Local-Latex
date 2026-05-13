import * as path from 'path';
import type { FileSystemOps } from './mainFileResolver';
import type { LogEntry } from './logParser';
import { TEX_FILE_REGEX } from './texFiles';

interface BibliographyHintOptions {
  workspaceRoot: string;
  mainFile: string;
  output: string;
  fs: FileSystemOps;
}

interface BibliographyCommandLocation {
  file: string;
  line: number;
}

const CITATION_COMMAND_REGEX = /\\(?:[A-Za-z]*cite[A-Za-z]*|nocite)\s*(?:\[[^\]\n]*\]\s*)*\{/;
const BIBLIOGRAPHY_COMMAND_REGEX = /\\(?:bibliography|addbibresource|printbibliography)\b/;

function stripLineComment(line: string): string {
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '%' && line[index - 1] !== '\\') {
      return line.slice(0, index);
    }
  }
  return line;
}

function workspaceDisplayPath(workspaceRoot: string, file: string): string {
  const relative = path.relative(workspaceRoot, file);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative;
  }
  return file;
}

function hasEmptyGeneratedBibliographyFailure(output: string): boolean {
  return /\.bbl:\d+:/i.test(output) && /missing\s+\\item|Something's wrong--perhaps a missing\s+\\item/i.test(output);
}

async function findWorkspaceTexFiles(
  workspaceRoot: string,
  mainFile: string,
  fs: FileSystemOps
): Promise<string[]> {
  const found = await fs.findFiles(workspaceRoot, TEX_FILE_REGEX);
  return [...new Set([mainFile, ...found])];
}

async function analyzeBibliographyUsage(
  workspaceRoot: string,
  mainFile: string,
  fs: FileSystemOps
): Promise<{ hasCitation: boolean; bibliographyCommand?: BibliographyCommandLocation }> {
  let bibliographyCommand: BibliographyCommandLocation | undefined;
  const files = await findWorkspaceTexFiles(workspaceRoot, mainFile, fs);

  for (const file of files) {
    let content: string;
    try {
      content = await fs.readFile(file);
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const code = stripLineComment(lines[index]);
      if (CITATION_COMMAND_REGEX.test(code)) {
        return { hasCitation: true, bibliographyCommand };
      }
      if (!bibliographyCommand && BIBLIOGRAPHY_COMMAND_REGEX.test(code)) {
        bibliographyCommand = { file, line: index + 1 };
      }
    }
  }

  return { hasCitation: false, bibliographyCommand };
}

export async function detectEmptyBibliographyHint(
  options: BibliographyHintOptions
): Promise<LogEntry | undefined> {
  if (!hasEmptyGeneratedBibliographyFailure(options.output)) {
    return undefined;
  }

  const usage = await analyzeBibliographyUsage(options.workspaceRoot, options.mainFile, options.fs);
  if (usage.hasCitation || !usage.bibliographyCommand) {
    return undefined;
  }

  return {
    file: workspaceDisplayPath(options.workspaceRoot, usage.bibliographyCommand.file),
    line: usage.bibliographyCommand.line,
    column: 0,
    severity: 'error',
    message:
      'Bibliography generated no items. Add a citation such as \\cite{key}, add \\nocite{*}, or remove the bibliography command until references are needed.',
  };
}
