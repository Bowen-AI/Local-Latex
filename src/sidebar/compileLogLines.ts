export const SIDEBAR_LOG_MAX_LINES = 120;
export const SIDEBAR_LOG_MAX_LINE_LENGTH = 4096;

export function splitClippedLogLines(
  combined: string,
  maxLines = SIDEBAR_LOG_MAX_LINES,
  maxLineLength = SIDEBAR_LOG_MAX_LINE_LENGTH
): string[] {
  let lines = combined.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > maxLines) {
    lines = lines.slice(lines.length - maxLines);
  }
  return lines.map((line) =>
    line.length > maxLineLength ? `${line.slice(0, maxLineLength)}…` : line
  );
}
