import { describe, it, expect } from 'vitest';
import {
  detectPlatform,
  getPlatformId,
  isSupportedPlatform,
  resolvePlatformId,
  SUPPORTED_PLATFORMS,
} from '../../runtime/platform';

describe('platform', () => {
  it('maps only explicitly supported platform and architecture pairs', () => {
    expect(resolvePlatformId('darwin', 'arm64')).toBe('darwin-arm64');
    expect(resolvePlatformId('darwin', 'x64')).toBe('darwin-x64');
    expect(resolvePlatformId('win32', 'x64')).toBe('windows-x64');
    expect(resolvePlatformId('linux', 'x64')).toBe('linux-x64');
  });

  it('rejects unsupported arm64 platforms instead of falling back to x64 runtimes', () => {
    expect(() => resolvePlatformId('linux', 'arm64')).toThrow('Unsupported platform: linux-arm64');
    expect(() => resolvePlatformId('win32', 'arm64')).toThrow('Unsupported platform: win32-arm64');
  });

  it('getPlatformId returns a valid PlatformId', () => {
    const id = getPlatformId();
    expect(SUPPORTED_PLATFORMS).toContain(id);
  });

  it('detectPlatform returns os, arch, support status, and platformId when supported', () => {
    const info = detectPlatform();
    expect(info).toHaveProperty('os');
    expect(info).toHaveProperty('arch');
    expect(info).toHaveProperty('supported');
    if (info.supported) {
      expect(SUPPORTED_PLATFORMS).toContain(info.platformId);
    }
  });

  it('isSupportedPlatform returns true on supported platforms', () => {
    expect(isSupportedPlatform()).toBe(true);
    expect(isSupportedPlatform('linux', 'arm64')).toBe(false);
  });
});
