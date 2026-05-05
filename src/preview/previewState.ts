import { fileURLToPath } from 'url';

const previewMap = new Map<string, string>();

function stripFragment(uriOrPath: string): string {
  const hashIndex = uriOrPath.indexOf('#');
  return hashIndex >= 0 ? uriOrPath.slice(0, hashIndex) : uriOrPath;
}

function getFragment(uriOrPath: string): string {
  const hashIndex = uriOrPath.indexOf('#');
  return hashIndex >= 0 ? uriOrPath.slice(hashIndex + 1) : '';
}

export function setCurrentPdf(workspaceFolder: string, pdfPath: string): void {
  previewMap.set(workspaceFolder, pdfPath);
}

export function updateCurrentPdfView(workspaceFolder: string, viewUriOrPath: string): void {
  const existing = previewMap.get(workspaceFolder);
  if (!existing) {
    return;
  }

  if (stripFragment(existing) !== stripFragment(viewUriOrPath)) {
    return;
  }

  const fragment = getFragment(viewUriOrPath);
  if (!fragment) {
    return;
  }

  previewMap.set(workspaceFolder, `${stripFragment(existing)}#${fragment}`);
}

export function getCurrentPdfPath(workspaceFolder: string): string | undefined {
  const current = previewMap.get(workspaceFolder);
  if (!current) {
    return undefined;
  }

  const withoutFragment = stripFragment(current);
  if (!withoutFragment.startsWith('file://')) {
    return withoutFragment;
  }

  try {
    return fileURLToPath(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

export function getCurrentPdf(workspaceFolder: string): string | undefined {
  return previewMap.get(workspaceFolder);
}

export function clearPreviewState(workspaceFolder: string): void {
  previewMap.delete(workspaceFolder);
}
