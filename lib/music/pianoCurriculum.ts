/**
 * Class Piano III & IV Curriculum & Exercise Library
 * Defines structured curriculum, progressive difficulty, prerequisites,
 * target MIDI note sequences, fingerings, instructions, and theoretical explanations.
 */

import { buildScale, ModeName } from './scalesAndModes';
import { TRIAD_INTERVALS, SEVENTH_INTERVALS } from './chordsAndHarmony';

export type PianoLevel = 'Class Piano III' | 'Class Piano IV';

export type PianoCategory =
  | 'scales'
  | 'arpeggios'
  | 'chords_cadences'
  | 'harmonization_transposition'
  | 'sight_reading_rhythm'
  | 'repertoire_project';

export interface PianoExercise {
  id: string;
  level: PianoLevel;
  category: PianoCategory;
  title: string;
  keySignature: string; // e.g., 'C Major', 'F# Minor'
  difficulty: number; // 1 to 5
  prerequisites: string[]; // exercise IDs expected prior
  targetTempoBpm: number;
  octaves?: number;
  hands?: 'RH' | 'LH' | 'HT';
  standardFingering?: string;
  instructions: string;
  explanation: string;
  targetNotes: number[]; // Sequential target MIDI notes
  targetChords?: number[][]; // For chord progressions: sequence of simultaneous note groups
  rhythmBeats?: number[]; // Duration of each note/chord in beat fractions
  transpositionKeys?: string[]; // Keys available for transposition
  scoreNotation?: string; // Simple visual/textual score representation
}

// Map root notes to standard starting MIDI pitch (around C4=60 for RH)
export const ROOT_MIDI_MAP: Record<string, number> = {
  'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63, 'E': 64,
  'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68, 'Ab': 68, 'A': 69,
  'A#': 70, 'Bb': 70, 'B': 71,
};

// Standard fingerings guide for scales
export const SCALE_FINGERINGS: Record<string, string> = {
  'C Major': 'RH: 1-2-3-1-2-3-4-5 | LH: 5-4-3-2-1-3-2-1',
  'G Major': 'RH: 1-2-3-1-2-3-4-5 | LH: 5-4-3-2-1-3-2-1',
  'D Major': 'RH: 1-2-3-1-2-3-4-5 | LH: 5-4-3-2-1-3-2-1',
  'A Major': 'RH: 1-2-3-1-2-3-4-5 | LH: 5-4-3-2-1-3-2-1',
  'E Major': 'RH: 1-2-3-1-2-3-4-5 | LH: 5-4-3-2-1-3-2-1',
  'B Major': 'RH: 1-2-3-1-2-3-4-5 | LH: 4-3-2-1-4-3-2-1',
  'F# Major': 'RH: 2-3-4-1-2-3-1-2 | LH: 4-3-2-1-3-2-1-4',
  'Db Major': 'RH: 2-3-1-2-3-4-1-2 | LH: 3-2-1-4-3-2-1-3',
  'Ab Major': 'RH: 3-4-1-2-3-1-2-3 | LH: 3-2-1-4-3-2-1-3',
  'Eb Major': 'RH: 3-1-2-3-4-1-2-3 | LH: 3-2-1-4-3-2-1-3',
  'Bb Major': 'RH: 2-1-2-3-1-2-3-4 | LH: 3-2-1-4-3-2-1-3',
  'F Major': 'RH: 1-2-3-4-1-2-3-4 | LH: 5-4-3-2-1-3-2-1',
  'Default Minor': 'RH: 1-2-3-1-2-3-4-5 | LH: 5-4-3-2-1-3-2-1',
};

/**
 * Builds sequential target MIDI notes for scales (ascending & descending).
 */
export function generateScaleNotes(
  rootNote: string,
  scaleType: 'Major' | 'Natural Minor' | 'Harmonic Minor' | 'Melodic Minor',
  octaves: number = 2,
  startMidi?: number
): number[] {
  const modeNameMap: Record<string, ModeName> = {
    'Major': 'Ionian',
    'Natural Minor': 'Natural Minor',
    'Harmonic Minor': 'Harmonic Minor',
    'Melodic Minor': 'Melodic Minor',
  };
  const modeName = modeNameMap[scaleType];
  const { pitchClasses } = buildScale(rootNote, modeName);

  const baseMidi = startMidi ?? (ROOT_MIDI_MAP[rootNote] || 60);

  // Build multi-octave relative semitone array from root
  const cumulativeSemitones: number[] = [0];
  let currentSemitone = 0;
  for (let oct = 0; oct < octaves; oct++) {
    for (let i = 1; i < pitchClasses.length; i++) {
      const step = (pitchClasses[i] - pitchClasses[i - 1] + 12) % 12;
      currentSemitone += (step === 0 ? 12 : step);
      cumulativeSemitones.push(currentSemitone);
    }
    // Step to octave tonic
    const lastPc = pitchClasses[pitchClasses.length - 1];
    const finalStep = (pitchClasses[0] - lastPc + 12) % 12;
    currentSemitone += (finalStep === 0 ? 12 : finalStep);
    cumulativeSemitones.push(currentSemitone);
  }

  const ascendingMidis = cumulativeSemitones.map(s => baseMidi + s);
  const descendingMidis = [...ascendingMidis].reverse().slice(1);

  return [...ascendingMidis, ...descendingMidis];
}

/**
 * Builds sequential target MIDI notes for arpeggios.
 */
export function generateArpeggioNotes(
  rootNote: string,
  quality: 'major' | 'minor' | 'diminished7' | 'dominant7',
  octaves: number = 2,
  startMidi?: number
): number[] {
  const baseMidi = startMidi ?? (ROOT_MIDI_MAP[rootNote] || 60);

  let intervals: number[] = [];
  if (quality === 'major') intervals = TRIAD_INTERVALS['major'];
  else if (quality === 'minor') intervals = TRIAD_INTERVALS['minor'];
  else if (quality === 'diminished7') intervals = SEVENTH_INTERVALS['fully-diminished'];
  else if (quality === 'dominant7') intervals = SEVENTH_INTERVALS['major-minor'];

  const cumulative: number[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const inv of intervals) {
      cumulative.push(oct * 12 + inv);
    }
  }
  cumulative.push(octaves * 12); // Top octave tonic

  const ascending = cumulative.map(s => baseMidi + s);
  const descending = [...ascending].reverse().slice(1);
  return [...ascending, ...descending];
}

/**
 * Helper to generate I-IV-I-V7-I Cadence target chord sequences.
 */
export function generateCadenceChords(rootNote: string, startMidi?: number): number[][] {
  const baseMidi = startMidi ?? (ROOT_MIDI_MAP[rootNote] || 60);
  // I chord (Root position)
  const I = [0, 4, 7].map(i => baseMidi + i);
  // IV chord (2nd inversion: 5, 0, 4 rel to key -> [c-5, c, c+4])
  const IV = [0, 5, 9].map(i => baseMidi + i);
  // V7 chord (1st inversion / root with 7th: e.g. B-D-F-G or G-B-D-F)
  const V7 = [-1, 2, 5, 7].map(i => baseMidi + i);
  return [I, IV, I, V7, I];
}

/**
 * Built-in Curriculum Catalog
 */
export const CURRICULUM_EXERCISES: PianoExercise[] = [
  // --- CLASS PIANO III: SCALES ---
  {
    id: 'p3_scale_c_maj',
    level: 'Class Piano III',
    category: 'scales',
    title: 'C Major Scale (2 Octaves)',
    keySignature: 'C Major',
    difficulty: 1,
    prerequisites: [],
    targetTempoBpm: 80,
    octaves: 2,
    hands: 'HT',
    standardFingering: SCALE_FINGERINGS['C Major'],
    instructions: 'Play 2 octaves ascending and descending with steady tempo at 80 bpm.',
    explanation: 'The C Major scale has no sharps or flats. Focus on smooth thumb passage (1 under 3, 1 under 4).',
    targetNotes: generateScaleNotes('C', 'Major', 2, 60),
  },
  {
    id: 'p3_scale_g_maj',
    level: 'Class Piano III',
    category: 'scales',
    title: 'G Major Scale (2 Octaves)',
    keySignature: 'G Major',
    difficulty: 1,
    prerequisites: ['p3_scale_c_maj'],
    targetTempoBpm: 80,
    octaves: 2,
    hands: 'HT',
    standardFingering: SCALE_FINGERINGS['G Major'],
    instructions: 'Play G Major 2 octaves ascending and descending. Key signature: F#.',
    explanation: 'G Major introduces 1 sharp (F#). Maintain weight transfer through thumb turns.',
    targetNotes: generateScaleNotes('G', 'Major', 2, 67),
  },
  {
    id: 'p3_scale_d_maj',
    level: 'Class Piano III',
    category: 'scales',
    title: 'D Major Scale (2 Octaves)',
    keySignature: 'D Major',
    difficulty: 2,
    prerequisites: ['p3_scale_g_maj'],
    targetTempoBpm: 85,
    octaves: 2,
    hands: 'HT',
    standardFingering: SCALE_FINGERINGS['D Major'],
    instructions: 'Play D Major 2 octaves. Key signature: F#, C#.',
    explanation: 'D Major contains 2 sharps. Ensure finger 3 lands cleanly on F# and C# in both hands.',
    targetNotes: generateScaleNotes('D', 'Major', 2, 62),
  },
  {
    id: 'p3_scale_a_min_harm',
    level: 'Class Piano III',
    category: 'scales',
    title: 'A Harmonic Minor Scale (2 Octaves)',
    keySignature: 'A Minor',
    difficulty: 2,
    prerequisites: ['p3_scale_c_maj'],
    targetTempoBpm: 80,
    octaves: 2,
    hands: 'HT',
    standardFingering: SCALE_FINGERINGS['Default Minor'],
    instructions: 'Play A Harmonic Minor scale with raised 7th degree (G#).',
    explanation: 'Harmonic minor features an augmented 2nd interval between F and G#. Keep wrist flexible.',
    targetNotes: generateScaleNotes('A', 'Harmonic Minor', 2, 57),
  },
  {
    id: 'p3_scale_e_min_mel',
    level: 'Class Piano III',
    category: 'scales',
    title: 'E Melodic Minor Scale (2 Octaves)',
    keySignature: 'E Minor',
    difficulty: 2,
    prerequisites: ['p3_scale_g_maj'],
    targetTempoBpm: 85,
    octaves: 2,
    hands: 'HT',
    standardFingering: SCALE_FINGERINGS['Default Minor'],
    instructions: 'Play E Melodic Minor: raised 6th (C#) and 7th (D#) ascending & descending.',
    explanation: 'Melodic minor raises steps 6 and 7 ascending to create smooth leading movement to tonic.',
    targetNotes: generateScaleNotes('E', 'Melodic Minor', 2, 64),
  },

  // --- CLASS PIANO III: ARPEGGIOS & CHORDS ---
  {
    id: 'p3_arp_c_maj',
    level: 'Class Piano III',
    category: 'arpeggios',
    title: 'C Major Tonic Arpeggio (2 Octaves)',
    keySignature: 'C Major',
    difficulty: 2,
    prerequisites: ['p3_scale_c_maj'],
    targetTempoBpm: 80,
    octaves: 2,
    hands: 'HT',
    standardFingering: 'RH: 1-2-3-1-2-3-5 | LH: 5-4-2-1-4-2-1',
    instructions: 'Play C Major triad arpeggio (C-E-G) across 2 octaves.',
    explanation: 'Keep hand open and avoid stretching fingertips unnecessarily; glide hand laterally.',
    targetNotes: generateArpeggioNotes('C', 'major', 2, 60),
  },
  {
    id: 'p3_cadence_c',
    level: 'Class Piano III',
    category: 'chords_cadences',
    title: 'C Major Primary Cadence (I - IV - I - V7 - I)',
    keySignature: 'C Major',
    difficulty: 2,
    prerequisites: ['p3_scale_c_maj'],
    targetTempoBpm: 60,
    hands: 'HT',
    instructions: 'Play the primary chord progression I - IV - I - V7 - I in voice-led inversions.',
    explanation: 'Smooth voice leading keeps common tones in the same voice and moves other notes by step.',
    targetNotes: [60, 64, 67,  60, 65, 69,  60, 64, 67,  59, 65, 67,  60, 64, 67],
    targetChords: generateCadenceChords('C', 60),
  },

  // --- CLASS PIANO IV: ADVANCED SCALES (ALL KEYS) ---
  {
    id: 'p4_scale_eb_maj',
    level: 'Class Piano IV',
    category: 'scales',
    title: 'Eb Major Scale (2 Octaves @ 100bpm)',
    keySignature: 'Eb Major',
    difficulty: 3,
    prerequisites: ['p3_scale_c_maj'],
    targetTempoBpm: 100,
    octaves: 2,
    hands: 'HT',
    standardFingering: SCALE_FINGERINGS['Eb Major'],
    instructions: 'Play Eb Major 2 octaves hands together at 100 bpm continuous tempo.',
    explanation: 'Eb Major has 3 flats (Bb, Eb, Ab). RH begins on finger 3 on Eb.',
    targetNotes: generateScaleNotes('Eb', 'Major', 2, 63),
  },
  {
    id: 'p4_scale_fs_min_harm',
    level: 'Class Piano IV',
    category: 'scales',
    title: 'F# Harmonic Minor Scale (2 Octaves @ 100bpm)',
    keySignature: 'F# Minor',
    difficulty: 4,
    prerequisites: ['p4_scale_eb_maj'],
    targetTempoBpm: 100,
    octaves: 2,
    hands: 'HT',
    standardFingering: 'RH: 2-3-1-2-3-4-1-2 | LH: 4-3-2-1-3-2-1-4',
    instructions: 'Play F# Harmonic Minor (E# leading tone) at 100 bpm.',
    explanation: 'Key signature of 3 sharps (F#, C#, G#) plus raised 7th (E#). Note E# is enharmonic to F.',
    targetNotes: generateScaleNotes('F#', 'Harmonic Minor', 2, 66),
  },
  {
    id: 'p4_scale_ab_maj',
    level: 'Class Piano IV',
    category: 'scales',
    title: 'Ab Major Scale (2 Octaves @ 100bpm)',
    keySignature: 'Ab Major',
    difficulty: 3,
    prerequisites: ['p4_scale_eb_maj'],
    targetTempoBpm: 100,
    octaves: 2,
    hands: 'HT',
    standardFingering: SCALE_FINGERINGS['Ab Major'],
    instructions: 'Play Ab Major 2 octaves hands together at 100 bpm.',
    explanation: 'Ab Major has 4 flats (Bb, Eb, Ab, Db). RH starts on finger 3.',
    targetNotes: generateScaleNotes('Ab', 'Major', 2, 68),
  },
  {
    id: 'p4_scale_cs_min_mel',
    level: 'Class Piano IV',
    category: 'scales',
    title: 'C# Melodic Minor Scale (2 Octaves @ 100bpm)',
    keySignature: 'C# Minor',
    difficulty: 4,
    prerequisites: ['p4_scale_fs_min_harm'],
    targetTempoBpm: 100,
    octaves: 2,
    hands: 'HT',
    standardFingering: 'RH: 2-3-1-2-3-4-1-2 | LH: 3-2-1-4-3-2-1-3',
    instructions: 'Play C# Melodic Minor with raised 6th (A#) and 7th (B#) at 100 bpm.',
    explanation: 'C# minor has 4 sharps in key sig. Ascending form adds A# and B# (played as C natural).',
    targetNotes: generateScaleNotes('C#', 'Melodic Minor', 2, 61),
  },

  // --- CLASS PIANO IV: ADVANCED ARPEGGIOS & DIMINISHED 7THS ---
  {
    id: 'p4_arp_d_dim7',
    level: 'Class Piano IV',
    category: 'arpeggios',
    title: 'D Diminished 7th Arpeggio & Resolution',
    keySignature: 'D Diminished 7th',
    difficulty: 4,
    prerequisites: ['p3_arp_c_maj'],
    targetTempoBpm: 90,
    octaves: 2,
    hands: 'HT',
    standardFingering: 'RH: 1-2-3-4-1-2-3-4 | LH: 4-3-2-1-4-3-2-1',
    instructions: 'Play D diminished 7th arpeggio (D - F - Ab - B) and resolve to Eb Major triad.',
    explanation: 'Fully diminished 7th chords are symmetrical collections of minor 3rds. D°7 acts as vii°7 resolving to Eb.',
    targetNotes: generateArpeggioNotes('D', 'diminished7', 2, 62),
  },

  // --- HARMONIZATION & TRANSPOSITION ---
  {
    id: 'p4_harm_trans_g_to_a',
    level: 'Class Piano IV',
    category: 'harmonization_transposition',
    title: 'Melody Harmonization & Transposition (G Major → A Major)',
    keySignature: 'G Major / A Major',
    difficulty: 3,
    prerequisites: ['p3_cadence_c'],
    targetTempoBpm: 72,
    instructions: 'Harmonize the given melody using I - IV - V7 in G Major, then transpose up a whole step to A Major.',
    explanation: 'Transposition requires shifting scale degree relationships: I (G->A), IV (C->D), V7 (D7->E7).',
    targetNotes: [67, 69, 71, 72, 71, 69, 67], // G Major melody
    transpositionKeys: ['G Major', 'A Major', 'F Major', 'D Major'],
    scoreNotation: 'Melody: G4 A4 B4 C5 | B4 A4 G4 || Acc: [G-B-D] [C-E-G] [D-F#-A-C] [G-B-D]',
  },

  // --- SIGHT-READING & RHYTHM ---
  {
    id: 'p4_sight_reading_lvl3',
    level: 'Class Piano IV',
    category: 'sight_reading_rhythm',
    title: 'Level III Sight-Reading Exam Simulator',
    keySignature: 'F Major',
    difficulty: 3,
    prerequisites: [],
    targetTempoBpm: 76,
    instructions: '20-second preview observation period, then play through cleanly without restarting or hesitating.',
    explanation: 'Under exam rules, continuous beat preservation is mandatory even if a wrong note is pressed.',
    targetNotes: [65, 67, 69, 65, 67, 69, 70, 69, 67, 65],
    rhythmBeats: [1, 1, 1, 1, 1, 1, 1.5, 0.5, 1, 2],
    scoreNotation: 'F4 G4 A4 F4 | G4 A4 Bb4. A8 | G4 F4--',
  },

  // --- REPERTOIRE PROJECT ---
  {
    id: 'p4_project_happy_birthday',
    level: 'Class Piano IV',
    category: 'repertoire_project',
    title: 'Happy Birthday Harmonization Project',
    keySignature: 'F Major (Transposable to G, C, Bb)',
    difficulty: 4,
    prerequisites: ['p4_harm_trans_g_to_a'],
    targetTempoBpm: 90,
    instructions: 'Master mandatory Roman numeral harmonization: I - V7 - V7 - I - I - IV - I/V - V7 - I across F, G, C, and Bb Major.',
    explanation: 'Requires RH lead melody with LH waltz or block accompaniment, including tonic cadential 6/4 (I/V) preparation before V7.',
    targetNotes: [60, 60, 62, 60, 65, 64,  60, 60, 62, 60, 67, 65],
    transpositionKeys: ['F Major', 'G Major', 'C Major', 'Bb Major'],
    scoreNotation: 'RH: C4 C4 D4 C4 F4 E4 | C4 C4 D4 C4 G4 F4 | ... | LH: I - V7 - V7 - I',
  },
];

export function getAllPianoExercises(): PianoExercise[] {
  return CURRICULUM_EXERCISES;
}

export function getPianoExercisesByLevel(level: PianoLevel): PianoExercise[] {
  return CURRICULUM_EXERCISES.filter(ex => ex.level === level);
}

export function getPianoExercisesByCategory(category: PianoCategory): PianoExercise[] {
  return CURRICULUM_EXERCISES.filter(ex => ex.category === category);
}

export function getPianoExerciseById(id: string): PianoExercise | undefined {
  return CURRICULUM_EXERCISES.find(ex => ex.id === id);
}

export function createDynamicScaleExercise(
  rootNote: string,
  scaleType: 'Major' | 'Natural Minor' | 'Harmonic Minor' | 'Melodic Minor',
  level: PianoLevel = 'Class Piano IV',
  octaves: number = 2,
  tempoBpm: number = 100
): PianoExercise {
  const keySig = `${rootNote} ${scaleType}`;
  const id = `dynamic_scale_${rootNote.toLowerCase().replace('#', 's')}_${scaleType.toLowerCase().replace(' ', '_')}`;
  const targetNotes = generateScaleNotes(rootNote, scaleType, octaves);

  return {
    id,
    level,
    category: 'scales',
    title: `${keySig} Scale (${octaves} Octaves)`,
    keySignature: keySig,
    difficulty: octaves >= 2 ? 3 : 1,
    prerequisites: [],
    targetTempoBpm: tempoBpm,
    octaves,
    hands: 'HT',
    standardFingering: SCALE_FINGERINGS[keySig] || SCALE_FINGERINGS['Default Minor'],
    instructions: `Play ${keySig} ${octaves} octaves ascending and descending at ${tempoBpm} bpm.`,
    explanation: `${scaleType} scale rooted on ${rootNote}. Maintain hand alignment and crisp rhythmic pulse.`,
    targetNotes,
  };
}
