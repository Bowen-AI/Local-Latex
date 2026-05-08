export interface WorkspaceAccessState {
  trusted: boolean;
  root?: string;
}

export function getTrustedWorkspaceBlockReason(state: WorkspaceAccessState): string | undefined {
  if (!state.root) {
    return 'No workspace folder open.';
  }

  if (!state.trusted) {
    return 'Workspace trust is required before this command can access project files.';
  }

  return undefined;
}

export function formatWorkspaceAccessWarning(reason: string): string {
  return `LaTeX One-Click: ${reason}`;
}
