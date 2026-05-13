import { describe, expect, it } from 'vitest';
import { buildDoctorReport, DoctorReportOptions } from '../../core/doctorReport';
import { PlatformInfo } from '../../runtime/platform';

const supportedPlatform: PlatformInfo = {
  os: 'darwin',
  arch: 'arm64',
  platformId: 'darwin-arm64',
  supported: true,
};

const baseOptions: DoctorReportOptions = {
  platform: supportedPlatform,
  osRelease: '25.0.0',
  runtimeVersion: '0.16.9',
  binaryPath: '/storage/runtime/tectonic',
  binaryExists: true,
  runtimeReady: true,
  vscodeVersion: '1.85.0',
  nodeVersion: 'v20.0.0',
  workspace: {
    trusted: true,
  },
};

function settings(overrides = {}) {
  return {
    autoCompileOnSave: false,
    compileDebounceMs: 1000,
    mainFile: '',
    outputDirectory: 'out',
    offlineOnly: false,
    compileTimeoutSec: 60,
    previewAutoOpen: true,
    previewPreserveFocus: true,
    syncTeX: true,
    tectonicPrint: false,
    tectonicKeepLogs: false,
    ...overrides,
  };
}

describe('doctorReport', () => {
  it('reports platform, runtime, and missing workspace state', () => {
    const report = buildDoctorReport(baseOptions);

    expect(report).toContain('=== LaTeX One-Click Doctor ===');
    expect(report).toContain('Platform ID: darwin-arm64');
    expect(report).toContain('Runtime ready: Yes');
    expect(report).toContain('Root: No workspace folder open');
    expect(report).toContain('VS Code version: 1.85.0');
  });

  it('reports workspace settings, resolved main file, and output directory safety', () => {
    const report = buildDoctorReport({
      ...baseOptions,
      workspace: {
        trusted: true,
        root: '/workspace/demo',
        activeEditor: '/workspace/demo/chapter.TeX',
        settings: settings({ mainFile: 'main.TEX', offlineOnly: true }),
        resolvedMainFile: '/workspace/demo/main.TEX',
        resolvedOutputDirectory: '/workspace/demo/out',
      },
    });

    expect(report).toContain('Root: /workspace/demo');
    expect(report).toContain('Active editor: /workspace/demo/chapter.TeX');
    expect(report).toContain('Main file setting: main.TEX');
    expect(report).toContain('Resolved main file: /workspace/demo/main.TEX');
    expect(report).toContain('Output directory safe: Yes');
    expect(report).toContain('Offline only: Yes');
    expect(report).toContain('SyncTeX: Yes');
    expect(report).toContain('Tectonic --print: No');
    expect(report).toContain('Tectonic --keep-logs: No');
  });

  it('surfaces unsupported platforms and unsafe output directories', () => {
    const report = buildDoctorReport({
      ...baseOptions,
      platform: {
        os: 'linux',
        arch: 'arm64',
        supported: false,
        unsupportedReason: 'Unsupported platform: linux-arm64',
      },
      runtimeReady: false,
      workspace: {
        trusted: true,
        root: '/workspace/demo',
        settings: settings({ outputDirectory: '/tmp/out' }),
        resolvedOutputDirectory: '/tmp/out',
        outputDirectoryIssue: 'Refusing to use an output directory outside the workspace.',
      },
    });

    expect(report).toContain('Supported: No');
    expect(report).toContain('Reason: Unsupported platform: linux-arm64');
    expect(report).toContain('Runtime ready: No');
    expect(report).toContain('Output directory safe: No');
    expect(report).toContain('Output directory issue: Refusing to use an output directory outside the workspace.');
  });
});
