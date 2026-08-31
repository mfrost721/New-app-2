/**
 * Scales and Modes Engine
 * Supports Church modes, pentatonic scales, whole-tone, octatonic collections,
 * minor scale variants (natural, harmonic, melodic), and scale-degree formulas.
 */

import { noteToPitchClass, pitchClassToNote } from './pitchClass';

export type ModeName =
  | 'Ionian'
  | 'Dorian'
  | 'Phrygian'
  | 'Lydian'
  | 'Mixolydian'
  | 'Aeolian'
  | 'Locrian'
  | 'Major Pentatonic'
  | 'Minor Pentatonic'
  | 'Whole Tone'
  | 'Octatonic (W-H)'
  | 'Octatonic (H-W)'
  | 'Natural Minor'
  | 'Harmonic Minor'
  | 'Melodic Minor';

export interface ScaleDefinition {
  name: ModeName;
  intervals: number[]; // relative semitones from tonic
  formula: string;     // scale degree formula, e.g. "1 2 b3 4 5 6 b7"
  category: 'church' | 'pentatonic' | 'symmetrical' | 'tonal';
  description: string;
}

export const SCALE_DEFINITIONS: Record<ModeName, ScaleDefinition> = {
  'Ionian': {
    name: 'Ionian',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    formula: '1 2 3 4 5 6 7',
    category: 'church',
    description: 'Standard Major scale.'
  },
  'Dorian': {
    name: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    formula: '1 2 ♭3 4 5 6 ♭7',
    category: 'church',
    description: 'Minor mode with raised 6th degree.'
  },
  'Phrygian': {
    name: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    formula: '1 ♭2 ♭3 4 5 ♭6 ♭7',
    category: 'church',
    description: 'Minor mode with lowered 2nd degree.'
  },
  'Lydian': {
    name: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    formula: '1 2 3 ♯4 5 6 7',
    category: 'church',
    description: 'Major mode with raised 4th degree.'
  },
  'Mixolydian': {
    name: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    formula: '1 2 3 4 5 6 ♭7',
    category: 'church',
    description: 'Major mode with lowered 7th degree.'
  },
  'Aeolian': {
    name: 'Aeolian',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    formula: '1 2 ♭3 4 5 ♭6 ♭7',
    category: 'church',
    description: 'Natural Minor scale.'
  },
  'Locrian': {
    name: 'Locrian',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    formula: '1 ♭2 ♭3 4 ♭5 ♭6 ♭7',
    category: 'church',
    description: 'Diminished mode with lowered 2nd and 5th degrees.'
  },
  'Major Pentatonic': {
    name: 'Major Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    formula: '1 2 3 5 6',
    category: 'pentatonic',
    description: '5-note scale omitting 4th and 7th degrees.'
  },
  'Minor Pentatonic': {
    name: 'Minor Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    formula: '1 ♭3 4 5 ♭7',
    category: 'pentatonic',
    description: '5-note scale omitting 2nd and 6th degrees.'
  },
  'Whole Tone': {
    name: 'Whole Tone',
    intervals: [0, 2, 4, 6, 8, 10],
    formula: '1 2 3 ♯4 ♯5 ♭7',
    category: 'symmetrical',
    description: '6-note symmetrical scale built entirely of whole steps.'
  },
  'Octatonic (W-H)': {
    name: 'Octatonic (W-H)',
    intervals: [0, 2, 3, 5, 6, 8, 9, 11],
    formula: '1 2 ♭3 4 ♭5 ♭6 6 7',
    category: 'symmetrical',
    description: '8-note symmetrical scale alternating Whole and Half steps.'
  },
  'Octatonic (H-W)': {
    name: 'Octatonic (H-W)',
    intervals: [0, 1, 3, 4, 6, 7, 9, 10],
    formula: '1 ♭2 ♭3 3 ♯4 5 6 ♭7',
    category: 'symmetrical',
    description: '8-note symmetrical scale alternating Half and Whole steps.'
  },
  'Natural Minor': {
    name: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    formula: '1 2 ♭3 4 5 ♭6 ♭7',
    category: 'tonal',
    description: 'Aeolian mode.'
  },
  'Harmonic Minor': {
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    formula: '1 2 ♭3 4 5 ♭6 7',
    category: 'tonal',
    description: 'Minor scale with raised 7th leading tone.'
  },
  'Melodic Minor': {
    name: 'Melodic Minor',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    formula: '1 2 ♭3 4 5 6 7',
    category: 'tonal',
    description: 'Minor scale with raised 6th and 7th degrees ascending.'
  }
};

const FLAT_TONICS = new Set(['F', 'BB', 'EB', 'AB', 'DB', 'GB', 'CB', 'DM', 'GM', 'CM', 'FM', 'BBM', 'EBM', 'ABM']);

function normalizeTonicForSpelling(tonicNote: string): string {
  return tonicNote.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Builds scale pitch classes and note names given tonic note and mode name.
 */
export function buildScale(tonicNote: string, modeName: ModeName): { pitchClasses: number[]; noteNames: string[] } {
  const tonicPc = noteToPitchClass(tonicNote);
  const def = SCALE_DEFINITIONS[modeName];
  if (!def) throw new Error(`Unknown mode: ${modeName}`);

  const pitchClasses = def.intervals.map(i => (tonicPc + i) % 12);
  const tonicToken = normalizeTonicForSpelling(tonicNote);
  const preferFlat = FLAT_TONICS.has(tonicToken) || /[A-G]b/.test(tonicNote);
  const noteNames = pitchClasses.map(pc => pitchClassToNote(pc, preferFlat));

  return { pitchClasses, noteNames };
}

/**
 * Identifies scale tonic and mode given a set of pitch classes.
 */
export function identifyScale(pcs: number[], expectedTonic?: number): { tonic: number; tonicNote: string; mode: ModeName } | null {
  const uniquePcs = Array.from(new Set(pcs.map(p => ((p % 12) + 12) % 12))).sort((a, b) => a - b);

  const tonicsToTry = expectedTonic !== undefined
    ? [expectedTonic, ...Array.from({ length: 12 }, (_, i) => i).filter(i => i !== expectedTonic)]
    : Array.from({ length: 12 }, (_, i) => i);

  for (const tonic of tonicsToTry) {
    const relPcs = uniquePcs.map(p => (p - tonic + 12) % 12).sort((a, b) => a - b);
    for (const modeName of Object.keys(SCALE_DEFINITIONS) as ModeName[]) {
      const def = SCALE_DEFINITIONS[modeName];
      if (def.intervals.length === relPcs.length) {
        const matches = def.intervals.every((val, idx) => val === relPcs[idx]);
        if (matches) {
          return {
            tonic,
            tonicNote: pitchClassToNote(tonic),
            mode: modeName
          };
        }
      }
    }
  }

  return null;
}
