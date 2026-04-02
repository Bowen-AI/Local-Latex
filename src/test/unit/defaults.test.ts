import { describe, it, expect } from 'vitest';
import { DEFAULTS } from '../../config/defaults';

describe('config/defaults', () => {
  it('autoCompileOnSave defaults to false', () => {
    expect(DEFAULTS.autoCompileOnSave).toBe(false);
  });

  it('compileDebounceMs defaults to 1000', () => {
    expect(DEFAULTS.compileDebounceMs).toBe(1000);
  });

  it('mainFile defaults to empty string', () => {
    expect(DEFAULTS.mainFile).toBe('');
  });

  it('outputDirectory defaults to "out"', () => {
    expect(DEFAULTS.outputDirectory).toBe('out');
  });

  it('runtimeChannel defaults to "stable"', () => {
    expect(DEFAULTS.runtimeChannel).toBe('stable');
  });

  it('offlineOnly defaults to false', () => {
    expect(DEFAULTS.offlineOnly).toBe(false);
  });

  it('compileTimeoutSec defaults to 60', () => {
    expect(DEFAULTS.compileTimeoutSec).toBe(60);
  });

  it('telemetryEnabled defaults to false', () => {
    expect(DEFAULTS.telemetryEnabled).toBe(false);
  });

  it('previewAutoOpen defaults to true', () => {
    expect(DEFAULTS.previewAutoOpen).toBe(true);
  });

  it('previewPreserveFocus defaults to true', () => {
    expect(DEFAULTS.previewPreserveFocus).toBe(true);
  });

  it('logsVerbosity defaults to "normal"', () => {
    expect(DEFAULTS.logsVerbosity).toBe('normal');
  });

  it('all required keys are present', () => {
    const keys = [
      'autoCompileOnSave', 'compileDebounceMs', 'mainFile', 'outputDirectory',
      'runtimeChannel', 'offlineOnly', 'compileTimeoutSec', 'telemetryEnabled',
      'previewAutoOpen', 'previewPreserveFocus', 'logsVerbosity',
    ];
    for (const key of keys) {
      expect(DEFAULTS).toHaveProperty(key);
    }
  });
});
