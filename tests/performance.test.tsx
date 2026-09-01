import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { generateTwelveToneMatrix } from '@/lib/music/twelveTone';
import { getNormalOrder, getPrimeForm, getIntervalVector } from '@/lib/music/pitchClass';
import MatrixGrid from '@/components/MatrixGrid';
import PitchClassClock from '@/components/PitchClassClock';
import KeyboardVisualizer from '@/components/KeyboardVisualizer';

describe('UI & Domain Performance Benchmarks', () => {
  it('computes 100 twelve-tone matrices rapidly (under 50ms)', () => {
    const row = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      generateTwelveToneMatrix(row);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('computes set theory calculations (normal, prime, vector) 500 times rapidly (under 50ms)', () => {
    const pcs = [0, 1, 4, 7, 8];
    const start = performance.now();
    for (let i = 0; i < 500; i++) {
      getNormalOrder(pcs);
      getPrimeForm(pcs);
      getIntervalVector(pcs);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('renders MatrixGrid efficiently without performance bottlenecks', () => {
    const p0Row = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
    const start = performance.now();
    render(<MatrixGrid p0Row={p0Row} showNotes={true} interactive={false} />);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('renders PitchClassClock efficiently without performance bottlenecks', () => {
    const start = performance.now();
    render(<PitchClassClock selectedPcs={[0, 4, 7, 11]} showNoteNames={true} />);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('renders 88-key KeyboardVisualizer efficiently without performance bottlenecks', () => {
    const start = performance.now();
    render(
      <KeyboardVisualizer
        startMidi={21}
        numKeys={88}
        activeMidis={[60, 64, 67]}
        labelMode="note"
      />
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
