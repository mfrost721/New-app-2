import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Assets & Offline Service Worker Integrity', () => {
  const publicDir = path.resolve(process.cwd(), 'public');
  const manifestPath = path.join(publicDir, 'manifest.json');
  const swPath = path.join(publicDir, 'sw.js');

  it('verifies manifest.json exists, is valid JSON, and icon files exist on disk', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);

    const rawManifest = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(rawManifest);

    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');

    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);

    for (const icon of manifest.icons) {
      const relPath = icon.src.replace(/^\//, '');
      const inPublic = path.join(publicDir, relPath);
      const inApp = path.join(process.cwd(), 'app', relPath);
      const inRoot = path.join(process.cwd(), relPath);

      const exists = fs.existsSync(inPublic) || fs.existsSync(inApp) || fs.existsSync(inRoot);
      expect(exists, `Icon file at ${icon.src} must exist on disk`).toBe(true);
    }
  });

  it('verifies sw.js exists and precaches valid static routes/assets', () => {
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain("const CACHE_NAME = 'frost-music-lab-v1';");
    expect(swContent).toContain('STATIC_ASSETS');

    const match = swContent.match(/const STATIC_ASSETS = \[\s*([\s\S]*?)\s*\];/);
    expect(match).not.toBeNull();

    if (match) {
      const assets = match[1]
        .split(',')
        .map(s => s.trim().replace(/['"]/g, ''))
        .filter(Boolean);

      // Verify asset references like /manifest.json and /favicon.ico exist on disk
      for (const asset of assets) {
        if (asset.includes('.')) {
          const relPath = asset.replace(/^\//, '');
          const inPublic = path.join(publicDir, relPath);
          const inApp = path.join(process.cwd(), 'app', relPath);
          const exists = fs.existsSync(inPublic) || fs.existsSync(inApp);
          expect(exists, `Precached file asset ${asset} must exist on disk`).toBe(true);
        }
      }
    }
  });
});
