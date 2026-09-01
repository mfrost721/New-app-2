import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();

function error(message) {
  console.error(`\x1b[31m[Integrity Error]\x1b[0m ${message}`);
}

function success(message) {
  console.log(`\x1b[32m[Integrity OK]\x1b[0m ${message}`);
}

let hasErrors = false;

// 1. Validate PWA assets existence
const requiredPWAAssets = [
  'public/manifest.json',
  'public/sw.js',
  'app/favicon.ico',
];

for (const assetPath of requiredPWAAssets) {
  const fullPath = path.join(rootDir, assetPath);
  if (!fs.existsSync(fullPath)) {
    error(`Missing required PWA asset: ${assetPath}`);
    hasErrors = true;
  } else {
    success(`Found PWA asset: ${assetPath}`);
  }
}

// 2. Validate manifest.json content & structure
const manifestPath = path.join(rootDir, 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const rawContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(rawContent);

    if (!manifest.short_name && !manifest.name) {
      error('public/manifest.json missing "name" or "short_name"');
      hasErrors = true;
    }
    if (manifest.display !== 'standalone') {
      error(`public/manifest.json "display" must be "standalone" (got "${manifest.display}")`);
      hasErrors = true;
    }
    if (!manifest.start_url) {
      error('public/manifest.json missing "start_url"');
      hasErrors = true;
    }
    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
      error('public/manifest.json missing non-empty "icons" array');
      hasErrors = true;
    }
    if (!hasErrors) {
      success('public/manifest.json is valid PWA manifest JSON');
    }
  } catch (err) {
    error(`public/manifest.json is invalid JSON: ${err.message}`);
    hasErrors = true;
  }
}

// 3. Validate critical accessibility test existence
const criticalTests = ['tests/accessibility.test.ts'];
for (const testPath of criticalTests) {
  const fullPath = path.join(rootDir, testPath);
  if (!fs.existsSync(fullPath)) {
    error(`Missing critical test file: ${testPath}`);
    hasErrors = true;
  } else {
    success(`Found critical test file: ${testPath}`);
  }
}

// 4. Validate package lockfile existence
const primaryLockfile = 'pnpm-lock.yaml';
const primaryLockPath = path.join(rootDir, primaryLockfile);
if (!fs.existsSync(primaryLockPath)) {
  error(`Missing primary package lockfile: ${primaryLockfile}`);
  hasErrors = true;
} else {
  success(`Found primary lockfile: ${primaryLockfile}`);
}

// Check package-lock.json if present for secondary npm compatibility
const secondaryLockfile = 'package-lock.json';
const secondaryLockPath = path.join(rootDir, secondaryLockfile);
if (fs.existsSync(secondaryLockPath)) {
  success(`Found secondary lockfile: ${secondaryLockfile}`);
}

// 5. Check git tracked files for prohibited artifacts and secrets
try {
  const gitFiles = execSync('git ls-files', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

  const forbiddenArtifactPatterns = [
    /^\.next\//,
    /^node_modules\//,
    /^dist\//,
    /^build\//,
    /^out\//,
    /\.tsbuildinfo$/,
    /\.DS_Store$/,
    /\.log$/,
  ];

  const forbiddenSecretPatterns = [
    /^\.env$/,
    /^\.env\.local$/,
    /^\.env\.production$/,
    /^\.env\.development$/,
    /\.pem$/,
    /\.key$/,
  ];

  for (const file of gitFiles) {
    for (const pattern of forbiddenArtifactPatterns) {
      if (pattern.test(file)) {
        error(`Prohibited build artifact tracked in git: ${file}`);
        hasErrors = true;
      }
    }
    for (const pattern of forbiddenSecretPatterns) {
      if (pattern.test(file)) {
        error(`Prohibited secret/environment file tracked in git: ${file}`);
        hasErrors = true;
      }
    }
  }

  if (!hasErrors) {
    success('No prohibited build artifacts or secret files tracked in git.');
  }
} catch (err) {
  error(`Failed to execute git ls-files check: ${err.message}`);
  hasErrors = true;
}

if (hasErrors) {
  console.error('\x1b[31m[Integrity Check FAILED]\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m[Integrity Check PASSED]\x1b[0m All repository integrity checks passed.');
  process.exit(0);
}
