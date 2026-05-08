import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import { RuntimeManager } from '../runtime/runtimeManager';
import { detectPlatform } from '../runtime/platform';
import { getOutputChannel, show } from '../core/outputChannel';
import { getWorkspaceRoot } from '../core/projectLocator';
import { getSettings } from '../config/settings';
import { resolveOutputDirectory } from '../core/compiler';
import { validateWorkspaceOutputDirectory } from '../core/workspaceSafety';
import { resolveMainFile } from '../core/mainFileResolver';
import { nodeFileSystemOps } from '../core/nodeFileSystem';
import { buildDoctorReport, DoctorWorkspaceInfo } from '../core/doctorReport';

export async function doctorCommand(storagePath: string): Promise<void> {
  const channel = getOutputChannel();
  channel.clear();
  show();

  const platform = detectPlatform();
  const manager = new RuntimeManager({ storagePath });
  const workspace = await getDoctorWorkspaceInfo();
  const ready = await manager.isReady();

  channel.appendLine(buildDoctorReport({
    platform,
    osRelease: os.release(),
    runtimeVersion: manager.version,
    binaryPath: manager.binaryPath,
    binaryExists: fs.existsSync(manager.binaryPath),
    runtimeReady: ready,
    vscodeVersion: vscode.version,
    nodeVersion: process.version,
    workspace,
  }));
}

async function getDoctorWorkspaceInfo(): Promise<DoctorWorkspaceInfo> {
  const root = getWorkspaceRoot();
  const workspace: DoctorWorkspaceInfo = {
    trusted: vscode.workspace.isTrusted,
    root,
    activeEditor: vscode.window.activeTextEditor?.document.uri.fsPath,
  };

  if (!root) {
    return workspace;
  }

  const settings = getSettings(vscode.Uri.file(root));
  const resolvedOutputDirectory = resolveOutputDirectory(root, settings.outputDirectory);

  workspace.settings = settings;
  workspace.resolvedOutputDirectory = resolvedOutputDirectory;
  workspace.outputDirectoryIssue = validateWorkspaceOutputDirectory(root, resolvedOutputDirectory);
  workspace.resolvedMainFile = await resolveMainFile({
    workspaceRoot: root,
    settingMainFile: settings.mainFile || undefined,
    openEditorFile: workspace.activeEditor,
    fs: nodeFileSystemOps,
  });

  return workspace;
}
