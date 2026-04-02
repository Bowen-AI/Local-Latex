import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

const mockChannel = {
  appendLine: vi.fn(),
  show: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => mockChannel),
  },
}));

import { log, show, disposeOutputChannel, getOutputChannel } from '../../core/outputChannel';

beforeEach(() => {
  vi.clearAllMocks();
  disposeOutputChannel();
});

describe('core/outputChannel', () => {
  it('getOutputChannel creates a new output channel on first call', () => {
    const ch = getOutputChannel();
    expect(ch).toBe(mockChannel);
  });

  it('getOutputChannel returns the same channel on subsequent calls', () => {
    const ch1 = getOutputChannel();
    const ch2 = getOutputChannel();
    expect(ch1).toBe(ch2);
  });

  it('log appends a timestamped message to the output channel', () => {
    log('hello');
    expect(mockChannel.appendLine).toHaveBeenCalledOnce();
    const call = mockChannel.appendLine.mock.calls[0][0] as string;
    expect(call).toContain('hello');
    expect(call).toMatch(/^\[.*\]/);
  });

  it('log includes an ISO timestamp', () => {
    log('test message');
    const call = mockChannel.appendLine.mock.calls[0][0] as string;
    expect(call).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('show reveals the output channel', () => {
    show();
    expect(mockChannel.show).toHaveBeenCalledOnce();
  });

  it('disposeOutputChannel disposes and resets the channel', () => {
    getOutputChannel(); // initialize
    vi.clearAllMocks();
    disposeOutputChannel();
    expect(mockChannel.dispose).toHaveBeenCalledOnce();
  });

  it('creates a fresh channel after dispose', () => {
    getOutputChannel();
    disposeOutputChannel();
    vi.clearAllMocks();
    getOutputChannel();
    // createOutputChannel called again after dispose
    const { window } = vscode;
    expect(window.createOutputChannel).toHaveBeenCalledOnce();
  });
});
