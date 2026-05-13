// #region agent log
import * as fs from 'fs';
import * as path from 'path';
import { log as outputChannelLog } from '../core/outputChannel';

/** Used when nothing else is configured (matches this repo’s Cursor debug ingest path). */
const FALLBACK_DEBUG_NDJSON_PATH = '/home/bowenson/Github/Local-Latex/.cursor/debug-c58bc6.log';

let configuredWorkspaceLogPath: string | undefined;
/** Under `context.extensionUri` — when developing, this is usually the Local-Latex repo. */
let extensionHostLogPath: string | undefined;

export function configureExtensionHostDebugLogPath(extensionRootFsPath: string): void {
  extensionHostLogPath = path.join(extensionRootFsPath, '.cursor', 'debug-c58bc6.log');
}

/** Also writes to `<workspaceRoot>/.cursor/debug-c58bc6.log` for whichever folder is open in VS Code. */
export function configureDebugSessionNdjsonPath(workspaceRoot: string): void {
  configuredWorkspaceLogPath = path.join(workspaceRoot, '.cursor', 'debug-c58bc6.log');
}

function allDebugLogTargets(): string[] {
  return [
    ...new Set(
      [configuredWorkspaceLogPath, extensionHostLogPath, FALLBACK_DEBUG_NDJSON_PATH].filter(
        (p): p is string => typeof p === 'string' && p.length > 0
      )
    ),
  ];
}

/** NDJSON debug ingest for agent sessions (session c58bc6). */
export function agentDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
): void {
  const line = `${JSON.stringify({
    sessionId: 'c58bc6',
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
  })}\n`;
  try {
    outputChannelLog(
      `[debug-c58bc6] ${JSON.stringify({ location, message, hypothesisId, data, timestamp: Date.now() })}`
    );
  } catch {
    // ignore
  }
  for (const logPath of allDebugLogTargets()) {
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, line);
    } catch {
      // ignore (e.g. read-only extension install in some VSIX setups)
    }
  }
  void fetch('http://127.0.0.1:7412/ingest/88cc4e72-3bd1-496a-84c9-2f4fee62e1e0', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'c58bc6',
    },
    body: JSON.stringify({
      sessionId: 'c58bc6',
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
    }),
  }).catch(() => {});
}
// #endregion
