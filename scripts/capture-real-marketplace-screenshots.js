#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CODE_CLI = process.env.VSCODE_CLI || findDefaultVsCodeCli();
const WORKSPACE = path.join(ROOT, 'examples', 'demo-paper');
const OUTPUT_DIR = path.join(ROOT, 'resources', 'readme');
const WEBSITE_ASSET_DIR = path.join(ROOT, 'website', 'assets');
const EXTENSION_ID = 'BowenAI.latex-one-click';
const PORT = Number(process.env.LATEX_ONE_CLICK_CAPTURE_PORT || '9347');
const PHASE_TIMEOUT_MS = 90_000;

const OUTPUTS = {
  command: path.join(OUTPUT_DIR, 'gui-command-palette.png'),
  preview: path.join(OUTPUT_DIR, 'gui-pdf-preview.png'),
  synctex: path.join(OUTPUT_DIR, 'gui-status-bar.png'),
  workflow: path.join(OUTPUT_DIR, 'workflow-demo.png'),
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findExecutable(name) {
  const pathValue = process.env.PATH || '';
  const suffixes = process.platform === 'win32' ? ['', '.cmd', '.exe', '.bat'] : [''];
  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) {
      continue;
    }
    for (const suffix of suffixes) {
      const candidate = path.join(dir, `${name}${suffix}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

function findDefaultVsCodeCli() {
  return (
    findExecutable('code') ||
    findExecutable('code-insiders') ||
    '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
  );
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getPlatformId() {
  const osName = os.platform();
  const arch = os.arch();
  if (osName === 'darwin' && arch === 'arm64') return 'darwin-arm64';
  if (osName === 'darwin' && arch === 'x64') return 'darwin-x64';
  if (osName === 'linux' && arch === 'x64') return 'linux-x64';
  if (osName === 'win32' && arch === 'x64') return 'windows-x64';
  return `${osName}-${arch}`;
}

function seedRuntime(userDataDir) {
  const manifest = readJson(path.join(ROOT, 'resources', 'runtime-manifest.json'));
  const platformId = getPlatformId();
  const entry = manifest.platforms?.[platformId];
  if (!entry) {
    throw new Error(`No runtime manifest entry for ${platformId}`);
  }

  const storageDir = path.join(userDataDir, 'User', 'globalStorage', EXTENSION_ID);
  const runtimeDir = path.join(storageDir, 'runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });

  const binaryPath = path.join(runtimeDir, process.platform === 'win32' ? 'tectonic.exe' : 'tectonic');
  if (process.platform === 'win32') {
    fs.writeFileSync(binaryPath, '@echo off\r\necho tectonic capture runtime\r\n');
  } else {
    fs.writeFileSync(binaryPath, '#!/bin/sh\necho tectonic capture runtime\n');
    fs.chmodSync(binaryPath, 0o755);
  }

  fs.writeFileSync(
    path.join(runtimeDir, 'manifest.json'),
    JSON.stringify(
      {
        version: manifest.version,
        platform: platformId,
        sha256: entry.sha256,
        binary: entry.binary,
      },
      null,
      2
    )
  );
}

function writeSettings(userDataDir) {
  const userDir = path.join(userDataDir, 'User');
  fs.mkdirSync(userDir, { recursive: true });
  fs.writeFileSync(
    path.join(userDir, 'settings.json'),
    JSON.stringify(
      {
        'editor.fontSize': 14,
        'editor.lineHeight': 22,
        'editor.minimap.enabled': false,
        'extensions.ignoreRecommendations': true,
        'git.enabled': false,
        'git.openRepositoryInParentFolders': 'never',
        'security.workspace.trust.enabled': false,
        'telemetry.telemetryLevel': 'off',
        'update.mode': 'none',
        'workbench.colorTheme': 'Default Light Modern',
        'workbench.editor.showTabs': true,
        'workbench.layoutControl.enabled': false,
        'workbench.startupEditor': 'none',
        'window.commandCenter': true,
      },
      null,
      2
    )
  );
}

function writeTestModule(tmpRoot) {
  const testPath = path.join(tmpRoot, 'capture-extension-host.js');
  const source = `
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

const workspace = process.env.LATEX_ONE_CLICK_CAPTURE_WORKSPACE;
const phaseDir = process.env.LATEX_ONE_CLICK_CAPTURE_PHASE_DIR;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function waitForAdvance(name) {
  fs.writeFileSync(path.join(phaseDir, name + '.ready'), 'ready');
  const advanceFile = path.join(phaseDir, name + '.advance');
  const started = Date.now();
  while (!fs.existsSync(advanceFile)) {
    if (Date.now() - started > 90000) {
      throw new Error('Timed out waiting for advance file: ' + advanceFile);
    }
    await sleep(250);
  }
}

async function waitForPreviewReady(extension) {
  const pdfPreview = require(path.join(extension.extensionPath, 'out', 'preview', 'pdfPreview.js'));
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      disposable.dispose();
      reject(new Error('Timed out waiting for PDF preview ready event'));
    }, 20000);
    const disposable = pdfPreview.onPdfPreviewPerf((event) => {
      if (event.phase !== 'ready') {
        return;
      }
      clearTimeout(timeout);
      disposable.dispose();
      resolve(event);
    });
  });
}

async function clearNotifications() {
  for (const command of ['notifications.clearAll', 'workbench.action.closeMessages']) {
    try {
      await vscode.commands.executeCommand(command);
    } catch {
      // Command availability differs by VS Code build.
    }
  }
}

async function run() {
  if (!workspace || !phaseDir) {
    throw new Error('LATEX_ONE_CLICK_CAPTURE_WORKSPACE and LATEX_ONE_CLICK_CAPTURE_PHASE_DIR are required');
  }

  const extension = findExtension();
  if (!extension) {
    throw new Error('LaTeX One-Click extension not found');
  }
  await extension.activate();

  const mainFile = path.join(workspace, 'main.tex');
  const findingsFile = path.join(workspace, 'sections', 'findings.tex');
  const pdfFile = path.join(workspace, 'out', 'main.pdf');

  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  await vscode.commands.executeCommand('workbench.action.closePanel');
  await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
  await vscode.commands.executeCommand('workbench.view.extension.latexOneClick');
  await clearNotifications();

  const mainDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(mainFile));
  await vscode.window.showTextDocument(mainDocument, { viewColumn: vscode.ViewColumn.One, preview: false });
  await vscode.commands.executeCommand('workbench.view.extension.latexOneClick');
  await clearNotifications();

  await vscode.commands.executeCommand('workbench.action.quickOpen', '>LaTeX');
  await sleep(2500);
  await waitForAdvance('command');
  try {
    await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
  } catch {
    await vscode.commands.executeCommand('workbench.action.closeMessages');
  }
  await vscode.commands.executeCommand('workbench.view.extension.latexOneClick');
  await clearNotifications();
  await sleep(1000);

  const previewState = require(path.join(extension.extensionPath, 'out', 'preview', 'previewState.js'));
  previewState.setCurrentPdf(workspace, pdfFile);
  const previewReady = waitForPreviewReady(extension);
  await vscode.commands.executeCommand('latexOneClick.openPdf');
  await previewReady;
  await clearNotifications();
  await sleep(3500);
  await waitForAdvance('preview');

  const findingsDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(findingsFile));
  const editor = await vscode.window.showTextDocument(findingsDocument, { viewColumn: vscode.ViewColumn.One, preview: false });
  const line = Math.min(11, Math.max(0, findingsDocument.lineCount - 1));
  const pos = new vscode.Position(line, 0);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  await vscode.commands.executeCommand('workbench.view.extension.latexOneClick');
  await clearNotifications();
  await sleep(1800);
  await waitForAdvance('synctex');
}

module.exports = { run };
`;
  fs.writeFileSync(testPath, source);
  return testPath;
}

function httpJson(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: pathname, timeout: 5000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Timed out reading ${pathname}`));
    });
  });
}

async function waitForWorkbenchTarget() {
  const started = Date.now();
  while (Date.now() - started < PHASE_TIMEOUT_MS) {
    try {
      const targets = await httpJson('/json/list');
      const target =
        targets.find((entry) => entry.type === 'page' && String(entry.url).includes('workbench.html')) ||
        targets.find((entry) => entry.type === 'page' && entry.webSocketDebuggerUrl);
      if (target?.webSocketDebuggerUrl) {
        return target;
      }
    } catch {
      // VS Code is still starting.
    }
    await sleep(500);
  }
  throw new Error('Timed out waiting for VS Code DevTools target');
}

class CdpSocket {
  constructor(url) {
    this.url = new URL(url);
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
  }

  connect() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString('base64');
      const socket = net.connect(Number(this.url.port), this.url.hostname, () => {
        socket.write(
          [
            `GET ${this.url.pathname}${this.url.search} HTTP/1.1`,
            `Host: ${this.url.host}`,
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Key: ${key}`,
            'Sec-WebSocket-Version: 13',
            '',
            '',
          ].join('\r\n')
        );
      });
      this.socket = socket;

      let handshake = Buffer.alloc(0);
      const onHandshakeData = (chunk) => {
        handshake = Buffer.concat([handshake, chunk]);
        const marker = handshake.indexOf('\r\n\r\n');
        if (marker === -1) {
          return;
        }
        const head = handshake.slice(0, marker).toString('utf8');
        if (!head.includes(' 101 ')) {
          reject(new Error(`WebSocket handshake failed: ${head.split('\r\n')[0]}`));
          socket.destroy();
          return;
        }
        socket.off('data', onHandshakeData);
        socket.on('data', (data) => this.handleData(data));
        const rest = handshake.slice(marker + 4);
        if (rest.length) {
          this.handleData(rest);
        }
        resolve();
      };

      socket.on('data', onHandshakeData);
      socket.on('error', reject);
      socket.on('close', () => {
        for (const { reject: rejectPending } of this.pending.values()) {
          rejectPending(new Error('CDP socket closed'));
        }
        this.pending.clear();
      });
    });
  }

  send(method, params) {
    const id = this.nextId++;
    const message = JSON.stringify({ id, method, ...(params ? { params } : {}) });
    this.socket.write(encodeClientFrame(Buffer.from(message, 'utf8')));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  handleData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    while (this.buffer.length >= 2) {
      const parsed = decodeServerFrame(this.buffer);
      if (!parsed) {
        return;
      }
      this.buffer = this.buffer.slice(parsed.bytes);
      if (parsed.opcode === 0x8) {
        this.socket.end();
        return;
      }
      if (parsed.opcode !== 0x1) {
        continue;
      }
      const message = JSON.parse(parsed.payload.toString('utf8'));
      if (!message.id || !this.pending.has(message.id)) {
        continue;
      }
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  close() {
    if (this.socket && !this.socket.destroyed) {
      this.socket.end();
    }
  }
}

function encodeClientFrame(payload) {
  const length = payload.length;
  const header = [];
  header.push(0x81);
  if (length < 126) {
    header.push(0x80 | length);
  } else if (length < 65536) {
    header.push(0x80 | 126, (length >> 8) & 0xff, length & 0xff);
  } else {
    header.push(0x80 | 127, 0, 0, 0, 0, (length / 0x1000000) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff);
  }
  const mask = crypto.randomBytes(4);
  const frame = Buffer.concat([Buffer.from(header), mask, payload]);
  const start = header.length + 4;
  for (let i = 0; i < payload.length; i += 1) {
    frame[start + i] = payload[i] ^ mask[i % 4];
  }
  return frame;
}

function decodeServerFrame(buffer) {
  const first = buffer[0];
  const second = buffer[1];
  const opcode = first & 0x0f;
  let offset = 2;
  let length = second & 0x7f;
  if (length === 126) {
    if (buffer.length < offset + 2) return undefined;
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) return undefined;
    const high = buffer.readUInt32BE(offset);
    const low = buffer.readUInt32BE(offset + 4);
    length = high * 2 ** 32 + low;
    offset += 8;
  }
  const masked = Boolean(second & 0x80);
  let mask;
  if (masked) {
    if (buffer.length < offset + 4) return undefined;
    mask = buffer.slice(offset, offset + 4);
    offset += 4;
  }
  if (buffer.length < offset + length) return undefined;
  const payload = Buffer.from(buffer.slice(offset, offset + length));
  if (mask) {
    for (let i = 0; i < payload.length; i += 1) {
      payload[i] ^= mask[i % 4];
    }
  }
  return { opcode, payload, bytes: offset + length };
}

async function waitForPhase(phaseDir, name) {
  const readyFile = path.join(phaseDir, `${name}.ready`);
  const started = Date.now();
  while (!fs.existsSync(readyFile)) {
    if (Date.now() - started > PHASE_TIMEOUT_MS) {
      throw new Error(`Timed out waiting for phase ${name}`);
    }
    await sleep(500);
  }
}

function advancePhase(phaseDir, name) {
  fs.writeFileSync(path.join(phaseDir, `${name}.advance`), 'advance');
}

async function capture(cdp, output) {
  await cdp.send('Page.bringToFront');
  await sleep(500);
  const metrics = await cdp.send('Page.getLayoutMetrics');
  const viewport = metrics.cssLayoutViewport || { clientWidth: 1440, clientHeight: 900 };
  const cropTop = 35;
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
    clip: {
      x: 0,
      y: cropTop,
      width: viewport.clientWidth,
      height: Math.max(1, viewport.clientHeight - cropTop),
      scale: 1,
    },
  });
  fs.writeFileSync(output, Buffer.from(result.data, 'base64'));
  fs.mkdirSync(WEBSITE_ASSET_DIR, { recursive: true });
  fs.copyFileSync(output, path.join(WEBSITE_ASSET_DIR, path.basename(output)));
  console.log(`Captured ${path.relative(ROOT, output)}`);
}

function copyWorkflowFrame() {
  fs.copyFileSync(OUTPUTS.preview, OUTPUTS.workflow);
  fs.mkdirSync(WEBSITE_ASSET_DIR, { recursive: true });
  fs.copyFileSync(OUTPUTS.workflow, path.join(WEBSITE_ASSET_DIR, path.basename(OUTPUTS.workflow)));
}

async function main() {
  if (!fs.existsSync(CODE_CLI)) {
    throw new Error(`VS Code CLI not found at ${CODE_CLI}. Set VSCODE_CLI to override.`);
  }
  if (!fs.existsSync(path.join(WORKSPACE, 'out', 'main.pdf'))) {
    throw new Error('examples/demo-paper/out/main.pdf is missing. Run a demo compile before capture.');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-one-click-real-capture-'));
  const userDataDir = path.join(tmpRoot, 'user-data');
  const extensionsDir = path.join(tmpRoot, 'extensions');
  const phaseDir = path.join(tmpRoot, 'phases');
  fs.mkdirSync(extensionsDir, { recursive: true });
  fs.mkdirSync(phaseDir, { recursive: true });
  writeSettings(userDataDir);
  seedRuntime(userDataDir);
  const testPath = writeTestModule(tmpRoot);

  const child = spawn(
    CODE_CLI,
    [
      '--user-data-dir',
      userDataDir,
      '--extensions-dir',
      extensionsDir,
      '--disable-updates',
      '--disable-workspace-trust',
      '--skip-welcome',
      '--skip-release-notes',
      `--remote-debugging-port=${PORT}`,
      '--extensionDevelopmentPath',
      ROOT,
      '--extensionTestsPath',
      testPath,
      WORKSPACE,
    ],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        LATEX_ONE_CLICK_CAPTURE_WORKSPACE: WORKSPACE,
        LATEX_ONE_CLICK_CAPTURE_PHASE_DIR: phaseDir,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  const target = await waitForWorkbenchTarget();
  const cdp = new CdpSocket(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');

  try {
    await waitForPhase(phaseDir, 'command');
    await capture(cdp, OUTPUTS.command);
    advancePhase(phaseDir, 'command');

    await waitForPhase(phaseDir, 'preview');
    await capture(cdp, OUTPUTS.preview);
    copyWorkflowFrame();
    advancePhase(phaseDir, 'preview');

    await waitForPhase(phaseDir, 'synctex');
    await capture(cdp, OUTPUTS.synctex);
    advancePhase(phaseDir, 'synctex');
  } finally {
    cdp.close();
    child.kill('SIGTERM');
  }

  await new Promise((resolve) => {
    child.once('exit', resolve);
    setTimeout(resolve, 3000);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
