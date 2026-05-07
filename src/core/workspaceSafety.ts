import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export function isPathInside(parentPath: string, candidatePath: string): boolean {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === '' || (relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function realpathIfExists(targetPath: string): string | undefined {
  try {
    return fs.realpathSync.native(targetPath);
  } catch {
    return undefined;
  }
}

function nearestExistingPath(targetPath: string): string | undefined {
  let current = path.resolve(targetPath);

  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }

  return current;
}

export function validateWorkspaceOutputDirectory(
  workspaceRoot: string,
  outputDirectory: string
): string | undefined {
  const workspace = path.resolve(workspaceRoot);
  const target = path.resolve(outputDirectory);
  const root = path.parse(target).root;
  const home = path.resolve(os.homedir());
  const realWorkspace = realpathIfExists(workspace);
  const realHome = realpathIfExists(home) ?? home;

  if (target === root) {
    return 'Refusing to use a filesystem root as the output directory.';
  }

  if (target === home) {
    return 'Refusing to use the user home directory as the output directory.';
  }

  if (target === workspace) {
    return 'Refusing to use the workspace root as the output directory.';
  }

  if (!isPathInside(workspace, target)) {
    return 'Refusing to use an output directory outside the workspace.';
  }

  if (!realWorkspace) {
    return undefined;
  }

  const realTarget = realpathIfExists(target);
  if (realTarget) {
    if (realTarget === path.parse(realTarget).root) {
      return 'Refusing to use a filesystem root as the output directory.';
    }

    if (realTarget === realHome) {
      return 'Refusing to use the user home directory as the output directory.';
    }

    if (realTarget === realWorkspace) {
      return 'Refusing to use the workspace root as the output directory.';
    }

    if (!isPathInside(realWorkspace, realTarget)) {
      return 'Refusing to use an output directory outside the workspace.';
    }

    return undefined;
  }

  const existingAncestor = nearestExistingPath(target);
  const realAncestor = existingAncestor ? realpathIfExists(existingAncestor) : undefined;
  if (realAncestor && !isPathInside(realWorkspace, realAncestor)) {
    return 'Refusing to use an output directory outside the workspace.';
  }

  return undefined;
}
