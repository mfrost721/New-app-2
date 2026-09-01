import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KeyboardVisualizer from '../components/KeyboardVisualizer';
import PitchClassClock from '../components/PitchClassClock';
import MatrixGrid from '../components/MatrixGrid';
import ScoreViewer from '../components/ScoreViewer';

describe('Component Rendering & Interactive Behavior', () => {
  describe('KeyboardVisualizer', () => {
    it('renders the requested number of piano keys and active highlight states', () => {
      render(
        <KeyboardVisualizer
          startMidi={60}
          numKeys={12}
          activeMidis={[60, 64, 67]}
          labelMode="note"
        />
      );

      const keys = screen.getAllByRole('button');
      expect(keys.length).toBe(12);

      // C4 is key 60, should have aria-pressed="true"
      const cKey = screen.getByLabelText(/MIDI 60/i);
      expect(cKey.getAttribute('aria-pressed')).toBe('true');

      // C#4 is key 61, not in activeMidis -> aria-pressed="false"
      const csKey = screen.getByLabelText(/MIDI 61/i);
      expect(csKey.getAttribute('aria-pressed')).toBe('false');
    });

    it('triggers onNoteClick callback when interactive key is clicked', () => {
      const handleNoteClick = vi.fn();
      render(
        <KeyboardVisualizer
          startMidi={60}
          numKeys={12}
          onNoteClick={handleNoteClick}
          interactive={true}
        />
      );

      const cKey = screen.getByLabelText(/MIDI 60/i);
      fireEvent.click(cKey);

      expect(handleNoteClick).toHaveBeenCalledWith(60);
    });

    it('displays solfege and scale degree labels accurately', () => {
      const { rerender } = render(
        <KeyboardVisualizer startMidi={60} numKeys={1} labelMode="solfege" />
      );
      expect(screen.getByText('Do')).toBeDefined();

      rerender(<KeyboardVisualizer startMidi={60} numKeys={1} labelMode="scaleDegree" />);
      expect(screen.getByText('1')).toBeDefined();
    });
  });

  describe('PitchClassClock', () => {
    it('renders 12 node buttons and highlights selected pitch classes', () => {
      const handleToggle = vi.fn();
      render(
        <PitchClassClock
          selectedPcs={[0, 4, 7]}
          onTogglePc={handleToggle}
          showNoteNames={true}
        />
      );

      const nodes = screen.getAllByRole('button');
      expect(nodes.length).toBe(12);

      const pc0Node = screen.getByRole('button', { name: /Toggle pitch class 0/i });
      fireEvent.click(pc0Node);
      expect(handleToggle).toHaveBeenCalledWith(0);
    });
  });

  describe('MatrixGrid', () => {
    it('renders 12x12 matrix for valid P0 row in non-interactive display mode', () => {
      const p0Row = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
      render(<MatrixGrid p0Row={p0Row} showNotes={true} interactive={false} />);

      expect(screen.getByText('P \\ I')).toBeDefined();
      expect(screen.getByText('I0')).toBeDefined();
      expect(screen.getByText('P0')).toBeDefined();
    });

    it('renders user input fields in interactive mode and responds to changes', () => {
      const p0Row = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
      const userMatrix = Array.from({ length: 12 }, () => Array(12).fill(undefined));
      const handleCellChange = vi.fn();

      render(
        <MatrixGrid
          p0Row={p0Row}
          userMatrix={userMatrix}
          onCellChange={handleCellChange}
          interactive={true}
        />
      );

      const cellInput = screen.getByLabelText('Matrix cell row 1 column 1');
      fireEvent.change(cellInput, { target: { value: '5' } });

      expect(handleCellChange).toHaveBeenCalledWith(0, 0, 5);
    });
  });

  describe('ScoreViewer', () => {
    it('renders score viewer header, notes, and annotations', () => {
      const handleNoteClick = vi.fn();
      render(
        <ScoreViewer
          title="Analysis Excerpt"
          clef="treble"
          timeSignature={[4, 4]}
          notes={[
            { pitch: 'C4', duration: 'quarter', annotation: 'Root' },
            { pitch: 'E4', duration: 'quarter' },
          ]}
          annotations={[{ measure: 1, label: 'Tonic Harmony' }]}
          onNoteClick={handleNoteClick}
        />
      );

      expect(screen.getByText('Analysis Excerpt')).toBeDefined();
      expect(screen.getByText('TREBLE CLEF | 4/4')).toBeDefined();
      expect(screen.getByText('Root')).toBeDefined();
      expect(screen.getByText('m.1: Tonic Harmony')).toBeDefined();

      const noteBtn = screen.getByLabelText(/Note C4, quarter, annotation Root/i);
      fireEvent.click(noteBtn);
      expect(handleNoteClick).toHaveBeenCalledWith(0);
    });
  });
});
