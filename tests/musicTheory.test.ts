import { describe, it, expect } from 'vitest';
import {
  noteToPitchClass,
  pitchClassToNote,
  getNormalOrder,
  getPrimeForm,
  getIntervalVector,
  formatIntervalVector,
  areSetsEquivalent,
} from '../lib/music/pitchClass';

import {
  generateTwelveToneMatrix,
  getRowTransformation,
  identifyRowTransformation,
  isValidTwelveToneRow,
} from '../lib/music/twelveTone';

import { buildScale, identifyScale } from '../lib/music/scalesAndModes';
import { spellChord, generateSecondaryDominant, classifyNonHarmonicTone } from '../lib/music/chordsAndHarmony';
import { getRhythmicSyllable } from '../lib/music/rhythm';

describe('Pitch Class Set Theory Engine', () => {
  it('converts note names to pitch classes and vice versa', () => {
    expect(noteToPitchClass('C')).toBe(0);
    expect(noteToPitchClass('C#')).toBe(1);
    expect(noteToPitchClass('Db')).toBe(1);
    expect(noteToPitchClass('B')).toBe(11);
    expect(pitchClassToNote(0)).toBe('C');
    expect(pitchClassToNote(1, true)).toBe('Db');
  });

  it('calculates normal order correctly', () => {
    // [0, 1, 4] is normal order of [4, 1, 0]
    expect(getNormalOrder([4, 1, 0])).toEqual([0, 1, 4]);
    // C, E, G -> [0, 4, 7]
    expect(getNormalOrder([7, 0, 4])).toEqual([0, 4, 7]);
  });

  it('calculates prime form correctly (Forte / Rahn standard)', () => {
    // Major triad [0, 4, 7] prime form is [0, 3, 7]
    expect(getPrimeForm([0, 4, 7])).toEqual([0, 3, 7]);
    // Minor triad [0, 3, 7] prime form is [0, 3, 7]
    expect(getPrimeForm([0, 3, 7])).toEqual([0, 3, 7]);
    // Viennese trichord [0, 1, 6] prime form is [0, 1, 6]
    expect(getPrimeForm([0, 1, 6])).toEqual([0, 1, 6]);
  });

  it('calculates interval-class vector correctly', () => {
    // Major triad [0, 4, 7]: icv <0 0 1 1 1 0>
    const vecMajor = getIntervalVector([0, 4, 7]);
    expect(vecMajor).toEqual([0, 0, 1, 1, 1, 0]);
    expect(formatIntervalVector(vecMajor)).toBe('<0 0 1 1 1 0>');
  });

  it('checks set equivalence correctly', () => {
    // C major [0,4,7] and D major [2,6,9] under T2
    const res = areSetsEquivalent([0, 4, 7], [2, 6, 9]);
    expect(res.equivalent).toBe(true);
    expect(res.transformation).toBe('T2');
  });
});

describe('Twelve-Tone Serialism Engine', () => {
  const p0 = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6]; // Schoenberg Op. 33a row

  it('validates a twelve-tone row', () => {
    expect(isValidTwelveToneRow(p0)).toBe(true);
    expect(isValidTwelveToneRow([0, 1, 2])).toBe(false);
  });

  it('generates a 12x12 matrix with valid bounds', () => {
    const matrix = generateTwelveToneMatrix(p0);
    expect(matrix.length).toBe(12);
    expect(matrix[0].length).toBe(12);
    expect(matrix[0][0]).toBe(0); // P0 first element
  });

  it('retrieves row transformations', () => {
    const p0Result = getRowTransformation(p0, 'P', 0);
    expect(p0Result).toEqual(p0);

    const r0Result = getRowTransformation(p0, 'R', 0);
    expect(r0Result).toEqual([...p0].reverse());
  });

  it('handles twelve-tone inversion correctly for rows not starting on 0', () => {
    const nonZeroP0 = [7, 8, 0, 11, 2, 1, 9, 10, 4, 3, 5, 6];
    const i0 = getRowTransformation(nonZeroP0, 'I', 0);
    // I0[0] should start on nonZeroP0[0] = 7
    expect(i0[0]).toBe(7);
  });

  it('identifies row transformations correctly', () => {
    const r0 = [...p0].reverse();
    const found = identifyRowTransformation(p0, r0);
    expect(found).not.toBeNull();
    expect(found?.form).toBe('R');
  });
});

describe('Scales and Modes Engine', () => {
  it('builds Dorian mode on D correctly', () => {
    const dDorian = buildScale('D', 'Dorian');
    expect(dDorian.pitchClasses).toEqual([2, 4, 5, 7, 9, 11, 0]);
  });

  it('spells Bb Ionian with flats', () => {
    const bbIonian = buildScale('Bb', 'Ionian');
    expect(bbIonian.noteNames).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
  });

  it('spells Db Ionian with flats', () => {
    const dbIonian = buildScale('Db', 'Ionian');
    expect(dbIonian.noteNames).toEqual(['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']);
  });

  it('identifies scale tonic and mode', () => {
    const identified = identifyScale([2, 4, 5, 7, 9, 11, 0], 2);
    expect(identified?.tonicNote).toBe('D');
    expect(identified?.mode).toBe('Dorian');
  });
});

describe('Chords and Harmony Engine', () => {
  it('spells chords and inversions', () => {
    const cMaj = spellChord('C', 'major', 0);
    expect(cMaj.pitchClasses).toEqual([0, 4, 7]);
    expect(cMaj.bassNote).toBe('C');

    const gDom7Inversion1 = spellChord('G', 'major-minor', 1); // 1st inversion G7: B in bass
    expect(gDom7Inversion1.bassNote).toBe('B');
  });

  it('spells Bb major root and bass as Bb', () => {
    const bbMajor = spellChord('Bb', 'major');
    expect(bbMajor.root).toBe('Bb');
    expect(bbMajor.bassNote).toBe('Bb');
  });

  it('generates secondary dominants', () => {
    // V7/V in C major is D7 (D, F#, A, C)
    const v7ofV = generateSecondaryDominant('C', 'V');
    expect(v7ofV.romanNumeral).toBe('V7/V');
    expect(v7ofV.chordNotes[0]).toBe('D');
  });

  it('classifies non-harmonic tones', () => {
    expect(classifyNonHarmonicTone('step up', 'step up', false)).toBe('passing tone');
    expect(classifyNonHarmonicTone('step up', 'step down', false)).toBe('neighbor tone');
    expect(classifyNonHarmonicTone('same', 'step down', true)).toBe('suspension');
  });
});

describe('Rhythm & Counting Engine', () => {
  it('returns appropriate rhythmic counting syllables', () => {
    expect(getRhythmicSyllable(1, 0, 'Eastman')).toBe('1');
    expect(getRhythmicSyllable(1, 1, 'Eastman')).toBe('ti');
    expect(getRhythmicSyllable(1, 2, 'Traditional (1-e-&-a)')).toBe('&');
    expect(getRhythmicSyllable(1, 3, 'Takadimi')).toBe('mi');
    expect(getRhythmicSyllable(1, 0, 'Pizza')).toBe('Piz');
  });
});
