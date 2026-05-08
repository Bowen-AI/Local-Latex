#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EXTENSION_ID = 'latex-one-click.latex-one-click';

function findExecutable(name) {
  const pathValue = process.env.PATH ?? '';
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

function findVsCodeCli() {
  if (process.env.VSCODE_CLI) {
    return process.env.VSCODE_CLI;
  }

  return findExecutable('code') ?? findExecutable('code-insiders');
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

function createWorkspace(root) {
  const workspace = path.join(root, 'workspace with spaces');
  const outDir = path.join(workspace, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(workspace, 'main.TEX'),
    [
      '\\documentclass{article}',
      '\\begin{document}',
      'Extension host smoke test.',
      '\\end{document}',
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(outDir, 'main.pdf'),
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF\n'
  );
  return workspace;
}

function seedRuntime(userDataDir) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'resources', 'runtime-manifest.json'), 'utf-8')
  );
  const platformId = getPlatformId();
  const entry = manifest.platforms?.[platformId];
  if (!entry) {
    return false;
  }

  const storageDir = path.join(userDataDir, 'User', 'globalStorage', EXTENSION_ID);
  const runtimeDir = path.join(storageDir, 'runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });

  const binaryPath = path.join(runtimeDir, process.platform === 'win32' ? 'tectonic.exe' : 'tectonic');
  if (process.platform === 'win32') {
    fs.writeFileSync(binaryPath, '@echo off\r\necho tectonic smoke runtime\r\n');
  } else {
    fs.writeFileSync(binaryPath, '#!/bin/sh\necho tectonic smoke runtime\n');
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

  return true;
}

const required = process.env.LATEX_ONE_CLICK_REQUIRE_EXTENSION_HOST === '1';
const cli = findVsCodeCli();
if (!cli) {
  const message = 'VS Code CLI not found; skipping extension-host smoke test.';
  if (required) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
  process.exit(0);
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-one-click-extension-host-'));
const userDataDir = path.join(tmpRoot, 'user-data');
const extensionsDir = path.join(tmpRoot, 'extensions');
const workspace = createWorkspace(tmpRoot);

if (!seedRuntime(userDataDir)) {
  const message = `No bundled runtime manifest entry for ${getPlatformId()}; skipping extension-host smoke test.`;
  if (required) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  process.exit(0);
}

const testPath = path.join(ROOT, 'test', 'extension-host', 'smoke.js');
const result = spawnSync(
  cli,
  [
    '--user-data-dir',
    userDataDir,
    '--extensions-dir',
    extensionsDir,
    '--disable-extensions',
    '--skip-welcome',
    '--skip-release-notes',
    '--extensionDevelopmentPath',
    ROOT,
    '--extensionTestsPath',
    testPath,
    workspace,
  ],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      LATEX_ONE_CLICK_SMOKE_WORKSPACE: workspace,
    },
    encoding: 'utf-8',
    timeout: 120_000,
  }
);

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

fs.rmSync(tmpRoot, { recursive: true, force: true });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
