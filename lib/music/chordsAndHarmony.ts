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

  const cleanRoot = rootNote.trim().toUpperCase();
  const isSharpRoot = cleanRoot.includes('#');
  const isFlatRoot = !isSharpRoot && ['F', 'BB', 'EB', 'AB', 'DB', 'GB', 'CB'].some(k => cleanRoot.startsWith(k));
  const isMinorOrDimOrFlat7 = ['minor', 'diminished', 'minor-minor', 'half-diminished', 'fully-diminished', 'major-minor'].includes(quality);
  const preferFlat = isFlatRoot || isMinorOrDimOrFlat7;
  const bassNote = pitchClassToNote(bassPc, preferFlat);

  return {
    root: pitchClassToNote(rootPc, isFlatRoot),
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

export type CadenceType =
  | 'Perfect Authentic Cadence (PAC)'
  | 'Imperfect Authentic Cadence (IAC)'
  | 'Half Cadence (HC)'
  | 'Plagal Cadence (PC)'
  | 'Deceptive Cadence (DC)';

export interface CadenceDefinition {
  type: CadenceType;
  chords: string; // e.g., "V - I"
  description: string;
}

export const CADENCE_DEFINITIONS: Record<CadenceType, CadenceDefinition> = {
  'Perfect Authentic Cadence (PAC)': {
    type: 'Perfect Authentic Cadence (PAC)',
    chords: 'V(7) - I',
    description: 'Root position V to I, with tonic in top voice of final chord.',
  },
  'Imperfect Authentic Cadence (IAC)': {
    type: 'Imperfect Authentic Cadence (IAC)',
    chords: 'V(7) - I',
    description: 'V to I progression where either chord is inverted or tonic is not in top voice.',
  },
  'Half Cadence (HC)': {
    type: 'Half Cadence (HC)',
    chords: 'Any - V',
    description: 'Phrase ends on a Dominant V chord (creates expectation of resolution).',
  },
  'Plagal Cadence (PC)': {
    type: 'Plagal Cadence (PC)',
    chords: 'IV - I',
    description: 'Subdominant IV resolving to Tonic I ("Amen cadence").',
  },
  'Deceptive Cadence (DC)': {
    type: 'Deceptive Cadence (DC)',
    chords: 'V - vi (or VI in minor)',
    description: 'Dominant V resolves unexpectedly to Submediant vi/VI instead of Tonic.',
  },
};

export interface KeySignatureInfo {
  key: string;
  type: 'major' | 'minor';
  accidentalsCount: number;
  accidentalType: 'sharps' | 'flats' | 'none';
  accidentalNotes: string[];
}

export const KEY_SIGNATURES: Record<string, KeySignatureInfo> = {
  'C major': { key: 'C major', type: 'major', accidentalsCount: 0, accidentalType: 'none', accidentalNotes: [] },
  'G major': { key: 'G major', type: 'major', accidentalsCount: 1, accidentalType: 'sharps', accidentalNotes: ['F#'] },
  'D major': { key: 'D major', type: 'major', accidentalsCount: 2, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#'] },
  'A major': { key: 'A major', type: 'major', accidentalsCount: 3, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#', 'G#'] },
  'E major': { key: 'E major', type: 'major', accidentalsCount: 4, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#', 'G#', 'D#'] },
  'B major': { key: 'B major', type: 'major', accidentalsCount: 5, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#', 'G#', 'D#', 'A#'] },
  'F# major': { key: 'F# major', type: 'major', accidentalsCount: 6, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'] },
  'C# major': { key: 'C# major', type: 'major', accidentalsCount: 7, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'] },

  'F major': { key: 'F major', type: 'major', accidentalsCount: 1, accidentalType: 'flats', accidentalNotes: ['Bb'] },
  'Bb major': { key: 'Bb major', type: 'major', accidentalsCount: 2, accidentalType: 'flats', accidentalNotes: ['Bb', 'Eb'] },
  'Eb major': { key: 'Eb major', type: 'major', accidentalsCount: 3, accidentalType: 'flats', accidentalNotes: ['Bb', 'Eb', 'Ab'] },
  'Ab major': { key: 'Ab major', type: 'major', accidentalsCount: 4, accidentalType: 'flats', accidentalNotes: ['Bb', 'Eb', 'Ab', 'Db'] },
  'Db major': { key: 'Db major', type: 'major', accidentalsCount: 5, accidentalType: 'flats', accidentalNotes: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'] },
  'Gb major': { key: 'Gb major', type: 'major', accidentalsCount: 6, accidentalType: 'flats', accidentalNotes: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'] },
  'Cb major': { key: 'Cb major', type: 'major', accidentalsCount: 7, accidentalType: 'flats', accidentalNotes: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'] },

  'A minor': { key: 'A minor', type: 'minor', accidentalsCount: 0, accidentalType: 'none', accidentalNotes: [] },
  'E minor': { key: 'E minor', type: 'minor', accidentalsCount: 1, accidentalType: 'sharps', accidentalNotes: ['F#'] },
  'B minor': { key: 'B minor', type: 'minor', accidentalsCount: 2, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#'] },
  'F# minor': { key: 'F# minor', type: 'minor', accidentalsCount: 3, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#', 'G#'] },
  'C# minor': { key: 'C# minor', type: 'minor', accidentalsCount: 4, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#', 'G#', 'D#'] },
  'G# minor': { key: 'G# minor', type: 'minor', accidentalsCount: 5, accidentalType: 'sharps', accidentalNotes: ['F#', 'C#', 'G#', 'D#', 'A#'] },

  'D minor': { key: 'D minor', type: 'minor', accidentalsCount: 1, accidentalType: 'flats', accidentalNotes: ['Bb'] },
  'G minor': { key: 'G minor', type: 'minor', accidentalsCount: 2, accidentalType: 'flats', accidentalNotes: ['Bb', 'Eb'] },
  'C minor': { key: 'C minor', type: 'minor', accidentalsCount: 3, accidentalType: 'flats', accidentalNotes: ['Bb', 'Eb', 'Ab'] },
  'F minor': { key: 'F minor', type: 'minor', accidentalsCount: 4, accidentalType: 'flats', accidentalNotes: ['Bb', 'Eb', 'Ab', 'Db'] },
};

export type IntervalQuality = 'P' | 'm' | 'M' | 'A' | 'd';

export interface IntervalDefinition {
  name: string;
  semitones: number;
  quality: IntervalQuality;
  genericNumber: number; // 1 to 8
}

export const INTERVAL_TABLE: Record<number, { defaultName: string; quality: IntervalQuality; genericNumber: number }> = {
  0: { defaultName: 'Perfect Unison', quality: 'P', genericNumber: 1 },
  1: { defaultName: 'Minor 2nd', quality: 'm', genericNumber: 2 },
  2: { defaultName: 'Major 2nd', quality: 'M', genericNumber: 2 },
  3: { defaultName: 'Minor 3rd', quality: 'm', genericNumber: 3 },
  4: { defaultName: 'Major 3rd', quality: 'M', genericNumber: 3 },
  5: { defaultName: 'Perfect 4th', quality: 'P', genericNumber: 4 },
  6: { defaultName: 'Tritone / Augmented 4th', quality: 'A', genericNumber: 4 },
  7: { defaultName: 'Perfect 5th', quality: 'P', genericNumber: 5 },
  8: { defaultName: 'Minor 6th', quality: 'm', genericNumber: 6 },
  9: { defaultName: 'Major 6th', quality: 'M', genericNumber: 6 },
  10: { defaultName: 'Minor 7th', quality: 'm', genericNumber: 7 },
  11: { defaultName: 'Major 7th', quality: 'M', genericNumber: 7 },
  12: { defaultName: 'Perfect Octave', quality: 'P', genericNumber: 8 },
};

/**
 * Calculates semitone distance between two note names (spelling-sensitive or pitch class based).
 */
export function getIntervalSemitones(note1: string, note2: string): number {
  const pc1 = noteToPitchClass(note1);
  const pc2 = noteToPitchClass(note2);
  return (pc2 - pc1 + 12) % 12;
}
