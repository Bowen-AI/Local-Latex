export type BuildStatus = 'idle' | 'building' | 'success' | 'error';

export interface BuildState {
  status: BuildStatus;
  lastBuilt?: Date;
  lastError?: string;
  outputFile?: string;
}

const store = new Map<string, BuildState>();

export function getState(workspaceFolder: string): BuildState {
  return store.get(workspaceFolder) ?? { status: 'idle' };
}

export function setState(workspaceFolder: string, state: Partial<BuildState>): void {
  const current = getState(workspaceFolder);
  store.set(workspaceFolder, { ...current, ...state });
}

export function clearState(workspaceFolder: string): void {
  store.delete(workspaceFolder);
}
