export const TEX_FILE_REGEX = /\.tex$/i;
export const TEX_FILE_GLOB = '**/*.[tT][eE][xX]';

export function isTexFile(filePath: string): boolean {
  return TEX_FILE_REGEX.test(filePath);
}
