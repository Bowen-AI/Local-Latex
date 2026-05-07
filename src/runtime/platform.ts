import * as os from 'os';

export type PlatformId = 'darwin-arm64' | 'darwin-x64' | 'windows-x64' | 'linux-x64';

export interface PlatformInfo {
  os: NodeJS.Platform;
  arch: string;
  platformId?: PlatformId;
  supported: boolean;
  unsupportedReason?: string;
}

export const SUPPORTED_PLATFORMS: PlatformId[] = [
  'darwin-arm64',
  'darwin-x64',
  'windows-x64',
  'linux-x64',
];

export function resolvePlatformId(platform: NodeJS.Platform, arch: string): PlatformId {
  if (platform === 'darwin' && arch === 'arm64') return 'darwin-arm64';
  if (platform === 'darwin' && arch === 'x64') return 'darwin-x64';
  if (platform === 'win32' && arch === 'x64') return 'windows-x64';
  if (platform === 'linux' && arch === 'x64') return 'linux-x64';

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

export function getPlatformId(): PlatformId {
  return resolvePlatformId(os.platform(), os.arch());
}

export function detectPlatform(): PlatformInfo {
  const platform = os.platform();
  const arch = os.arch();

  try {
    return {
      os: platform,
      arch,
      platformId: resolvePlatformId(platform, arch),
      supported: true,
    };
  } catch (error) {
    return {
      os: platform,
      arch,
      supported: false,
      unsupportedReason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function isSupportedPlatform(platform = os.platform(), arch = os.arch()): boolean {
  try {
    resolvePlatformId(platform, arch);
    return true;
  } catch {
    return false;
  }
}
