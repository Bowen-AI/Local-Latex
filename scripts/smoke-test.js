const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const REQUIRED_FILES = [
  'package.json',
  'tsconfig.json',
  'out/extension.js',
  'resources/runtime-manifest.json',
];

let allGood = true;

for (const file of REQUIRED_FILES) {
  const full = path.join(ROOT, file);
  if (fs.existsSync(full)) {
    console.log(`✓ ${file}`);
  } else {
    console.error(`✗ MISSING: ${file}`);
    allGood = false;
  }
}

if (!allGood) {
  process.exit(1);
}

console.log('\nSmoke test passed!');
