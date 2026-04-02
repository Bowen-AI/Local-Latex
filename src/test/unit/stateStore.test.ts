import { describe, it, expect, beforeEach } from 'vitest';
import { getState, setState, clearState } from '../../core/stateStore';

const WS = '/workspace/test';

beforeEach(() => {
  clearState(WS);
});

describe('stateStore', () => {
  it('returns idle state when no state has been set', () => {
    const state = getState(WS);
    expect(state.status).toBe('idle');
  });

  it('sets and retrieves build status', () => {
    setState(WS, { status: 'building' });
    expect(getState(WS).status).toBe('building');
  });

  it('merges partial updates without losing existing fields', () => {
    setState(WS, { status: 'success', outputFile: '/out/main.pdf' });
    setState(WS, { status: 'error', lastError: 'compile failed' });
    const state = getState(WS);
    expect(state.status).toBe('error');
    expect(state.lastError).toBe('compile failed');
    expect(state.outputFile).toBe('/out/main.pdf');
  });

  it('sets lastBuilt date', () => {
    const now = new Date();
    setState(WS, { status: 'success', lastBuilt: now });
    expect(getState(WS).lastBuilt).toBe(now);
  });

  it('clears state for a workspace', () => {
    setState(WS, { status: 'success' });
    clearState(WS);
    expect(getState(WS).status).toBe('idle');
    expect(getState(WS).outputFile).toBeUndefined();
  });

  it('manages state independently per workspace', () => {
    const ws2 = '/workspace/other';
    setState(WS, { status: 'success' });
    setState(ws2, { status: 'error' });
    expect(getState(WS).status).toBe('success');
    expect(getState(ws2).status).toBe('error');
    clearState(ws2);
  });

  it('stores all BuildState fields', () => {
    const date = new Date('2024-01-01');
    setState(WS, {
      status: 'success',
      lastBuilt: date,
      lastError: undefined,
      outputFile: '/out/doc.pdf',
    });
    const state = getState(WS);
    expect(state.status).toBe('success');
    expect(state.lastBuilt).toBe(date);
    expect(state.outputFile).toBe('/out/doc.pdf');
  });
});
