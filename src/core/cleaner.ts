import * as fs from 'fs';
import * as path from 'path';
import { validateWorkspaceOutputDirectory } from './workspaceSafety';

export interface CleanOutputResult {
  removed: number;
  missing: boolean;
  blockedReason?: string;
}

export function validateCleanTarget(workspaceRoot: string, outputDirectory: string): string | undefined {
  return validateWorkspaceOutputDirectory(workspaceRoot, outputDirectory)?.replace('use', 'clean');
}

export function cleanOutputDirectory(workspaceRoot: string, outputDirectory: string): CleanOutputResult {
  const blockedReason = validateCleanTarget(workspaceRoot, outputDirectory);
  if (blockedReason) {
    return { removed: 0, missing: false, blockedReason };
  }

  if (!fs.existsSync(outputDirectory)) {
    return { removed: 0, missing: true };
  }

  const entries = fs.readdirSync(outputDirectory);
  for (const entry of entries) {
    fs.rmSync(path.join(outputDirectory, entry), { recursive: true, force: true });
  }

  return { removed: entries.length, missing: false };
}
