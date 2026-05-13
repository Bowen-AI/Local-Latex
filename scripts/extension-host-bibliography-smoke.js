#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EXTENSION_ID = 'BowenAI.latex-one-click';

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

function normalizeVsCodeCli(candidate) {
  if (!candidate) {
    return undefined;
  }

  const snapCli = '/snap/code/current/usr/share/code/bin/code';
  if (process.platform === 'linux' && candidate === '/snap/bin/code' && fs.existsSync(snapCli)) {
    return snapCli;
  }

  return candidate;
}

function findVsCodeCli() {
  if (process.env.VSCODE_CLI && fs.existsSync(process.env.VSCODE_CLI)) {
    return normalizeVsCodeCli(process.env.VSCODE_CLI);
  }

  return normalizeVsCodeCli(findExecutable('code')) ?? normalizeVsCodeCli(findExecutable('code-insiders'));
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
  const workspace = path.join(root, 'bibliography workspace');
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(
    path.join(workspace, 'main.tex'),
    [
      '\\documentclass{article}',
      '\\begin{document}',
      'No citations yet.',
      '\\bibliography{bibliography}',
      '\\end{document}',
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(workspace, 'bibliography.bib'),
    [
      '@article{sample,',
      '  title = {Sample},',
      '  author = {Example, Alice},',
      '  journal = {Journal},',
      '  year = {2026}',
      '}',
      '',
    ].join('\n')
  );
  return workspace;
}

function seedFailingRuntime(userDataDir) {
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
    fs.writeFileSync(
      binaryPath,
      "@echo off\r\necho error: main.bbl:2: LaTeX Error: Something's wrong--perhaps a missing \\item. 1>&2\r\nexit /b 1\r\n"
    );
  } else {
    fs.writeFileSync(
      binaryPath,
      "#!/bin/sh\nprintf '%s\\n' 'error: main.bbl:2: LaTeX Error: Something'\"'\"'s wrong--perhaps a missing \\item.' >&2\nexit 1\n"
    );
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

const cli = findVsCodeCli();
if (!cli) {
  console.error('VS Code CLI not found; cannot run bibliography extension-host smoke test.');
  process.exit(1);
}

const vsixPath = process.env.LATEX_ONE_CLICK_SMOKE_VSIX;
if (vsixPath && !fs.existsSync(vsixPath)) {
  console.error(`VSIX not found: ${vsixPath}`);
  process.exit(1);
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-one-click-bibliography-smoke-'));
const userDataDir = path.join(tmpRoot, 'user-data');
const extensionsDir = path.join(tmpRoot, 'extensions');
const workspace = createWorkspace(tmpRoot);

if (!seedFailingRuntime(userDataDir)) {
  console.error(`No bundled runtime manifest entry for ${getPlatformId()}; cannot run smoke test.`);
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  process.exit(1);
}

if (vsixPath) {
  const installResult = spawnSync(
    cli,
    [
      '--user-data-dir',
      userDataDir,
      '--extensions-dir',
      extensionsDir,
      '--install-extension',
      vsixPath,
      '--force',
    ],
    {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 120_000,
    }
  );

  if (installResult.stdout) {
    process.stdout.write(installResult.stdout);
  }
  if (installResult.stderr) {
    process.stderr.write(installResult.stderr);
  }
  if (installResult.error || installResult.status !== 0) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    if (installResult.error) {
      console.error(installResult.error.message);
    }
    process.exit(installResult.status ?? 1);
  }
}

const testPath = path.join(ROOT, 'test', 'extension-host', 'bibliography-hint.js');
const extensionArgs = vsixPath ? [] : ['--extensionDevelopmentPath', ROOT];
const disableExtensionArgs = vsixPath ? [] : ['--disable-extensions'];
const result = spawnSync(
  cli,
  [
    '--user-data-dir',
    userDataDir,
    '--extensions-dir',
    extensionsDir,
    ...disableExtensionArgs,
    '--skip-welcome',
    '--skip-release-notes',
    ...extensionArgs,
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
