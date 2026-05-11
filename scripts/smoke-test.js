const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const REQUIRED_FILES = [
  'package.json',
  'tsconfig.json',
  'out/extension.js',
  'out/core/cleaner.js',
  'out/core/doctorReport.js',
  'out/core/nodeFileSystem.js',
  'out/core/workspaceAccess.js',
  'out/core/workspaceSafety.js',
  'out/preview/htmlEscaping.js',
  'out/preview/pdfPreviewHtml.js',
  'out/runtime/runtimeManager.js',
  'media/pdfjs/build/pdf.mjs',
  'media/pdfjs/build/pdf.worker.mjs',
  'resources/runtime-manifest.json',
];

const SUPPORTED_PLATFORMS = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'windows-x64'];
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

let allGood = true;

function pass(message) {
  console.log(`✓ ${message}`);
}

function fail(message) {
  console.error(`✗ ${message}`);
  allGood = false;
}

for (const file of REQUIRED_FILES) {
  const full = path.join(ROOT, file);
  if (fs.existsSync(full)) {
    pass(file);
  } else {
    fail(`MISSING: ${file}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const settings = Object.keys(pkg.contributes?.configuration?.properties ?? {});
const activationEvents = pkg.activationEvents ?? [];
let configurationGood = true;
for (const removedSetting of [
  'latexOneClick.runtimeChannel',
  'latexOneClick.telemetry.enabled',
  'latexOneClick.logs.verbosity',
]) {
  if (settings.includes(removedSetting)) {
    fail(`Unexpected unimplemented setting exposed: ${removedSetting}`);
    configurationGood = false;
  }
}
if (configurationGood) {
  pass('package configuration does not expose unimplemented settings');
}

if (activationEvents.includes('workspaceContains:**/*.[tT][eE][xX]')) {
  pass('package activates for mixed-case TeX workspaces');
} else {
  fail('Missing mixed-case TeX workspace activation event');
}

const missingCommandActivations = REQUIRED_COMMAND_ACTIVATIONS.filter(
  (command) => !activationEvents.includes(`onCommand:${command}`)
);
if (missingCommandActivations.length === 0) {
  pass('package activates contributed commands for support diagnostics');
} else {
  fail(
    `Missing command activation events: ${missingCommandActivations
      .map((command) => `onCommand:${command}`)
      .join(', ')}`
  );
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'resources/runtime-manifest.json'), 'utf-8')
);

const platforms = manifest.platforms ?? {};
const platformIds = Object.keys(platforms).sort();
if (JSON.stringify(platformIds) !== JSON.stringify([...SUPPORTED_PLATFORMS].sort())) {
  fail(`Runtime manifest platforms mismatch: ${platformIds.join(', ')}`);
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

  if (!entry.url?.includes(manifest.version ?? '')) {
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

const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
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

if (!allGood) {
  process.exit(1);
}

console.log('\nSmoke test passed!');
