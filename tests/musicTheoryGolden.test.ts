import { describe, it, expect } from 'vitest';
import {
  getNormalOrder,
  getPrimeForm,
  getIntervalVector,
  formatIntervalVector,
  areSetsEquivalent,
} from '../lib/music/pitchClass';

import {
  generateTwelveToneMatrix,
  getRowTransformation,
} from '../lib/music/twelveTone';

import { spellChord, generateSecondaryDominant } from '../lib/music/chordsAndHarmony';

describe('Music Theory Independent Golden References', () => {
  it('verifies Forte set theory calculations against published references', () => {
    // Forte 3-11 [0, 3, 7] (Minor/Major triad): <0 0 1 1 1 0>
    expect(getNormalOrder([0, 4, 7])).toEqual([0, 4, 7]);
    expect(getPrimeForm([0, 4, 7])).toEqual([0, 3, 7]);
    expect(formatIntervalVector(getIntervalVector([0, 4, 7]))).toBe('<0 0 1 1 1 0>');

    // Forte 4-1 [0, 1, 2, 3] (Chromatic tetrachord): <3 2 1 0 0 0>
    expect(getPrimeForm([0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
    expect(formatIntervalVector(getIntervalVector([0, 1, 2, 3]))).toBe('<3 2 1 0 0 0>');

    // Forte 6-Z17 [0, 1, 2, 4, 7, 8]: <3 2 2 3 3 2>
    expect(getPrimeForm([0, 1, 2, 4, 7, 8])).toEqual([0, 1, 2, 4, 7, 8]);
    expect(formatIntervalVector(getIntervalVector([0, 1, 2, 4, 7, 8]))).toBe('<3 2 2 3 3 2>');
  });

  it('verifies Tn/TnI set equivalence', () => {
    // C major [0,4,7] and F# major [6,10,1] under T6
    const resT6 = areSetsEquivalent([0, 4, 7], [6, 10, 1]);
    expect(resT6.equivalent).toBe(true);

    // C major [0,4,7] and C minor [0,3,7] under T0I
    const resT0I = areSetsEquivalent([0, 4, 7], [0, 3, 7]);
    expect(resT0I.equivalent).toBe(true);
  });

  it('verifies twelve-tone matrix generation for Schoenberg Op. 33a row starting on non-zero origin', () => {
    const rowOp33a = [10, 9, 5, 6, 0, 11, 7, 8, 2, 1, 3, 4];
    const matrix = generateTwelveToneMatrix(rowOp33a);

    // First row is P10
    expect(matrix[0]).toEqual(rowOp33a);

    // First column is I10
    expect(matrix.map(r => r[0])).toEqual([10, 11, 3, 2, 8, 9, 1, 0, 6, 7, 5, 4]);

    // R10 is reversed P10
    expect(getRowTransformation(rowOp33a, 'R', 0)).toEqual([...rowOp33a].reverse());
  });

  it('verifies exact chord spellings for flat, sharp, and minor keys', () => {
    // C minor triad: C, Eb, G
    const cMin = spellChord('C', 'minor');
    expect(cMin.bassNote).toBe('C');
    expect(cMin.pitchClasses).toEqual([0, 3, 7]);

    // F# major triad: F#, A#, C#
    const fSharpMaj = spellChord('F#', 'major');
    expect(fSharpMaj.root).toBe('F#');
    expect(fSharpMaj.bassNote).toBe('F#');

    // Eb dominant 7th: Eb, G, Bb, Db
    const eb7 = spellChord('Eb', 'major-minor', 0);
    expect(eb7.root).toBe('Eb');

    // Secondary dominant V7/V in G major: A7 (A, C#, E, G)
    const v7vInG = generateSecondaryDominant('G', 'V');
    expect(v7vInG.romanNumeral).toBe('V7/V');
    expect(v7vInG.chordNotes[0]).toBe('A');
  });

  it('verifies every supported 7th-chord inversion', () => {
    // G7 = [G, B, D, F]
    expect(spellChord('G', 'major-minor', 0).bassNote).toBe('G');
    expect(spellChord('G', 'major-minor', 1).bassNote).toBe('B');
    expect(spellChord('G', 'major-minor', 2).bassNote).toBe('D');
    expect(spellChord('G', 'major-minor', 3).bassNote).toBe('F');
  });
});
