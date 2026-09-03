import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import LayoutWrapper from '../components/LayoutWrapper';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('PWA & Accessibility Verification', () => {
  it('renders skip to main content link and main landmark target in LayoutWrapper', () => {
    render(
      <LayoutWrapper>
        <div>Test Page Content</div>
      </LayoutWrapper>
    );

    const skipLink = screen.getByRole('link', { name: /Skip to main content/i });
    expect(skipLink).toBeDefined();
    expect(skipLink.getAttribute('href')).toBe('#main-content');

    const mainElement = screen.getByRole('main');
    expect(mainElement.getAttribute('id')).toBe('main-content');
    expect(mainElement.getAttribute('tabindex')).toBe('-1');

    const navElement = screen.getByRole('navigation', { name: /Main Navigation/i });
    expect(navElement).toBeDefined();
  });

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
});
