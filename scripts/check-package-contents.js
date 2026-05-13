#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REQUIRED_FILES = [
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'resources/runtime-manifest.json',
  'resources/latex-activity.svg',
  'out/extension.js',
  'out/commands/compile.js',
  'out/commands/clean.js',
  'out/commands/doctor.js',
  'out/commands/openPdf.js',
  'out/commands/selectRoot.js',
  'out/config/defaults.js',
  'out/config/settings.js',
  'out/core/cleaner.js',
  'out/core/compiler.js',
  'out/core/debounce.js',
  'out/core/diagnostics.js',
  'out/core/doctorReport.js',
  'out/core/logParser.js',
  'out/core/mainFileResolver.js',
  'out/core/nodeFileSystem.js',
  'out/core/outputChannel.js',
  'out/core/processRunner.js',
  'out/core/projectLocator.js',
  'out/core/stateStore.js',
  'out/core/texFiles.js',
  'out/core/workspaceAccess.js',
  'out/core/workspaceSafety.js',
  'out/preview/htmlEscaping.js',
  'out/preview/pdfFingerprint.js',
  'out/preview/pdfPreviewHtml.js',
  'out/preview/pdfPreview.js',
  'out/preview/previewState.js',
  'out/preview/synctex.js',
  'out/runtime/bundleManager.js',
  'out/runtime/checksum.js',
  'out/runtime/paths.js',
  'out/runtime/platform.js',
  'out/runtime/runtimeManager.js',
  'out/sidebar/compileLogLines.js',
  'out/sidebar/compileSidebarState.js',
  'out/sidebar/compileTreeProvider.js',
  'out/sidebar/projectTreeProvider.js',
  'out/sidebar/revealTexLocation.js',
  'media/pdfjs/build/pdf.mjs',
  'media/pdfjs/build/pdf.worker.mjs',
  'media/pdfjs/cmaps/LICENSE',
  'media/pdfjs/standard_fonts/LiberationSans-Regular.ttf',
];

const FORBIDDEN_RULES = [
  ['non-GA compile-all command', /^out\/commands\/compileAll\.js$/],
  ['source TypeScript', /^src\//],
  ['test output', /(^|\/)(test|tests|__tests__)\//],
  ['test source', /\.test\.(js|ts|tsx)$/],
  ['developer scripts', /^scripts\//],
  ['repository docs', /^docs\//],
  ['website source', /^website\//],
  ['sample projects', /^examples\//],
  ['CI configuration', /^\.github\//],
  ['agent debug artifacts', /^\.cursor\//],
  ['local VS Code settings', /^\.vscode\//],
  ['coverage output', /^coverage\//],
  ['node_modules', /^node_modules\//],
  ['local VSIX artifacts', /\.vsix$/],
  ['agent debug helper', /^out\/preview\/agentDebugLog\.js$/],
  ['TypeScript declarations', /^out\/.*\.d\.ts$/],
  ['TypeScript project config', /^tsconfig\.json$/],
  ['ESLint config', /^eslint\.config\.mjs$/],
  ['Prettier config', /^prettier\.config\.cjs$/],
  ['Vitest config', /^vitest\.config\.ts$/],
  ['npm lockfile', /^package-lock\.json$/],
];

const SUPPORTED_PLATFORMS = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'windows-x64'];

const UNIMPLEMENTED_SETTINGS = [
  'latexOneClick.runtimeChannel',
  'latexOneClick.telemetry.enabled',
  'latexOneClick.logs.verbosity',
];

const REQUIRED_COMMAND_ACTIVATIONS = [
  'latexOneClick.compile',
  'latexOneClick.openPdf',
  'latexOneClick.clean',
  'latexOneClick.selectRoot',
  'latexOneClick.doctor',
  'latexOneClick.revealTexLocation',
  'latexOneClick.sidebarToggleBool',
  'latexOneClick.sidebarEditOutputDirectory',
];

const README_REQUIRED_DISCLOSURES = [
  ['telemetry disclosure', /No telemetry is collected/i],
  ['runtime download source disclosure', /Tectonic binary from official GitHub Releases/i],
  ['Tectonic package download disclosure', /Tectonic may also download missing TeX packages/i],
  ['offline-only package download control', /latexOneClick\.offlineOnly/i],
];

let hasFailures = false;

function runVsceList() {
  const vsceBin = require.resolve('@vscode/vsce/vsce');
  const result = spawnSync(process.execPath, [vsceBin, 'ls', '--no-dependencies'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result.stdout;
}

function parsePackageFiles(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function fail(message) {
  console.error(`✗ ${message}`);
  hasFailures = true;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function readJson(relativePath, label) {
  const fullPath = path.join(process.cwd(), relativePath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read ${label} from ${relativePath}: ${message}`);
    return undefined;
  }
}

function validatePackageMetadata() {
  const pkg = readJson('package.json', 'package metadata');
  if (!pkg) {
    return;
  }

  const settings = Object.keys(pkg.contributes?.configuration?.properties ?? {});
  const exposedUnimplementedSettings = UNIMPLEMENTED_SETTINGS.filter((setting) => settings.includes(setting));
  if (exposedUnimplementedSettings.length > 0) {
    fail(
      `Package exposes unimplemented settings:\n${exposedUnimplementedSettings
        .map((setting) => `  - ${setting}`)
        .join('\n')}`
    );
  } else {
    pass('package configuration does not expose unimplemented settings');
  }

  if (pkg.activationEvents?.includes('workspaceContains:**/*.[tT][eE][xX]')) {
    pass('package activates for mixed-case TeX workspaces');
  } else {
    fail('Package is missing mixed-case TeX workspace activation event');
  }

  const activationEvents = pkg.activationEvents ?? [];
  const missingCommandActivations = REQUIRED_COMMAND_ACTIVATIONS.filter(
    (command) => !activationEvents.includes(`onCommand:${command}`)
  );
  if (missingCommandActivations.length === 0) {
    pass('package activates contributed commands for support diagnostics');
  } else {
    fail(
      `Package is missing command activation events:\n${missingCommandActivations
        .map((command) => `  - onCommand:${command}`)
        .join('\n')}`
    );
  }

  if (pkg.capabilities?.untrustedWorkspaces?.supported === 'limited') {
    pass('package declares limited untrusted-workspace support');
  } else {
    fail('Package should declare limited untrusted-workspace support for Doctor diagnostics');
  }
}

function validateRuntimeManifest() {
  const manifest = readJson('resources/runtime-manifest.json', 'runtime manifest');
  if (!manifest) {
    return;
  }

  const platforms = manifest.platforms ?? {};
  const platformIds = Object.keys(platforms).sort();
  const expectedPlatforms = [...SUPPORTED_PLATFORMS].sort();
  if (JSON.stringify(platformIds) !== JSON.stringify(expectedPlatforms)) {
    fail(`Runtime manifest platforms mismatch: ${platformIds.join(', ') || '(none)'}`);
  } else {
    pass('runtime manifest platform set');
  }

  let runtimeManifestGood = true;
  for (const platformId of SUPPORTED_PLATFORMS) {
    const entry = platforms[platformId];
    if (!entry) {
      runtimeManifestGood = false;
      continue;
    }

    if (typeof entry.url !== 'string' || !entry.url.includes(manifest.version ?? '')) {
      fail(`Runtime URL for ${platformId} does not include manifest version`);
      runtimeManifestGood = false;
    }

    if (!/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) {
      fail(`Runtime checksum for ${platformId} is not a real SHA-256 value`);
      runtimeManifestGood = false;
    }

    const expectedBinary = platformId.startsWith('windows') ? 'tectonic.exe' : 'tectonic';
    if (entry.binary !== expectedBinary) {
      fail(`Runtime binary for ${platformId} should be ${expectedBinary}`);
      runtimeManifestGood = false;
    }
  }

  if (runtimeManifestGood) {
    pass('runtime manifest entries are shaped for release');
  }
}

function validateMarketplaceReadme() {
  let readme;
  try {
    readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read marketplace README from README.md: ${message}`);
    return;
  }

  let readmeGood = true;
  for (const [label, pattern] of README_REQUIRED_DISCLOSURES) {
    if (!pattern.test(readme)) {
      fail(`README.md is missing GA privacy ${label}`);
      readmeGood = false;
    }
  }

  if (readmeGood) {
    pass('README.md includes GA privacy and network disclosures');
  }
}

const files = parsePackageFiles(runVsceList());
const fileSet = new Set(files);
const missingFiles = REQUIRED_FILES.filter((file) => !fileSet.has(file));
const forbiddenFiles = [];

for (const file of files) {
  for (const [label, pattern] of FORBIDDEN_RULES) {
    if (pattern.test(file)) {
      forbiddenFiles.push(`${file} (${label})`);
      break;
    }
  }
}

if (missingFiles.length > 0) {
  fail(`VSIX is missing required files:\n${missingFiles.map((file) => `  - ${file}`).join('\n')}`);
}

if (forbiddenFiles.length > 0) {
  fail(`VSIX includes forbidden files:\n${forbiddenFiles.map((file) => `  - ${file}`).join('\n')}`);
}

validatePackageMetadata();
validateRuntimeManifest();
validateMarketplaceReadme();

if (hasFailures) {
  process.exit(1);
}

pass(`VSIX package contents match GA allowlist checks (${files.length} files)`);
