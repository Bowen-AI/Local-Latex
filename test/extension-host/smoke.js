const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

function findExtension() {
  return (
    vscode.extensions.getExtension('latex-one-click.latex-one-click') ??
    vscode.extensions.all.find(
      (extension) =>
        extension.packageJSON?.publisher === 'latex-one-click' &&
        extension.packageJSON?.name === 'latex-one-click'
    )
  );
}

async function assertCommandRegistered(command) {
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes(command), `Expected ${command} to be registered`);
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

  for (const command of [
    'latexOneClick.compile',
    'latexOneClick.openPdf',
    'latexOneClick.clean',
    'latexOneClick.selectRoot',
    'latexOneClick.doctor',
  ]) {
    await assertCommandRegistered(command);
  }

  const mainFile = path.join(workspace, 'main.TEX');
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(mainFile));
  await vscode.window.showTextDocument(document);

  await vscode.commands.executeCommand('latexOneClick.doctor');

  const previewState = require(path.join(extension.extensionPath, 'out', 'preview', 'previewState.js'));
  previewState.setCurrentPdf(workspace, path.join(workspace, 'out', 'main.pdf'));
  await vscode.commands.executeCommand('latexOneClick.openPdf');

  const smokeOut = path.join(workspace, '.latex-smoke-out');
  fs.mkdirSync(smokeOut, { recursive: true });
  fs.writeFileSync(path.join(smokeOut, 'temporary.aux'), 'temporary');
  await vscode.workspace
    .getConfiguration('latexOneClick')
    .update('outputDirectory', '.latex-smoke-out', vscode.ConfigurationTarget.Workspace);
  await vscode.commands.executeCommand('latexOneClick.clean');
  assert.deepStrictEqual(fs.readdirSync(smokeOut), []);
}

module.exports = { run };
