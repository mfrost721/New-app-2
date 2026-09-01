import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();

function runChecks() {
  const errors = [];

  console.log('🔍 Running repository integrity & security checks...');

  // 1. PWA Assets existence & validity
  const manifestPath = path.join(rootDir, 'public', 'manifest.json');
  const swPath = path.join(rootDir, 'public', 'sw.js');

  if (!fs.existsSync(manifestPath)) {
    errors.push('PWA asset missing: public/manifest.json does not exist.');
  } else {
    try {
      const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestRaw);
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
      for (const field of requiredFields) {
        if (!manifest[field]) {
          errors.push(`manifest.json is missing required field: "${field}".`);
        }
      }
    } catch (err) {
      errors.push(`public/manifest.json is not valid JSON: ${err.message}`);
    }
  }

  if (!fs.existsSync(swPath)) {
    errors.push('PWA asset missing: public/sw.js does not exist.');
  } else {
    const swContent = fs.readFileSync(swPath, 'utf8');
    if (!swContent.includes('CACHE_NAME') || !swContent.includes('addEventListener')) {
      errors.push('public/sw.js does not appear to be a valid Service Worker script.');
    }
  }

  // 2. Critical Accessibility Tests presence
  const a11yTestPath = path.join(rootDir, 'tests', 'accessibility.test.ts');
  if (!fs.existsSync(a11yTestPath)) {
    errors.push('Critical test suite missing: tests/accessibility.test.ts does not exist.');
  } else {
    const a11yContent = fs.readFileSync(a11yTestPath, 'utf8');
    if (!a11yContent.includes('describe') || !a11yContent.includes('it(')) {
      errors.push('tests/accessibility.test.ts does not contain executable test cases.');
    }
  }

  // 3. Package & Lockfile consistency
  const pkgPath = path.join(rootDir, 'package.json');
  const pnpmLockPath = path.join(rootDir, 'pnpm-lock.yaml');
  const pkgLockPath = path.join(rootDir, 'package-lock.json');

  if (!fs.existsSync(pkgPath)) {
    errors.push('package.json missing.');
  } else {
    try {
      JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (err) {
      errors.push(`package.json is invalid JSON: ${err.message}`);
    }
  }

  if (!fs.existsSync(pnpmLockPath) || fs.statSync(pnpmLockPath).size === 0) {
    errors.push('pnpm-lock.yaml is missing or empty.');
  }

  if (!fs.existsSync(pkgLockPath) || fs.statSync(pkgLockPath).size === 0) {
    errors.push('package-lock.json is missing or empty.');
  }

  // 4. Git-tracked artifacts and secret checks
  let trackedFiles = [];
  try {
    const output = execSync('git ls-files', { encoding: 'utf8' });
    trackedFiles = output.split('\n').filter(Boolean);
  } catch (err) {
    errors.push(`Failed to run git ls-files: ${err.message}`);
  }

  const prohibitedArtifactPatterns = [
    /^\.next\//,
    /^out\//,
    /^dist\//,
    /^build\//,
    /^node_modules\//,
    /^coverage\//,
    /^\.vitest\//,
    /\.tsbuildinfo$/
  ];

  const prohibitedSecretsPatterns = [
    /^\.env(?:\.(?!example$).*)?$/, // Matches .env, .env.local, .env.production, etc. but allows .env.example
    /\.(pem|key|p12|pfx)$/i,
    /id_rsa/i,
    /id_ed25519/i
  ];

  for (const file of trackedFiles) {
    for (const pattern of prohibitedArtifactPatterns) {
      if (pattern.test(file)) {
        errors.push(`Prohibited build artifact tracked in git: ${file}`);
      }
    }

    for (const pattern of prohibitedSecretsPatterns) {
      if (pattern.test(file)) {
        errors.push(`Obvious secret or private environment file tracked in git: ${file}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('❌ Repository integrity check failed with errors:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('✅ Repository integrity & security checks passed successfully.');
}

runChecks();
