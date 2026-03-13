const previewMap = new Map<string, string>();

export function setCurrentPdf(workspaceFolder: string, pdfPath: string): void {
  previewMap.set(workspaceFolder, pdfPath);
}

export function getCurrentPdf(workspaceFolder: string): string | undefined {
  return previewMap.get(workspaceFolder);
}

export function clearPreviewState(workspaceFolder: string): void {
  previewMap.delete(workspaceFolder);
}
