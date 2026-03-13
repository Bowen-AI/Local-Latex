import { describe, it, expect } from 'vitest';
import { getPlatformId, detectPlatform, SUPPORTED_PLATFORMS, isSupportedPlatform } from '../../runtime/platform';

describe('platform', () => {
  it('getPlatformId returns a valid PlatformId', () => {
    const id = getPlatformId();
    expect(SUPPORTED_PLATFORMS).toContain(id);
  });

  it('detectPlatform returns os, arch, and platformId', () => {
    const info = detectPlatform();
    expect(info).toHaveProperty('os');
    expect(info).toHaveProperty('arch');
    expect(info).toHaveProperty('platformId');
    expect(SUPPORTED_PLATFORMS).toContain(info.platformId);
  });

  it('isSupportedPlatform returns true on supported platforms', () => {
    expect(isSupportedPlatform()).toBe(true);
  });
});
