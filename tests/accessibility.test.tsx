import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import KeyboardVisualizer from '../components/KeyboardVisualizer';
import PitchClassClock from '../components/PitchClassClock';
import MatrixGrid from '../components/MatrixGrid';
import ScoreViewer from '../components/ScoreViewer';

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

  describe('Component Visualizer Accessibility Pass', () => {
    it('KeyboardVisualizer provides pitch, octave, and MIDI context in aria-label, aria-pressed, and focus-visible rings', () => {
      render(
        <KeyboardVisualizer
          startMidi={60}
          numKeys={12}
          activeMidis={[60]}
        />
      );

      const keyC4 = screen.getByLabelText('Piano key C4 (MIDI 60)');
      expect(keyC4).toBeDefined();
      expect(keyC4.getAttribute('aria-pressed')).toBe('true');
      expect(keyC4.className).toContain('focus-visible:ring-2');
      expect(keyC4.className).toContain('focus-visible:ring-amber-400');

      const keyCs4 = screen.getByLabelText('Piano key C#4 (MIDI 61)');
      expect(keyCs4).toBeDefined();
      expect(keyCs4.getAttribute('aria-pressed')).toBe('false');
    });

    it('PitchClassClock nodes provide pitch class and note name context in aria-label, aria-pressed, and focus-visible rings', () => {
      render(
        <PitchClassClock
          selectedPcs={[0]}
          showNoteNames={true}
        />
      );

      const node0 = screen.getByRole('button', { name: 'Toggle pitch class 0 (C)' });
      expect(node0).toBeDefined();
      expect(node0.getAttribute('aria-pressed')).toBe('true');
      expect(node0.getAttribute('class')).toContain('focus-visible:ring-2');

      const node1 = screen.getByRole('button', { name: 'Toggle pitch class 1 (C#)' });
      expect(node1).toBeDefined();
      expect(node1.getAttribute('aria-pressed')).toBe('false');
    });

    it('MatrixGrid provides accessible row, column, pitch class, and note labels for interactive and display modes', () => {
      const p0Row = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
      const { rerender } = render(
        <MatrixGrid p0Row={p0Row} interactive={false} showNotes={true} />
      );

      const displayCell = screen.getByLabelText('Row 1 column 1: pitch class 0 (C)');
      expect(displayCell).toBeDefined();

      const userMatrix = Array.from({ length: 12 }, () => Array(12).fill(undefined));
      userMatrix[0][0] = 0;

      rerender(
        <MatrixGrid p0Row={p0Row} userMatrix={userMatrix} interactive={true} />
      );

      const interactiveInput = screen.getByLabelText('Matrix cell row 1 column 1, pitch class 0 (C)');
      expect(interactiveInput).toBeDefined();
      expect(interactiveInput.className).toContain('focus-visible:ring-2');
    });

    it('ScoreViewer notes provide pitch, octave, MIDI number, and duration context in aria-label with focus rings when interactive', () => {
      render(
        <ScoreViewer
          clef="treble"
          notes={[
            { pitch: 'C4', duration: 'quarter' },
            { pitch: 64, duration: 'half' },
          ]}
          onNoteClick={vi.fn()}
        />
      );

      const note1 = screen.getByRole('button', { name: 'Note C4 (MIDI 60), quarter' });
      expect(note1).toBeDefined();
      expect(note1.getAttribute('class')).toContain('focus-visible:ring-2');

      const note2 = screen.getByRole('button', { name: 'Note E4 (MIDI 64), half' });
      expect(note2).toBeDefined();
    });
  });
});
