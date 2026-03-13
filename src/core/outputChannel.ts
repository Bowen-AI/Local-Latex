import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('LaTeX One-Click');
  }
  return channel;
}

export function log(message: string): void {
  getOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function show(): void {
  getOutputChannel().show(true);
}

export function disposeOutputChannel(): void {
  channel?.dispose();
  channel = undefined;
}
