/**
 * Pitch Class Set Theory Engine
 * Handles pitch classes, normal order, prime form, interval-class vectors,
 * transposition, inversion, and set equivalence.
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLAT_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type NoteName = typeof NOTE_NAMES[number] | typeof FLAT_NOTE_NAMES[number];

/**
 * Converts note name to pitch class integer (0-11).
 */
export function noteToPitchClass(note: string): number {
  const clean = note.trim().toUpperCase();
  const map: Record<string, number> = {
    'C': 0, 'B#': 0,
    'C#': 1, 'DB': 1,
    'D': 2,
    'D#': 3, 'EB': 3,
    'E': 4, 'FB': 4,
    'F': 5, 'E#': 5,
    'F#': 6, 'GB': 6,
    'G': 7,
    'G#': 8, 'AB': 8,
    'A': 9,
    'A#': 10, 'BB': 10,
    'B': 11, 'CB': 11,
  };
  if (clean in map) return map[clean];
  const parsed = parseInt(clean, 10);
  if (!isNaN(parsed)) return ((parsed % 12) + 12) % 12;
  throw new Error(`Invalid note name or integer: ${note}`);
}

/**
 * Converts pitch class integer (0-11) to note name.
 */
export function pitchClassToNote(pc: number, preferFlat = false): string {
  const mod = ((pc % 12) + 12) % 12;
  return preferFlat ? FLAT_NOTE_NAMES[mod] : NOTE_NAMES[mod];
}

/**
 * Normalizes an array of pitch classes into a sorted, unique set in mod 12.
 */
export function toPitchClassSet(pcs: number[]): number[] {
  const set = Array.from(new Set(pcs.map(p => ((p % 12) + 12) % 12)));
  return set.sort((a, b) => a - b);
}

/**
 * Calculates the total span between first and last note of a pitch set in circular order.
 */
function getSpan(set: number[]): number {
  if (set.length === 0) return 0;
  return ((set[set.length - 1] - set[0]) % 12 + 12) % 12;
}

/**
 * Calculates the Normal Order of a pitch class set.
 * Standard Straus/Forte definition: compact layout with smallest total span.
 */
export function getNormalOrder(pcs: number[]): number[] {
  const unique = toPitchClassSet(pcs);
  const n = unique.length;
  if (n <= 1) return unique;

  // Generate all rotations
  const rotations: number[][] = [];
  for (let i = 0; i < n; i++) {
    const rot = unique.slice(i).concat(unique.slice(0, i));
    rotations.push(rot);
  }

  // Find minimum span from first to last element
  let minSpan = 12;
  let candidates: number[][] = [];

  for (const rot of rotations) {
    const span = getSpan(rot);
    if (span < minSpan) {
      minSpan = span;
      candidates = [rot];
    } else if (span === minSpan) {
      candidates.push(rot);
    }
  }

  if (candidates.length === 1) return candidates[0];

  // Tie-breaker: compare smaller intervals from first element to second-to-last, third-to-last, etc.
  for (let k = n - 2; k >= 1; k--) {
    let minSubSpan = 12;
    let nextCandidates: number[][] = [];
    for (const cand of candidates) {
      const subSpan = ((cand[k] - cand[0]) % 12 + 12) % 12;
      if (subSpan < minSubSpan) {
        minSubSpan = subSpan;
        nextCandidates = [cand];
      } else if (subSpan === minSubSpan) {
        nextCandidates.push(cand);
      }
    }
    candidates = nextCandidates;
    if (candidates.length === 1) break;
  }

  return candidates[0];
}

/**
 * Transposes a pitch class set by n semitones.
 */
export function transposeSet(pcs: number[], n: number): number[] {
  return pcs.map(p => ((p + n) % 12 + 12) % 12);
}

/**
 * Inverts a pitch class set around 0 (or optionally index n).
 */
export function invertSet(pcs: number[], axis = 0): number[] {
  return pcs.map(p => ((axis - p) % 12 + 12) % 12);
}

/**
 * Calculates the Prime Form (Forte/Rahn standard) of a pitch class set.
 */
export function getPrimeForm(pcs: number[]): number[] {
  const normal = getNormalOrder(pcs);
  if (normal.length === 0) return [];

  // Transpose normal order to start at 0
  const t0Normal = transposeSet(normal, -normal[0]);

  // Invert normal order, compute normal order of inverted set, and transpose to 0
  const inverted = invertSet(normal, 0);
  const invertedNormal = getNormalOrder(inverted);
  const t0Inverted = transposeSet(invertedNormal, -invertedNormal[0]);

  // Compare t0Normal and t0Inverted packed from left to right
  for (let i = t0Normal.length - 1; i >= 0; i--) {
    if (t0Normal[i] < t0Inverted[i]) return t0Normal;
    if (t0Inverted[i] < t0Normal[i]) return t0Inverted;
  }

  return t0Normal;
}

/**
 * Calculates the Interval-Class Vector (icv) <ic1, ic2, ic3, ic4, ic5, ic6>
 */
export function getIntervalVector(pcs: number[]): [number, number, number, number, number, number] {
  const unique = toPitchClassSet(pcs);
  const vector: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];

  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const diff = Math.abs(unique[i] - unique[j]) % 12;
      const ic = diff > 6 ? 12 - diff : diff;
      if (ic >= 1 && ic <= 6) {
        vector[ic - 1]++;
      }
    }
  }

  return vector;
}

/**
 * Formats interval vector as standard bracket string, e.g. "<1 0 1 1 0 0>"
 */
export function formatIntervalVector(vec: [number, number, number, number, number, number]): string {
  return `<${vec.join(' ')}>`;
}

/**
 * Checks if two pitch class sets are equivalent under Tn or TnI.
 */
/**
 * Common Z-related pairs catalog (Forte designation and Prime forms).
 */
export const Z_RELATED_PAIRS = [
  { pair: ['4-Z15', '4-Z29'], primeA: [0, 1, 4, 6], primeB: [0, 1, 3, 7], icv: '<1 1 1 1 1 1>' },
  { pair: ['5-Z12', '5-Z36'], primeA: [0, 1, 3, 5, 6], primeB: [0, 1, 2, 4, 7], icv: '<2 2 2 1 1 2>' },
  { pair: ['5-Z17', '5-Z37'], primeA: [0, 1, 3, 4, 8], primeB: [0, 1, 3, 6, 8], icv: '<2 1 2 3 2 0>' },
  { pair: ['5-Z18', '5-Z38'], primeA: [0, 1, 4, 5, 7], primeB: [0, 1, 2, 5, 8], icv: '<2 1 2 2 2 1>' },
  { pair: ['6-Z3', '6-Z36'], primeA: [0, 1, 2, 3, 5, 6], primeB: [0, 1, 2, 3, 4, 7], icv: '<4 3 3 2 2 1>' },
  { pair: ['6-Z17', '6-Z43'], primeA: [0, 1, 2, 4, 7, 8], primeB: [0, 1, 2, 5, 6, 8], icv: '<3 2 2 3 3 2>' },
  { pair: ['6-Z19', '6-Z44'], primeA: [0, 1, 3, 4, 7, 8], primeB: [0, 1, 2, 5, 6, 9], icv: '<3 1 3 4 3 1>' },
  { pair: ['6-Z28', '6-Z49'], primeA: [0, 1, 3, 5, 6, 9], primeB: [0, 1, 3, 4, 7, 9], icv: '<3 1 4 2 4 1>' },
] as const;

/**
 * Checks if two pitch class sets are Z-related
 * (share the exact same interval-class vector but are not equivalent under Tn or TnI).
 */
export function isZRelatedPair(setA: number[], setB: number[]): boolean {
  const vecA = getIntervalVector(setA);
  const vecB = getIntervalVector(setB);
  const sameIcv = vecA.every((val, i) => val === vecB[i]);
  if (!sameIcv) return false;

  const eq = areSetsEquivalent(setA, setB);
  return !eq.equivalent;
}

export function areSetsEquivalent(setA: number[], setB: number[]): { equivalent: boolean; transformation?: string } {
  const primeA = getPrimeForm(setA);
  const primeB = getPrimeForm(setB);

  if (primeA.length !== primeB.length) return { equivalent: false };

  const isSamePrime = primeA.every((val, idx) => val === primeB[idx]);
  if (!isSamePrime) return { equivalent: false };

  // Check Tn
  const normA = getNormalOrder(setA);
  const normB = getNormalOrder(setB);

  for (let n = 0; n < 12; n++) {
    const tA = toPitchClassSet(transposeSet(normA, n));
    if (tA.length === normB.length && tA.every((v, i) => v === normB[i])) {
      return { equivalent: true, transformation: `T${n}` };
    }
  }

  // Check TnI
  for (let n = 0; n < 12; n++) {
    const tiA = toPitchClassSet(invertSet(normA, n));
    if (tiA.length === normB.length && tiA.every((v, i) => v === normB[i])) {
      return { equivalent: true, transformation: `T${n}I` };
    }
  }

  return { equivalent: true, transformation: 'TnI' };
}
