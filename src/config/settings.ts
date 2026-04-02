import * as vscode from 'vscode';
import { DEFAULTS } from './defaults';

export type RuntimeChannel = 'stable' | 'pinned' | 'custom';
export type LogVerbosity = 'normal' | 'verbose' | 'debug';

export interface ExtensionSettings {
  autoCompileOnSave: boolean;
  compileDebounceMs: number;
  mainFile: string;
  outputDirectory: string;
  runtimeChannel: RuntimeChannel;
  offlineOnly: boolean;
  compileTimeoutSec: number;
  telemetryEnabled: boolean;
  previewAutoOpen: boolean;
  previewPreserveFocus: boolean;
  syncTeX: boolean;
  logsVerbosity: LogVerbosity;
}

export function getSettings(scope?: vscode.Uri): ExtensionSettings {
  const cfg = vscode.workspace.getConfiguration('latexOneClick', scope);
  return {
    autoCompileOnSave: cfg.get<boolean>('autoCompileOnSave', DEFAULTS.autoCompileOnSave),
    compileDebounceMs: cfg.get<number>('compileDebounceMs', DEFAULTS.compileDebounceMs),
    mainFile: cfg.get<string>('mainFile', DEFAULTS.mainFile),
    outputDirectory: cfg.get<string>('outputDirectory', DEFAULTS.outputDirectory),
    runtimeChannel: cfg.get<RuntimeChannel>('runtimeChannel', DEFAULTS.runtimeChannel),
    offlineOnly: cfg.get<boolean>('offlineOnly', DEFAULTS.offlineOnly),
    compileTimeoutSec: cfg.get<number>('compileTimeoutSec', DEFAULTS.compileTimeoutSec),
    telemetryEnabled: cfg.get<boolean>('telemetry.enabled', DEFAULTS.telemetryEnabled),
    previewAutoOpen: cfg.get<boolean>('preview.autoOpen', DEFAULTS.previewAutoOpen),
    previewPreserveFocus: cfg.get<boolean>('preview.preserveFocus', DEFAULTS.previewPreserveFocus),
    syncTeX: cfg.get<boolean>('syncTeX', DEFAULTS.syncTeX),
    logsVerbosity: cfg.get<LogVerbosity>('logs.verbosity', DEFAULTS.logsVerbosity),
  };
}
