import { describe, expect, it } from 'vitest';
import { formatWorkspaceAccessWarning, getTrustedWorkspaceBlockReason } from '../../core/workspaceAccess';

describe('workspaceAccess', () => {
  it('blocks trusted commands when no workspace folder is open', () => {
    expect(getTrustedWorkspaceBlockReason({ trusted: true })).toBe('No workspace folder open.');
  });

  it('blocks trusted commands in untrusted workspaces', () => {
    expect(getTrustedWorkspaceBlockReason({ trusted: false, root: '/workspace/demo' })).toBe(
      'Workspace trust is required before this command can access project files.'
    );
  });

  it('allows trusted workspace commands when a trusted root exists', () => {
    expect(getTrustedWorkspaceBlockReason({ trusted: true, root: '/workspace/demo' })).toBeUndefined();
  });

  it('formats user-facing warnings consistently', () => {
    expect(formatWorkspaceAccessWarning('No workspace folder open.')).toBe(
      'LaTeX One-Click: No workspace folder open.'
    );
  });
});
