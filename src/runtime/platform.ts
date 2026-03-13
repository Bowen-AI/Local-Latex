import * as os from 'os';

export type PlatformId = 'darwin-arm64' | 'darwin-x64' | 'windows-x64' | 'linux-x64';

export interface PlatformInfo {
  os: NodeJS.Platform;
  arch: string;
  platformId: PlatformId;
}

export const SUPPORTED_PLATFORMS: PlatformId[] = [
  'darwin-arm64',
  'darwin-x64',
  'windows-x64',
  'linux-x64',
];

export function getPlatformId(): PlatformId {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'darwin' && arch === 'arm64') return 'darwin-arm64';
  if (platform === 'darwin') return 'darwin-x64';
  if (platform === 'win32') return 'windows-x64';
  if (platform === 'linux') return 'linux-x64';

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

export function detectPlatform(): PlatformInfo {
  const platformId = getPlatformId();
  return {
    os: os.platform(),
    arch: os.arch(),
    platformId,
  };
}

export function isSupportedPlatform(): boolean {
  try {
    getPlatformId();
    return true;
  } catch {
    return false;
  }
}
