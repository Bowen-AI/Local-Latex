import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import { RuntimeManager } from '../runtime/runtimeManager';
import { detectPlatform, isSupportedPlatform } from '../runtime/platform';
import { getOutputChannel, show } from '../core/outputChannel';

export async function doctorCommand(storagePath: string): Promise<void> {
  const channel = getOutputChannel();
  channel.clear();
  show();

  channel.appendLine('=== LaTeX One-Click Doctor ===');
  channel.appendLine('');

  const platform = detectPlatform();
  channel.appendLine(`OS: ${platform.os} (${os.release()})`);
  channel.appendLine(`Architecture: ${platform.arch}`);
  channel.appendLine(`Platform ID: ${platform.platformId}`);
  channel.appendLine(`Supported: ${isSupportedPlatform() ? 'Yes' : 'No'}`);
  channel.appendLine('');

  const manager = new RuntimeManager({ storagePath });
  channel.appendLine(`Tectonic version: ${manager.version}`);
  channel.appendLine(`Binary path: ${manager.binaryPath}`);
  channel.appendLine(`Binary exists: ${fs.existsSync(manager.binaryPath)}`);

  const ready = await manager.isReady();
  channel.appendLine(`Runtime ready: ${ready}`);
  channel.appendLine('');

  channel.appendLine(`VS Code version: ${vscode.version}`);
  channel.appendLine(`Node.js version: ${process.version}`);
  channel.appendLine('');
  channel.appendLine('=== End Doctor ===');
}
