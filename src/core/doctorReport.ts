import { PlatformInfo } from '../runtime/platform';
import { ExtensionSettings } from '../config/settings';

export interface DoctorWorkspaceInfo {
  trusted: boolean;
  root?: string;
  activeEditor?: string;
  settings?: ExtensionSettings;
  resolvedMainFile?: string;
  resolvedOutputDirectory?: string;
  outputDirectoryIssue?: string;
}

export interface DoctorReportOptions {
  platform: PlatformInfo;
  osRelease: string;
  runtimeVersion: string;
  binaryPath: string;
  binaryExists: boolean;
  runtimeReady: boolean;
  vscodeVersion: string;
  nodeVersion: string;
  workspace: DoctorWorkspaceInfo;
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

export function buildDoctorReport(options: DoctorReportOptions): string {
  const lines: string[] = [
    '=== LaTeX One-Click Doctor ===',
    '',
    'Platform',
    `OS: ${options.platform.os} (${options.osRelease})`,
    `Architecture: ${options.platform.arch}`,
    `Platform ID: ${options.platform.platformId ?? 'n/a'}`,
    `Supported: ${yesNo(options.platform.supported)}`,
  ];

  if (options.platform.unsupportedReason) {
    lines.push(`Reason: ${options.platform.unsupportedReason}`);
  }

  lines.push(
    '',
    'Runtime',
    `Tectonic version: ${options.runtimeVersion}`,
    `Binary path: ${options.binaryPath}`,
    `Binary exists: ${yesNo(options.binaryExists)}`,
    `Runtime ready: ${yesNo(options.runtimeReady)}`,
    '',
    'Workspace',
    `Trusted: ${yesNo(options.workspace.trusted)}`,
    `Root: ${options.workspace.root ?? 'No workspace folder open'}`
  );

  if (options.workspace.activeEditor) {
    lines.push(`Active editor: ${options.workspace.activeEditor}`);
  }

  if (options.workspace.settings) {
    const settings = options.workspace.settings;
    lines.push(
      `Main file setting: ${settings.mainFile || '(auto)'}`,
      `Resolved main file: ${options.workspace.resolvedMainFile ?? 'Not found'}`,
      `Output directory setting: ${settings.outputDirectory}`,
      `Resolved output directory: ${options.workspace.resolvedOutputDirectory ?? 'n/a'}`,
      `Output directory safe: ${options.workspace.outputDirectoryIssue ? 'No' : 'Yes'}`
    );

    if (options.workspace.outputDirectoryIssue) {
      lines.push(`Output directory issue: ${options.workspace.outputDirectoryIssue}`);
    }

    lines.push(
      `Auto-compile on save: ${yesNo(settings.autoCompileOnSave)}`,
      `Compile debounce: ${settings.compileDebounceMs}ms`,
      `Compile timeout: ${settings.compileTimeoutSec}s`,
      `Offline only: ${yesNo(settings.offlineOnly)}`,
      `Preview auto-open: ${yesNo(settings.previewAutoOpen)}`,
      `Preview preserve focus: ${yesNo(settings.previewPreserveFocus)}`,
      `SyncTeX: ${yesNo(settings.syncTeX)}`,
      `Tectonic --print: ${yesNo(settings.tectonicPrint)}`,
      `Tectonic --keep-logs: ${yesNo(settings.tectonicKeepLogs)}`
    );
  }

  lines.push(
    '',
    'Host',
    `VS Code version: ${options.vscodeVersion}`,
    `Node.js version: ${options.nodeVersion}`,
    '',
    '=== End Doctor ==='
  );

  return lines.join('\n');
}
