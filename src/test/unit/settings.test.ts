import { describe, it, expect, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({ get: mockGet })),
  },
  Uri: { file: (p: string) => ({ fsPath: p }) },
}));

import { getSettings } from '../../config/settings';
import { DEFAULTS } from '../../config/defaults';

function setupMockConfig(overrides: Record<string, unknown> = {}): void {
  mockGet.mockImplementation((key: string, defaultValue: unknown) => {
    return key in overrides ? overrides[key] : defaultValue;
  });
}

describe('config/settings – getSettings', () => {
  it('returns default values when no configuration is set', () => {
    setupMockConfig();
    const settings = getSettings();
    expect(settings.autoCompileOnSave).toBe(DEFAULTS.autoCompileOnSave);
    expect(settings.compileDebounceMs).toBe(DEFAULTS.compileDebounceMs);
    expect(settings.mainFile).toBe(DEFAULTS.mainFile);
    expect(settings.outputDirectory).toBe(DEFAULTS.outputDirectory);
    expect(settings.runtimeChannel).toBe(DEFAULTS.runtimeChannel);
    expect(settings.offlineOnly).toBe(DEFAULTS.offlineOnly);
    expect(settings.compileTimeoutSec).toBe(DEFAULTS.compileTimeoutSec);
    expect(settings.telemetryEnabled).toBe(DEFAULTS.telemetryEnabled);
    expect(settings.previewAutoOpen).toBe(DEFAULTS.previewAutoOpen);
    expect(settings.previewPreserveFocus).toBe(DEFAULTS.previewPreserveFocus);
    expect(settings.logsVerbosity).toBe(DEFAULTS.logsVerbosity);
  });

  it('returns configured autoCompileOnSave when set', () => {
    setupMockConfig({ autoCompileOnSave: true });
    const settings = getSettings();
    expect(settings.autoCompileOnSave).toBe(true);
  });

  it('returns configured mainFile when set', () => {
    setupMockConfig({ mainFile: 'thesis.tex' });
    const settings = getSettings();
    expect(settings.mainFile).toBe('thesis.tex');
  });

  it('returns configured outputDirectory when set', () => {
    setupMockConfig({ outputDirectory: 'build' });
    const settings = getSettings();
    expect(settings.outputDirectory).toBe('build');
  });

  it('returns configured runtimeChannel when set to pinned', () => {
    setupMockConfig({ runtimeChannel: 'pinned' });
    const settings = getSettings();
    expect(settings.runtimeChannel).toBe('pinned');
  });

  it('returns configured compileTimeoutSec when set', () => {
    setupMockConfig({ compileTimeoutSec: 120 });
    const settings = getSettings();
    expect(settings.compileTimeoutSec).toBe(120);
  });

  it('returns configured verbosity when set to debug', () => {
    setupMockConfig({ 'logs.verbosity': 'debug' });
    const settings = getSettings();
    expect(settings.logsVerbosity).toBe('debug');
  });

  it('returns all 11 expected setting keys', () => {
    setupMockConfig();
    const settings = getSettings();
    const keys: (keyof typeof settings)[] = [
      'autoCompileOnSave', 'compileDebounceMs', 'mainFile', 'outputDirectory',
      'runtimeChannel', 'offlineOnly', 'compileTimeoutSec', 'telemetryEnabled',
      'previewAutoOpen', 'previewPreserveFocus', 'logsVerbosity',
    ];
    for (const key of keys) {
      expect(settings).toHaveProperty(key);
    }
  });
});
