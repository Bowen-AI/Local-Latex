const assert = require('assert');
const fs = require('fs');
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
    'latexOneClick.revealTexLocation',
    'latexOneClick.sidebarToggleBool',
    'latexOneClick.sidebarEditOutputDirectory',
  ]) {
    await assertCommandRegistered(command);
  }

  const mainFile = path.join(workspace, 'main.TEX');
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(mainFile));
  await vscode.window.showTextDocument(document);

  const { ProjectTreeProvider } = require(path.join(extension.extensionPath, 'out', 'sidebar', 'projectTreeProvider.js'));
  const projectTreeProvider = new ProjectTreeProvider();
  const topLevelProjectItems = await projectTreeProvider.getChildren();
  assert.deepStrictEqual(
    topLevelProjectItems.map((item) => item.title),
    ['Compile document', 'Open PDF preview', 'Advanced'],
    'Expected only primary actions plus Advanced at the top level'
  );
  assert.ok(
    !topLevelProjectItems.some((item) => ['mainFile', 'outputDir', 'toggle'].includes(item.kind)),
    'Expected settings to be hidden from the top level'
  );
  const advancedProjectItem = topLevelProjectItems.find((item) => item.kind === 'group' && item.id === 'advanced');
  assert.ok(advancedProjectItem, 'Expected an Advanced project tree group');
  const advancedProjectItems = await projectTreeProvider.getChildren(advancedProjectItem);
  assert.ok(advancedProjectItems.some((item) => item.kind === 'mainFile'), 'Expected Advanced to contain main file');
  assert.ok(advancedProjectItems.some((item) => item.kind === 'outputDir'), 'Expected Advanced to contain output directory');
  assert.ok(advancedProjectItems.some((item) => item.kind === 'toggle'), 'Expected Advanced to contain settings toggles');
  assert.ok(
    advancedProjectItems.some((item) => item.kind === 'action' && item.command === 'latexOneClick.clean'),
    'Expected Advanced to contain Clean'
  );
  assert.ok(
    advancedProjectItems.some((item) => item.kind === 'action' && item.command === 'latexOneClick.doctor'),
    'Expected Advanced to contain Doctor'
  );

  await vscode.commands.executeCommand('latexOneClick.doctor');

  const previewState = require(path.join(extension.extensionPath, 'out', 'preview', 'previewState.js'));
  const pdfPreview = require(path.join(extension.extensionPath, 'out', 'preview', 'pdfPreview.js'));
  const previewReady = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      disposable.dispose();
      reject(new Error('Timed out waiting for PDF preview ready timing event'));
    }, 15000);
    const disposable = pdfPreview.onPdfPreviewPerf((event) => {
      if (event.phase !== 'ready') {
        return;
      }
      clearTimeout(timeout);
      disposable.dispose();
      assert.strictEqual(event.pageCount, 1, 'Expected smoke PDF to render as one page');
      assert.ok(event.totalMs >= 0, 'Expected preview timing to include totalMs');
      resolve(event);
    });
  });

  previewState.setCurrentPdf(workspace, path.join(workspace, 'out', 'main.pdf'));
  await vscode.commands.executeCommand('latexOneClick.openPdf');
  await previewReady;

  const previewReloaded = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      disposable.dispose();
      reject(new Error('Timed out waiting for PDF preview reload timing event'));
    }, 15000);
    const disposable = pdfPreview.onPdfPreviewPerf((event) => {
      if (event.phase !== 'ready') {
        return;
      }
      clearTimeout(timeout);
      disposable.dispose();
      assert.strictEqual(event.pageCount, 1, 'Expected reloaded smoke PDF to render as one page');
      resolve(event);
    });
  });

  await pdfPreview.openPdf(path.join(workspace, 'out', 'main.pdf'), workspace, true, extension.extensionUri, {
    invalidatePreviewNonce: Date.now(),
  });
  await previewReloaded;

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
