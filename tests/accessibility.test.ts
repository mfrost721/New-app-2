import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA & Accessibility Verification', () => {
  it('has a valid manifest.json with standalone display and theme color', () => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    expect(manifest.short_name).toBe('Frost Music Lab');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#020617');
    expect(manifest.start_url).toBe('/');
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  it('has a service worker sw.js caching core application routes', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain('frost-music-lab-v1');
    expect(swContent).toContain("'/theory'");
    expect(swContent).toContain("'/aural'");
    expect(swContent).toContain("'/piano'");
  });

  it('ensures package.json and lockfiles are present and non-empty', () => {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pnpmLockPath = path.join(process.cwd(), 'pnpm-lock.yaml');
    const pkgLockPath = path.join(process.cwd(), 'package-lock.json');

    expect(fs.existsSync(pkgPath)).toBe(true);
    expect(fs.existsSync(pnpmLockPath)).toBe(true);
    expect(fs.statSync(pnpmLockPath).size).toBeGreaterThan(0);
    expect(fs.existsSync(pkgLockPath)).toBe(true);
    expect(fs.statSync(pkgLockPath).size).toBeGreaterThan(0);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.name).toBe('frost-music-lab');
    expect(pkg.scripts.typecheck).toBeDefined();
    expect(pkg.scripts['check:integrity']).toBeDefined();
  });
});
