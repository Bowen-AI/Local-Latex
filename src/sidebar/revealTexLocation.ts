import * as vscode from 'vscode';
import * as path from 'path';

export async function revealTexLocationCommand(
  workspaceRoot?: string,
  relativeOrAbsFile?: string,
  line1Based?: number,
  col0Based?: number
): Promise<void> {
  if (
    typeof workspaceRoot !== 'string' ||
    typeof relativeOrAbsFile !== 'string' ||
    typeof line1Based !== 'number' ||
    typeof col0Based !== 'number'
  ) {
    return;
  }

  const abs = path.isAbsolute(relativeOrAbsFile)
    ? relativeOrAbsFile
    : path.join(workspaceRoot, relativeOrAbsFile);

  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(abs));
  const editor = await vscode.window.showTextDocument(doc);
  const line = Math.max(0, line1Based - 1);
  const col = Math.max(0, col0Based);
  const pos = new vscode.Position(line, col);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
}
