import { describe, it, expect } from 'vitest';
import {
  noteToPitchClass,
  getNormalOrder,
  getPrimeForm,
  getIntervalVector,
  areSetsEquivalent,
} from '../lib/music/pitchClass';
import {
  getRowTransformation,
  identifyRowTransformation,
  isValidTwelveToneRow,
} from '../lib/music/twelveTone';
import { buildScale } from '../lib/music/scalesAndModes';
import { spellChord, classifyNonHarmonicTone } from '../lib/music/chordsAndHarmony';

describe('Pitch Class & Set Theory Edge Cases', () => {
  it('handles octave numbers and strange note casing in noteToPitchClass', () => {
    expect(noteToPitchClass('C4')).toBe(0);
    expect(noteToPitchClass('F#3')).toBe(6);
    expect(noteToPitchClass('  bb5 ')).toBe(10);
    expect(noteToPitchClass('eb2')).toBe(3);
    expect(noteToPitchClass('B#')).toBe(0);
    expect(noteToPitchClass('Cb')).toBe(11);
    expect(noteToPitchClass('E#')).toBe(5);
    expect(noteToPitchClass('Fb')).toBe(4);
    expect(noteToPitchClass('15')).toBe(3);
    expect(noteToPitchClass('-3')).toBe(9);
    expect(() => noteToPitchClass('UNKNOWN')).toThrow('Invalid note name or integer');
  });

  it('normalizes pitch classes properly in getNormalOrder', () => {
    // Empty set
    expect(getNormalOrder([])).toEqual([]);
    // Single pitch class
    expect(getNormalOrder([5])).toEqual([5]);
    // Set with duplicates and out of bounds numbers
    expect(getNormalOrder([14, 2, 14, -1])).toEqual([11, 2]); // -1 -> 11, 14 -> 2, unique set [11, 2]
    // Tie-breaking case for normal order selection
    expect(getNormalOrder([0, 3, 4, 7])).toEqual([0, 3, 4, 7]);
  });

  it('handles empty or single pitch class set in getPrimeForm', () => {
    expect(getPrimeForm([])).toEqual([]);
    expect(getPrimeForm([7])).toEqual([0]);
  });

  it('calculates interval vectors for dyad and tetrachord', () => {
    // Interval class of C to G (0, 7) is IC5 -> <0 0 0 0 1 0>
    expect(getIntervalVector([0, 7])).toEqual([0, 0, 0, 0, 1, 0]);
    // All-interval tetrachord [0, 1, 4, 6] -> <1 1 1 1 1 1>
    expect(getIntervalVector([0, 1, 4, 6])).toEqual([1, 1, 1, 1, 1, 1]);
    // Full chromatic aggregate [0..11] -> <12 12 12 12 12 6>
    expect(getIntervalVector([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toEqual([12, 12, 12, 12, 12, 6]);
  });

  it('detects set non-equivalence properly', () => {
    const res = areSetsEquivalent([0, 4, 7], [0, 1, 2]);
    expect(res.equivalent).toBe(false);
    expect(res.transformation).toBeUndefined();
  });

  it('correctly identifies Tn transformation when set normal order wraps around 0', () => {
    // Pitch class set [11, 0, 2] (Normal order is [11, 0, 2])
    const res = areSetsEquivalent([11, 0, 2], [11, 0, 2]);
    expect(res.equivalent).toBe(true);
    expect(res.transformation).toBe('T0');
  });
});

describe('Twelve-Tone Transformations Edge Cases', () => {
  const p0 = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];

  it('validates rows with wrong lengths or duplicate numbers', () => {
    expect(isValidTwelveToneRow([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(false);
    expect(isValidTwelveToneRow([0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(false);
  });

  it('generates RI row transformations correctly', () => {
    const ri0 = getRowTransformation(p0, 'RI', 0);
    const i0 = getRowTransformation(p0, 'I', 0);
    expect(ri0).toEqual([...i0].reverse());
  });

  it('identifies Inversion and Retrograde-Inversion row forms', () => {
    const i0 = getRowTransformation(p0, 'I', 0);
    const idI = identifyRowTransformation(p0, i0);
    expect(idI?.form).toBe('I');
    expect(idI?.index).toBe(0);

    const ri3 = getRowTransformation(p0, 'RI', 3);
    const idRI = identifyRowTransformation(p0, ri3);
    expect(idRI?.form).toBe('RI');
    expect(idRI?.index).toBe(3);

    // Partial row segment matching
    const partialSegment = ri3.slice(0, 4);
    const idPartial = identifyRowTransformation(p0, partialSegment);
    expect(idPartial?.form).toBe('RI');
    expect(idPartial?.index).toBe(3);

    // Unmatched row segment
    expect(identifyRowTransformation(p0, [0, 0, 0, 0])).toBeNull();
  });
});

describe('Scales, Modes, & Chords Edge Cases', () => {
  it('builds whole tone and octatonic symmetrical scales', () => {
    const wt = buildScale('C', 'Whole Tone');
    expect(wt.pitchClasses).toEqual([0, 2, 4, 6, 8, 10]);

    const octWH = buildScale('C', 'Octatonic (W-H)');
    expect(octWH.pitchClasses.length).toBe(8);
  });

  it('throws error when building scale with invalid mode name', () => {
    // @ts-expect-error test runtime invalid mode
    expect(() => buildScale('C', 'NonExistentMode')).toThrow('Unknown mode');
  });

  it('spells 2nd and 3rd inversions for 7th chords', () => {
    // G7 2nd inversion: 5th (D) in bass
    const g7inv2 = spellChord('G', 'major-minor', 2);
    expect(g7inv2.bassNote).toBe('D');

    // G7 3rd inversion: 7th (F) in bass
    const g7inv3 = spellChord('G', 'major-minor', 3);
    expect(g7inv3.bassNote).toBe('F');
  });

  it('spells diminished and half-diminished 7th chords', () => {
    const bHalfDim = spellChord('B', 'half-diminished', 0);
    expect(bHalfDim.pitchClasses).toEqual([11, 2, 5, 9]);

    const cDim7 = spellChord('C', 'fully-diminished', 0);
    expect(cDim7.pitchClasses).toEqual([0, 3, 6, 9]);
  });

  it('classifies non-harmonic tones accurately', () => {
    expect(classifyNonHarmonicTone('leap up', 'step down', false)).toBe('appoggiatura');
    expect(classifyNonHarmonicTone('step up', 'leap down', false)).toBe('escape tone');
    expect(classifyNonHarmonicTone('same', 'step down', false)).toBe('anticipation');
    expect(classifyNonHarmonicTone('same', 'step down', true)).toBe('suspension');
  });
});
