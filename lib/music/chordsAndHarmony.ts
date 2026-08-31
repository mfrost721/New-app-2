/**
 * Chords, Harmony & Non-Harmonic Tones Engine
 * Covers Triads, 7th Chords, Inversions, 6/4 Chord Functions, Secondary Dominants,
 * and Non-Harmonic Tone classifications.
 */

import { noteToPitchClass, pitchClassToNote } from './pitchClass';

export type TriadQuality = 'major' | 'minor' | 'diminished' | 'augmented';
export type SeventhQuality =
  | 'major-major'       // Maj7
  | 'major-minor'       // Dom7
  | 'minor-minor'       // Min7
  | 'half-diminished'   // ø7
  | 'fully-diminished'  // °7
  | 'minor-major';      // MinMaj7

export type Inversion = 0 | 1 | 2 | 3; // 0=Root, 1=1st, 2=2nd, 3=3rd

export type SixFourFunction =
  | 'cadential'
  | 'passing'
  | 'pedal'
  | 'arpeggiated';

export type NonHarmonicToneType =
  | 'passing tone'
  | 'neighbor tone'
  | 'suspension'
  | 'retardation'
  | 'appoggiatura'
  | 'escape tone'
  | 'anticipation'
  | 'pedal point'
  | 'changing tone';

export interface ChordSpelling {
  root: string;
  quality: TriadQuality | SeventhQuality;
  inversion: Inversion;
  pitchClasses: number[];
  bassNote: string;
}

export const TRIAD_INTERVALS: Record<TriadQuality, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'diminished': [0, 3, 6],
  'augmented': [0, 4, 8],
};

export const SEVENTH_INTERVALS: Record<SeventhQuality, number[]> = {
  'major-major': [0, 4, 7, 11],
  'major-minor': [0, 4, 7, 10],
  'minor-minor': [0, 3, 7, 10],
  'half-diminished': [0, 3, 6, 10],
  'fully-diminished': [0, 3, 6, 9],
  'minor-major': [0, 3, 7, 11],
};

const FLAT_ROOTS = new Set(['F', 'BB', 'EB', 'AB', 'DB', 'GB', 'CB']);

/**
 * Spells a triad or 7th chord given root, quality, and inversion.
 */
export function spellChord(rootNote: string, quality: TriadQuality | SeventhQuality, inversion: Inversion = 0): ChordSpelling {
  const rootPc = noteToPitchClass(rootNote);
  const intervals = (quality in TRIAD_INTERVALS)
    ? TRIAD_INTERVALS[quality as TriadQuality]
    : SEVENTH_INTERVALS[quality as SeventhQuality];

  const rootPositionPcs = intervals.map(i => (rootPc + i) % 12);
  const bassPc = rootPositionPcs[inversion % rootPositionPcs.length];

  const rootToken = rootNote.trim().toUpperCase().replace(/\s+/g, '');
  const preferFlat = FLAT_ROOTS.has(rootToken) || /[A-G]b/.test(rootNote);
  const bassNote = pitchClassToNote(bassPc, preferFlat);

  return {
    root: pitchClassToNote(rootPc, preferFlat),
    quality,
    inversion,
    pitchClasses: rootPositionPcs,
    bassNote,
  };
}

/**
 * Secondary Dominant Helper
 * Generates the V or V7 chord of a given target Roman numeral in a key.
 */
export interface SecondaryDominantSpec {
  key: string;
  targetDegree: 'ii' | 'iii' | 'IV' | 'V' | 'vi';
  appliedQuality: 'V' | 'V7' | 'vii°' | 'vii°7';
  chordNotes: string[];
  romanNumeral: string;
}

export function generateSecondaryDominant(keyNote: string, targetDegree: 'ii' | 'iii' | 'IV' | 'V' | 'vi'): SecondaryDominantSpec {
  const keyPc = noteToPitchClass(keyNote);
  // Major scale steps
  const scaleDegreeSteps: Record<string, number> = {
    'ii': 2,
    'iii': 4,
    'IV': 5,
    'V': 7,
    'vi': 9,
  };

  const targetStep = scaleDegreeSteps[targetDegree];
  const targetRootPc = (keyPc + targetStep) % 12;

  // The dominant of target is 7 semitones above target root
  const vOfTargetRootPc = (targetRootPc + 7) % 12;
  const vRootNote = pitchClassToNote(vOfTargetRootPc);

  const spelling = spellChord(vRootNote, 'major-minor', 0);
  const chordNotes = spelling.pitchClasses.map(pc => pitchClassToNote(pc));

  return {
    key: keyNote,
    targetDegree,
    appliedQuality: 'V7',
    chordNotes,
    romanNumeral: `V7/${targetDegree}`,
  };
}

/**
 * Non-Harmonic Tone Classifier based on melodic approach and departure.
 */
export function classifyNonHarmonicTone(
  approach: 'step up' | 'step down' | 'leap up' | 'leap down' | 'same',
  departure: 'step up' | 'step down' | 'leap up' | 'leap down' | 'same',
  accented: boolean
): NonHarmonicToneType {
  if (approach === 'step up' && departure === 'step up') return 'passing tone';
  if (approach === 'step down' && departure === 'step down') return 'passing tone';
  if (approach === 'step up' && departure === 'step down') return 'neighbor tone';
  if (approach === 'step down' && departure === 'step up') return 'neighbor tone';
  if (approach === 'same' && departure === 'step down') return accented ? 'suspension' : 'anticipation';
  if (approach === 'same' && departure === 'step up') return 'retardation';
  if (approach.startsWith('leap') && departure.startsWith('step')) return 'appoggiatura';
  if (approach.startsWith('step') && departure.startsWith('leap')) return 'escape tone';
  if (approach === 'same' && departure === 'same') return 'pedal point';

  return 'changing tone';
}
