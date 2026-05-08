import * as fs from 'fs';
import * as path from 'path';
import { FileSystemOps } from './mainFileResolver';

export const nodeFileSystemOps: FileSystemOps = {
  exists: async (p) => {
    try {
      fs.accessSync(p);
      return true;
    } catch {
      return false;
    }
  },
  readFile: async (p) => fs.readFileSync(p, 'utf-8'),
  realpath: async (p) => {
    try {
      return fs.realpathSync.native(p);
    } catch {
      return undefined;
    }
  },
  findFiles: async (root, pattern) => {
    const found: string[] = [];
    const visit = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'out') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          visit(fullPath);
          continue;
        }

        if (entry.isFile() && pattern.test(fullPath)) {
          found.push(fullPath);
        }
      }
    };

    visit(root);
    return found;
  },
};
