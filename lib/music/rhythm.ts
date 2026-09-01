/**
 * Rhythm, Meter & Counting Systems Engine
 * Supports asymmetric/mixed meters, tuplets, syncopation, and counting languages
 * (Eastman, 1-e-&-a, Takadimi, and "Pizza" counting).
 */

export type CountingSystem = 'Eastman' | 'Traditional (1-e-&-a)' | 'Takadimi' | 'Pizza';

export interface MeterDefinition {
  timeSignature: [number, number]; // [top, bottom], e.g. [7, 8]
  type: 'simple' | 'compound' | 'asymmetric' | 'mixed';
  beatGroupings: number[]; // e.g. [2, 2, 3] for 7/8
  description: string;
}

export const COMMON_METERS: Record<string, MeterDefinition> = {
  '4/4': { timeSignature: [4, 4], type: 'simple', beatGroupings: [1, 1, 1, 1], description: 'Simple quadruple meter' },
  '3/4': { timeSignature: [3, 4], type: 'simple', beatGroupings: [1, 1, 1], description: 'Simple triple meter' },
  '6/8': { timeSignature: [6, 8], type: 'compound', beatGroupings: [3, 3], description: 'Compound duple meter' },
  '9/8': { timeSignature: [9, 8], type: 'compound', beatGroupings: [3, 3, 3], description: 'Compound triple meter' },
  '5/8': { timeSignature: [5, 8], type: 'asymmetric', beatGroupings: [3, 2], description: 'Asymmetric quintuple meter (3+2 or 2+3)' },
  '7/8': { timeSignature: [7, 8], type: 'asymmetric', beatGroupings: [2, 2, 3], description: 'Asymmetric septuple meter (2+2+3 or 3+2+2)' },
  '11/8': { timeSignature: [11, 8], type: 'asymmetric', beatGroupings: [3, 3, 3, 2], description: 'Asymmetric meter (3+3+3+2)' },
};

/**
 * Generates rhythmic counting syllables for 16th-note subdivisions under specified counting system.
 * beatNumber: 1, 2, 3, 4
 * position: 0 (on-beat), 1 (1st sub), 2 (off-beat), 3 (3rd sub)
 */
export function getRhythmicSyllable(beatNumber: number, position: 0 | 1 | 2 | 3, system: CountingSystem): string {
  switch (system) {
    case 'Eastman':
      // 1-ti-te-ta for 16ths in Eastman
      if (position === 0) return `${beatNumber}`;
      if (position === 1) return 'ti';
      if (position === 2) return 'te';
      if (position === 3) return 'ta';
      break;

    case 'Traditional (1-e-&-a)':
      if (position === 0) return `${beatNumber}`;
      if (position === 1) return 'e';
      if (position === 2) return '&';
      if (position === 3) return 'a';
      break;

    case 'Takadimi':
      if (position === 0) return 'ta';
      if (position === 1) return 'ka';
      if (position === 2) return 'di';
      if (position === 3) return 'mi';
      break;

    case 'Pizza':
      // Informal professor's pizza counting: Piz-za-slice-hot / Piz-za
      if (position === 0) return 'Piz';
      if (position === 1) return 'za';
      if (position === 2) return 'slice';
      if (position === 3) return 'hot';
      break;
  }
  return `${beatNumber}`;
}

/**
 * Analyzes rhythmic grouping and checks if an onset falls on a syncopated position.
 */
export function isSyncopated(subdivisionIndex: number): boolean {
  // Syncopated if onset is off-beat (e.g. position 1 or 3 in 4-subdivision)
  const pos = subdivisionIndex % 4;
  return pos === 1 || pos === 3;
}

export interface TupletDefinition {
  ratio: string; // e.g. "3:2" (3 notes in time of 2)
  numNotes: number;
  inTimeOf: number;
  description: string;
}

export const COMMON_TUPLETS: Record<string, TupletDefinition> = {
  'Triplet': { ratio: '3:2', numNotes: 3, inTimeOf: 2, description: '3 notes played in the time of 2' },
  'Duplet': { ratio: '2:3', numNotes: 2, inTimeOf: 3, description: '2 notes played in the time of 3 (compound meter)' },
  'Quintuplet': { ratio: '5:4', numNotes: 5, inTimeOf: 4, description: '5 notes played in the time of 4' },
  'Septuplet': { ratio: '7:4', numNotes: 7, inTimeOf: 4, description: '7 notes played in the time of 4' },
  'Sextuplet': { ratio: '6:4', numNotes: 6, inTimeOf: 4, description: '6 notes played in the time of 4' },
};

export function getTupletDurationFactor(tuplet: TupletDefinition): number {
  return tuplet.inTimeOf / tuplet.numNotes;
}

/**
 * Validates whether an additive grouping (e.g., [3, 2, 2]) sums up to the top number of a time signature.
 */
export function isValidAdditiveGrouping(groupings: number[], topNumber: number): boolean {
  const sum = groupings.reduce((acc, curr) => acc + curr, 0);
  return sum === topNumber;
}
