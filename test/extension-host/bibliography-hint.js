const assert = require('assert');
const path = require('path');
const vscode = require('vscode');

function findExtension() {
  return (
    vscode.extensions.getExtension('BowenAI.latex-one-click') ??
    vscode.extensions.all.find(
      (extension) =>
        extension.packageJSON?.publisher === 'BowenAI' &&
        extension.packageJSON?.name === 'latex-one-click'
    )
  );
}

async function run() {
  const workspace = process.env.LATEX_ONE_CLICK_SMOKE_WORKSPACE;
  assert.ok(workspace, 'LATEX_ONE_CLICK_SMOKE_WORKSPACE must be set');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder, 'Expected a workspace folder');
  assert.strictEqual(workspaceFolder.uri.fsPath, workspace);

  const extension = findExtension();
  assert.ok(extension, 'Expected LaTeX One-Click extension to be discoverable');
  await extension.activate();
  assert.ok(extension.isActive, 'Expected LaTeX One-Click extension to activate');

  const mainFile = path.join(workspace, 'main.tex');
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(mainFile));
  await vscode.window.showTextDocument(document);

  await vscode.commands.executeCommand('latexOneClick.compile');

  const compileState = require(path.join(extension.extensionPath, 'out', 'sidebar', 'compileSidebarState.js'));
  const snap = compileState.getCompileSnapshot(workspace);
  assert.ok(snap, 'Expected compile snapshot after failed compile');
  assert.strictEqual(snap.success, false, 'Expected compile to fail for empty generated bibliography');

  const hint = snap.logs.find((entry) => entry.message.includes('Bibliography generated no items'));
  assert.ok(hint, `Expected empty-bibliography hint; logs were ${JSON.stringify(snap.logs)}`);
  assert.strictEqual(hint.file, 'main.tex');
  assert.strictEqual(hint.line, 4);

  const bblDiagnostic = snap.logs.find((entry) => entry.file === 'main.bbl' && entry.line === 2);
  assert.ok(bblDiagnostic, `Expected Tectonic main.bbl diagnostic; logs were ${JSON.stringify(snap.logs)}`);
}

module.exports = { run };
