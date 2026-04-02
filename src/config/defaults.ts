export const DEFAULTS = {
  autoCompileOnSave: false,
  compileDebounceMs: 1000,
  mainFile: '',
  outputDirectory: 'out',
  runtimeChannel: 'stable' as const,
  offlineOnly: false,
  compileTimeoutSec: 60,
  telemetryEnabled: false,
  previewAutoOpen: true,
  previewPreserveFocus: true,
  syncTeX: true,
  logsVerbosity: 'normal' as const,
};
