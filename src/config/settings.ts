import * as vscode from 'vscode';
import { DEFAULTS } from './defaults';

export interface ExtensionSettings {
  autoCompileOnSave: boolean;
  compileDebounceMs: number;
  mainFile: string;
  outputDirectory: string;
  offlineOnly: boolean;
  compileTimeoutSec: number;
  previewAutoOpen: boolean;
  previewPreserveFocus: boolean;
  syncTeX: boolean;
  /** Pass --print to Tectonic so BibTeX and engine messages are visible in the output channel. */
  tectonicPrint: boolean;
  /** Pass --keep-logs to Tectonic so intermediate logs are kept under the output directory. */
  tectonicKeepLogs: boolean;
}

export function getSettings(scope?: vscode.Uri): ExtensionSettings {
  const cfg = vscode.workspace.getConfiguration('latexOneClick', scope);
  return {
    autoCompileOnSave: cfg.get<boolean>('autoCompileOnSave', DEFAULTS.autoCompileOnSave),
    compileDebounceMs: cfg.get<number>('compileDebounceMs', DEFAULTS.compileDebounceMs),
    mainFile: cfg.get<string>('mainFile', DEFAULTS.mainFile),
    outputDirectory: cfg.get<string>('outputDirectory', DEFAULTS.outputDirectory),
    offlineOnly: cfg.get<boolean>('offlineOnly', DEFAULTS.offlineOnly),
    compileTimeoutSec: cfg.get<number>('compileTimeoutSec', DEFAULTS.compileTimeoutSec),
    previewAutoOpen: cfg.get<boolean>('preview.autoOpen', DEFAULTS.previewAutoOpen),
    previewPreserveFocus: cfg.get<boolean>('preview.preserveFocus', DEFAULTS.previewPreserveFocus),
    syncTeX: cfg.get<boolean>('syncTeX', DEFAULTS.syncTeX),
    tectonicPrint: cfg.get<boolean>('tectonicPrint', DEFAULTS.tectonicPrint),
    tectonicKeepLogs: cfg.get<boolean>('tectonicKeepLogs', DEFAULTS.tectonicKeepLogs),
  };
}
