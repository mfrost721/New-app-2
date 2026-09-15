/**
 * Data-Driven Graded Drill Engine
 * Deterministic PRNG seeded drill generator and answer validator.
 * Covers:
 * - Tonal prerequisites (key signatures, intervals, triads, 7th chords, inversions, cadences, Roman numerals)
 * - Formal analysis (sonata, rondo, theme & variations)
 * - Modes & symmetrical scales (church modes, pentatonic, whole-tone, octatonic)
 * - Set theory (normal order, prime form, interval-class vectors, set equivalence, Z-related sets)
 * - Twelve-tone serialism (P/I/R/RI, matrix identification)
 * - Rhythm & meter (asymmetric/additive, tuplets, displaced meters)
 * - 20th-century / post-tonal concepts (polychords, quartal harmony, tone clusters)
 */

import { noteToPitchClass, pitchClassToNote, getPrimeForm, getIntervalVector, formatIntervalVector, normalizeAccidentals, Z_RELATED_PAIRS } from './pitchClass';
import { buildScale, ModeName, SCALE_DEFINITIONS } from './scalesAndModes';
import { spellChord, KEY_SIGNATURES, CADENCE_DEFINITIONS, generateSecondaryDominant, TriadQuality, SeventhQuality } from './chordsAndHarmony';
import { getRowTransformation } from './twelveTone';
import { COMMON_METERS, COMMON_TUPLETS } from './rhythm';
import { FORMAL_ANALYSIS_DATABASE } from './formalAnalysis';

export type DrillCategory =
  | 'tonal'
  | 'form'
  | 'modes'
  | 'setTheory'
  | 'twelveTone'
  | 'rhythm'
  | 'postTonal';

export type DrillDifficulty = 1 | 2 | 3 | 4;

export type QuestionInputType = 'multiple_choice' | 'spelling_text' | 'pitch_class_array' | 'vector_text';

export interface DrillQuestion {
  id: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  skillId: string;
  topic: string;
  prompt: string;
  inputType: QuestionInputType;
  options?: string[]; // For multiple choice
  correctAnswer: string; // Cannonical answer string
  spellingSensitive: boolean; // True if exact flat/sharp spelling is required (e.g., key signature)
  acceptableAnswers?: string[]; // Alternative valid answers (e.g., enharmonic or alternate formatting)
  explanation: string;
  hint?: string;
  poolSize?: number;
  isReview?: boolean;

  // Backward-compatible metadata
  templateId?: string;
  variantKey?: string;
  subtopic?: string;
  answerType?: string;
  learningObjective?: string;
  sourceReferences?: string[];
}

export interface SubtopicMapping {
  subtopic: string;
  skillId: string;
  category: DrillCategory;
  description: string;
}

export const SUBTOPIC_REGISTRY: Record<string, SubtopicMapping> = {
  'Key Signatures': {
    subtopic: 'Key Signatures',
    skillId: 't4',
    category: 'tonal',
    description: 'Identification of key signature accidentals',
  },
  'Chord Spelling': {
    subtopic: 'Chord Spelling',
    skillId: 'a2',
    category: 'tonal',
    description: 'Spelling root position triads and 7th chords',
  },
  'Secondary Dominants': {
    subtopic: 'Secondary Dominants',
    skillId: 'a4',
    category: 'tonal',
    description: 'Secondary dominant Roman numeral identification',
  },
  'Cadence Identification': {
    subtopic: 'Cadence Identification',
    skillId: 'a3',
    category: 'tonal',
    description: 'Cadence types and harmonic resolutions',
  },
  'Formal Analysis': {
    subtopic: 'Formal Analysis',
    skillId: 't5',
    category: 'form',
    description: 'Binary, ternary, rondo, and sonata form structures',
  },
  'Modes & Symmetrical Scales': {
    subtopic: 'Modes & Symmetrical Scales',
    skillId: 't4',
    category: 'modes',
    description: 'Church modes, pentatonic, whole-tone, and octatonic scales',
  },
  'Prime Form Calculation': {
    subtopic: 'Prime Form Calculation',
    skillId: 't1',
    category: 'setTheory',
    description: 'Forte prime form computation',
  },
  'Interval-Class Vector': {
    subtopic: 'Interval-Class Vector',
    skillId: 't2',
    category: 'setTheory',
    description: 'Interval-class vector <ic1..ic6> calculation',
  },
  'Z-Related Sets': {
    subtopic: 'Z-Related Sets',
    skillId: 't1',
    category: 'setTheory',
    description: 'Z-relation properties and non-isomorphic set identification',
  },
  '12-Tone Serial Transformations': {
    subtopic: '12-Tone Serial Transformations',
    skillId: 't3',
    category: 'twelveTone',
    description: 'P, I, R, and RI row transformations',
  },
  'Meter Classification': {
    subtopic: 'Meter Classification',
    skillId: 't6',
    category: 'rhythm',
    description: 'Classification of time signatures and metric groupings',
  },
  'Tuplet Ratios': {
    subtopic: 'Tuplet Ratios',
    skillId: 't6',
    category: 'rhythm',
    description: 'Irregular tuplet division ratios',
  },
  '20th-Century Post-Tonal Concepts': {
    subtopic: '20th-Century Post-Tonal Concepts',
    skillId: 't5',
    category: 'postTonal',
    description: 'Polychords, quartal harmony, tone clusters, and post-tonal concepts',
  },
};

export function getSkillIdForSubtopic(subtopic: string): string | undefined {
  return SUBTOPIC_REGISTRY[subtopic]?.skillId;
}

export interface AnswerValidationResult {
  isCorrect: boolean;
  spellingCorrect?: boolean;
  enharmonicCorrect?: boolean;
  userAnswer: string;
  expectedAnswer: string;
  explanation: string;
}

/**
 * Seeded PRNG (Mulberry32) for deterministic question generation.
 */
export function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TONIC_NOTES = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

/**
 * Generates a graded drill question deterministically using a seed.
 */
export function generateDrillQuestion(category: DrillCategory, difficulty: DrillDifficulty = 1, seed: number = Date.now()): DrillQuestion {
  const rng = createSeededRandom(seed);
  const sample = <T>(arr: T[] | readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  switch (category) {
    case 'tonal': {
      if (difficulty === 1) {
        // Key signature accidentals
        const keys = Object.keys(KEY_SIGNATURES);
        const selectedKey = sample(keys);
        const info = KEY_SIGNATURES[selectedKey];
        const countText = `${info.accidentalsCount} ${info.accidentalType === 'none' ? 'accidentals' : info.accidentalType}`;
        const subtopic = 'Key Signatures';
        return {
          id: `tonal_ks_${seed}`,
          category: 'tonal',
          difficulty: 1,
          skillId: getSkillIdForSubtopic(subtopic) ?? 't4',
          topic: subtopic,
          prompt: `How many sharps or flats are in the key signature of ${info.key}?`,
          inputType: 'spelling_text',
          correctAnswer: countText,
          acceptableAnswers: [
            `${info.accidentalsCount} ${info.accidentalType}`,
            `${info.accidentalsCount}`,
            info.accidentalNotes.join(', '),
            info.accidentalNotes.join(' '),
          ],
          spellingSensitive: true,
          explanation: `${info.key} has ${info.accidentalsCount} ${info.accidentalType}${info.accidentalNotes.length > 0 ? ` (${info.accidentalNotes.join(', ')})` : ''}.`,
          templateId: 'tonal_ks',
          variantKey: `key:${info.key}`,
          subtopic,
          answerType: 'spelling_text',
          learningObjective: 'Identify key signature accidentals for major and minor keys.',
          sourceReferences: ['Kostka & Payne Tonal Harmony Ch. 1'],
        };
      } else if (difficulty === 2) {
        // Triad / 7th chord spelling
        const root = sample(TONIC_NOTES);
        const qualities: (TriadQuality | SeventhQuality)[] = ['major', 'minor', 'diminished', 'major-minor', 'minor-minor'];
        const qual = sample(qualities);
        const spelling = spellChord(root, qual, 0);
        const notesStr = spelling.pitchClasses.map(pc => pitchClassToNote(pc)).join(' ');
        const subtopic = 'Chord Spelling';

        return {
          id: `tonal_chord_${seed}`,
          category: 'tonal',
          difficulty: 2,
          skillId: getSkillIdForSubtopic(subtopic) ?? 'a2',
          topic: subtopic,
          prompt: `Spell the root-position ${qual} chord built on root ${root} (space-separated notes):`,
          inputType: 'spelling_text',
          correctAnswer: notesStr,
          acceptableAnswers: [
            notesStr,
            spelling.pitchClasses.join(' '),
            spelling.pitchClasses.join(','),
          ],
          spellingSensitive: false,
          explanation: `The ${qual} chord on ${root} contains pitch classes [${spelling.pitchClasses.join(', ')}] standard note spelling (${notesStr}).`,
          templateId: 'tonal_chord',
          variantKey: `root:${root}|qual:${qual}`,
          subtopic,
          answerType: 'spelling_text',
          learningObjective: 'Spell root-position triads and seventh chords.',
          sourceReferences: ['Kostka & Payne Tonal Harmony Ch. 3'],
        };
      } else if (difficulty === 3) {
        // Secondary dominant
        const targetDegrees: ('ii' | 'iii' | 'IV' | 'V' | 'vi')[] = ['ii', 'iii', 'IV', 'V', 'vi'];
        const target = sample(targetDegrees);
        const key = sample(['C', 'G', 'D', 'F', 'Bb']);
        const secDom = generateSecondaryDominant(key, target);
        const subtopic = 'Secondary Dominants';
        return {
          id: `tonal_sec_${seed}`,
          category: 'tonal',
          difficulty: 3,
          skillId: getSkillIdForSubtopic(subtopic) ?? 'a4',
          topic: subtopic,
          prompt: `In the key of ${key} major, what is the Roman numeral for the dominant 7th of ${target}?`,
          inputType: 'spelling_text',
          correctAnswer: `V7/${target}`,
          acceptableAnswers: [`V7/${target}`, `V7 / ${target}`],
          spellingSensitive: true,
          explanation: `The secondary dominant of ${target} in ${key} major is written ${secDom.romanNumeral}.`,
          templateId: 'tonal_sec_dom',
          variantKey: `key:${key}|target:${target}`,
          subtopic,
          answerType: 'spelling_text',
          learningObjective: 'Identify and write secondary dominant Roman numerals.',
          sourceReferences: ['Kostka & Payne Tonal Harmony Ch. 16'],
        };
      } else {
        // Cadences
        const cadenceKeys = Object.keys(CADENCE_DEFINITIONS) as (keyof typeof CADENCE_DEFINITIONS)[];
        const selectedType = sample(cadenceKeys);
        const def = CADENCE_DEFINITIONS[selectedType];
        const subtopic = 'Cadence Identification';
        return {
          id: `tonal_cad_${seed}`,
          category: 'tonal',
          difficulty: 4,
          skillId: getSkillIdForSubtopic(subtopic) ?? 'a3',
          topic: subtopic,
          prompt: `Which cadence type is characterized by ${def.description.toLowerCase()}?`,
          inputType: 'multiple_choice',
          options: cadenceKeys,
          correctAnswer: selectedType,
          spellingSensitive: false,
          explanation: `${selectedType}: ${def.description}`,
          templateId: 'tonal_cadence',
          variantKey: `cadence:${selectedType}`,
          subtopic,
          answerType: 'multiple_choice',
          learningObjective: 'Classify standard cadential resolutions in tonal harmony.',
          sourceReferences: ['Kostka & Payne Tonal Harmony Ch. 10'],
        };
      }
    }

    case 'form': {
      const dbItem = FORMAL_ANALYSIS_DATABASE[Math.floor(rng() * FORMAL_ANALYSIS_DATABASE.length)];
      const subtopic = 'Formal Analysis';
      return {
        id: `form_${seed}`,
        category: 'form',
        difficulty,
        skillId: getSkillIdForSubtopic(subtopic) ?? 't5',
        topic: subtopic,
        prompt: dbItem.prompt,
        inputType: 'multiple_choice',
        options: dbItem.options,
        correctAnswer: dbItem.correctAnswer,
        spellingSensitive: false,
        explanation: dbItem.explanation,
        templateId: 'form_analysis',
        variantKey: `prompt:${dbItem.prompt}`,
        subtopic,
        answerType: 'multiple_choice',
        learningObjective: 'Analyze formal structural components, sonata sections, and rondo forms.',
        sourceReferences: ['Caplin Classical Form Ch. 1-4'],
      };
    }

    case 'modes': {
      const modeNames: ModeName[] = ['Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian', 'Whole Tone', 'Octatonic (W-H)', 'Octatonic (H-W)'];
      const chosenMode = sample(modeNames);
      const tonic = sample(['C', 'D', 'E', 'F', 'G', 'A', 'Bb']);
      const scale = buildScale(tonic, chosenMode);
      const def = SCALE_DEFINITIONS[chosenMode];
      const subtopic = 'Modes & Symmetrical Scales';

      return {
        id: `mode_${seed}`,
        category: 'modes',
        difficulty,
        skillId: getSkillIdForSubtopic(subtopic) ?? 't4',
        topic: subtopic,
        prompt: `Identify the scale/mode formula for ${chosenMode}:`,
        inputType: 'multiple_choice',
        options: [
          def.formula,
          '1 2 3 4 5 6 7',
          '1 ♭2 ♭3 4 5 ♭6 ♭7',
          '1 2 ♭3 4 5 6 ♭7',
        ],
        correctAnswer: def.formula,
        spellingSensitive: false,
        explanation: `${chosenMode} has the formula ${def.formula}. Pitch classes starting on ${tonic}: [${scale.pitchClasses.join(', ')}].`,
        templateId: 'mode_scale_id',
        variantKey: `mode:${chosenMode}|tonic:${tonic}`,
        subtopic,
        answerType: 'multiple_choice',
        learningObjective: 'Identify scale formulas for diatonic modes and symmetrical scales.',
        sourceReferences: ['Kostka & Payne Tonal Harmony Ch. 28'],
      };
    }

    case 'setTheory': {
      if (difficulty <= 2) {
        // Normal Order / Prime Form
        const rawPcs = Array.from({ length: 3 + Math.floor(rng() * 2) }, () => Math.floor(rng() * 12));
        const prime = getPrimeForm(rawPcs);
        const primeStr = `[${prime.join(', ')}]`;
        const subtopic = 'Prime Form Calculation';

        return {
          id: `set_prime_${seed}`,
          category: 'setTheory',
          difficulty,
          skillId: getSkillIdForSubtopic(subtopic) ?? 't1',
          topic: subtopic,
          prompt: `Calculate the Prime Form for the pitch-class set [${rawPcs.join(', ')}]:`,
          inputType: 'pitch_class_array',
          correctAnswer: primeStr,
          acceptableAnswers: [primeStr, `[${prime.join(',')}]`, prime.join(' '), prime.join(',')],
          spellingSensitive: false,
          explanation: `The prime form (Forte/Rahn standard) starting at 0 with smallest left-packed intervals is ${primeStr}.`,
          templateId: 'set_prime_form',
          variantKey: `prime:${prime.join(',')}`,
          subtopic,
          answerType: 'pitch_class_array',
          learningObjective: 'Calculate Forte/Rahn prime forms for pitch-class sets.',
          sourceReferences: ['Straus Introduction to Post-Tonal Theory Ch. 2'],
        };
      } else if (difficulty === 3) {
        // Interval class vector
        const rawPcs = Array.from({ length: 3 + Math.floor(rng() * 2) }, () => Math.floor(rng() * 12));
        const vec = getIntervalVector(rawPcs);
        const vecStr = formatIntervalVector(vec);
        const subtopic = 'Interval-Class Vector';
        return {
          id: `set_icv_${seed}`,
          category: 'setTheory',
          difficulty: 3,
          skillId: getSkillIdForSubtopic(subtopic) ?? 't2',
          topic: subtopic,
          prompt: `Calculate the Interval-Class Vector <ic1 ic2 ic3 ic4 ic5 ic6> for set [${rawPcs.join(', ')}]:`,
          inputType: 'vector_text',
          correctAnswer: vecStr,
          acceptableAnswers: [vecStr, `<${vec.join('')}>`, vec.join(' '), vec.join(',')],
          spellingSensitive: false,
          explanation: `The interval-class vector counts interval classes 1 through 6: ${vecStr}.`,
          templateId: 'set_interval_vector',
          variantKey: `icv:${vecStr}`,
          subtopic,
          answerType: 'vector_text',
          learningObjective: 'Derive interval-class vectors <ic1..ic6> for pitch-class sets.',
          sourceReferences: ['Straus Introduction to Post-Tonal Theory Ch. 2'],
        };
      } else {
        // Z-related sets
        const pair = sample(Z_RELATED_PAIRS);
        const subtopic = 'Z-Related Sets';
        return {
          id: `set_z_${seed}`,
          category: 'setTheory',
          difficulty: 4,
          skillId: getSkillIdForSubtopic(subtopic) ?? 't1',
          topic: subtopic,
          prompt: `Pitch class sets ${pair.pair[0]} (${pair.primeA.join(',')}) and ${pair.pair[1]} (${pair.primeB.join(',')}) share interval vector ${pair.icv}. What term describes pairs that share an interval vector but are not equivalent under Tn/TnI?`,
          inputType: 'multiple_choice',
          options: ['Z-related sets', 'Inversional equivalences', 'Homometric rows', 'Hexachordal complements'],
          correctAnswer: 'Z-related sets',
          spellingSensitive: false,
          explanation: 'Z-related sets (named by Allen Forte) share the exact same interval-class vector without being Tn or TnI equivalent.',
          templateId: 'set_z_related',
          variantKey: `zpair:${pair.pair.join('/')}`,
          subtopic,
          answerType: 'multiple_choice',
          learningObjective: 'Identify properties of Z-related non-isomorphic pitch class sets.',
          sourceReferences: ['Straus Introduction to Post-Tonal Theory Ch. 3'],
        };
      }
    }

    case 'twelveTone': {
      const p0 = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6]; // Classic row
      const forms: ('P' | 'I' | 'R' | 'RI')[] = ['P', 'I', 'R', 'RI'];
      const form = sample(forms);
      const index = Math.floor(rng() * 12);
      const transformed = getRowTransformation(p0, form, index);
      const firstThree = transformed.slice(0, 3).join(', ');
      const subtopic = '12-Tone Serial Transformations';

      return {
        id: `tt_${seed}`,
        category: 'twelveTone',
        difficulty,
        skillId: getSkillIdForSubtopic(subtopic) ?? 't3',
        topic: subtopic,
        prompt: `Given P0 = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6], what are the first 3 pitch classes of ${form}${index}?`,
        inputType: 'pitch_class_array',
        correctAnswer: firstThree,
        acceptableAnswers: [firstThree, transformed.slice(0, 3).join(' '), transformed.slice(0, 3).join('')],
        spellingSensitive: false,
        explanation: `${form}${index} yields row starting with pitch classes [${firstThree}]. Full row: [${transformed.join(', ')}].`,
        templateId: 'twelve_tone_serial',
        variantKey: `form:${form}|index:${index}`,
        subtopic,
        answerType: 'pitch_class_array',
        learningObjective: 'Compute 12-tone serial row transformations (P, I, R, RI).',
        sourceReferences: ['Straus Introduction to Post-Tonal Theory Ch. 6'],
      };
    }

    case 'rhythm': {
      if (difficulty <= 2) {
        const meterNames = Object.keys(COMMON_METERS);
        const mKey = sample(meterNames);
        const mDef = COMMON_METERS[mKey];
        const subtopic = 'Meter Classification';
        return {
          id: `rhythm_meter_${seed}`,
          category: 'rhythm',
          difficulty,
          skillId: getSkillIdForSubtopic(subtopic) ?? 't6',
          topic: subtopic,
          prompt: `Classify the time signature ${mKey}:`,
          inputType: 'multiple_choice',
          options: ['simple', 'compound', 'asymmetric', 'mixed'],
          correctAnswer: mDef.type,
          spellingSensitive: false,
          explanation: `${mKey} is a ${mDef.description.toLowerCase()}.`,
          templateId: 'rhythm_meter_class',
          variantKey: `meter:${mKey}`,
          subtopic,
          answerType: 'multiple_choice',
          learningObjective: 'Classify simple, compound, asymmetric, and mixed meter time signatures.',
          sourceReferences: ['Read Music Notation Ch. 5'],
        };
      } else {
        const tupletNames = Object.keys(COMMON_TUPLETS);
        const tKey = sample(tupletNames);
        const tDef = COMMON_TUPLETS[tKey];
        const subtopic = 'Tuplet Ratios';
        return {
          id: `rhythm_tuplet_${seed}`,
          category: 'rhythm',
          difficulty,
          skillId: getSkillIdForSubtopic(subtopic) ?? 't6',
          topic: subtopic,
          prompt: `What is the note-ratio for a ${tKey}?`,
          inputType: 'spelling_text',
          correctAnswer: tDef.ratio,
          acceptableAnswers: [tDef.ratio, `${tDef.numNotes}:${tDef.inTimeOf}`, `${tDef.numNotes} in ${tDef.inTimeOf}`],
          spellingSensitive: true,
          explanation: `A ${tKey} plays ${tDef.numNotes} notes in the time of ${tDef.inTimeOf} (${tDef.ratio}).`,
          templateId: 'rhythm_tuplet_ratio',
          variantKey: `tuplet:${tKey}`,
          subtopic,
          answerType: 'spelling_text',
          learningObjective: 'Determine numerical ratio notations for tuplet divisions.',
          sourceReferences: ['Read Music Notation Ch. 6'],
        };
      }
    }

    case 'postTonal': {
      const questions = [
        {
          prompt: 'What term describes two or more distinct key centers or triads sounded simultaneously?',
          correct: 'Polychord / Polytonality',
          options: ['Polychord / Polytonality', 'Quartal harmony', 'Tone cluster', 'Hexachordal combinatoriality'],
          explanation: 'Polychords (e.g., Stravinsky Rite of Spring chord F#7 over Eb7) stack distinct harmonic structures simultaneously.',
        },
        {
          prompt: 'Which harmonic system builds chords in intervals of 4ths rather than 3rds?',
          correct: 'Quartal Harmony',
          options: ['Quartal Harmony', 'Tertian Harmony', 'Quintal Harmony', 'Secundal Harmony'],
          explanation: 'Quartal harmony utilizes 4th intervals (e.g. C-F-Bb) and was widely used by Hindemith, Schoenberg, and Scriabin.',
        },
        {
          prompt: 'What is a chord composed of adjacent musical notes (secundal harmony)?',
          correct: 'Tone Cluster',
          options: ['Tone Cluster', 'Polychord', 'Augmented Triad', 'Split-3rd Chord'],
          explanation: 'Tone clusters (pioneered by Henry Cowell and Charles Ives) consist of adjacent scale steps or chromatic pitches struck together.',
        },
      ];

      const q = sample(questions);
      const subtopic = '20th-Century Post-Tonal Concepts';

      return {
        id: `post_tonal_${seed}`,
        category: 'postTonal',
        difficulty,
        skillId: getSkillIdForSubtopic(subtopic) ?? 't5',
        topic: subtopic,
        prompt: q.prompt,
        inputType: 'multiple_choice',
        options: q.options,
        correctAnswer: q.correct,
        spellingSensitive: false,
        explanation: q.explanation,
        templateId: 'post_tonal_concepts',
        variantKey: `concept:${q.correct}`,
        subtopic,
        answerType: 'multiple_choice',
        learningObjective: 'Identify 20th-century harmonic concepts including polychords, quartal harmony, and tone clusters.',
        sourceReferences: ['Kostka Materials and Techniques of Twentieth-Century Music Ch. 4'],
      };
    }

    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

/**
 * Normalizes a string by trimming whitespace and converting Unicode accidentals.
 */
function cleanAnswerString(str: string): string {
  return normalizeAccidentals(str.trim());
}

/**
 * Parses a vector string into array of integers.
 * Must contain exactly 6 non-negative integer counts.
 */
function parseVector(str: string): number[] | null {
  const cleaned = cleanAnswerString(str);
  // Match bracketed or unbracketed vector tokens
  const body = cleaned.replace(/^[<\[\(\s]*/, '').replace(/[>\]\)\s]*$/, '');
  const tokens = body.split(/[\s,]+/).filter(Boolean);

  if (tokens.length !== 6) return null;

  const numbers: number[] = [];
  for (const t of tokens) {
    if (!/^\d+$/.test(t)) return null;
    const val = parseInt(t, 10);
    if (isNaN(val) || val < 0) return null;
    numbers.push(val);
  }

  return numbers;
}

/**
 * Validates a vector_text input question.
 * Requires exactly 6 non-negative integer counts and exact count matching without modulo 12 reduction.
 */
function validateVectorAnswer(question: DrillQuestion, userAnswer: string): AnswerValidationResult {
  const userVec = parseVector(userAnswer);
  if (!userVec) {
    return {
      isCorrect: false,
      spellingCorrect: false,
      enharmonicCorrect: false,
      userAnswer,
      expectedAnswer: question.correctAnswer,
      explanation: `Malformed interval vector. Expected 6 non-negative integer counts (e.g., "<1 0 1 1 0 0>"). ${question.explanation}`,
    };
  }

  const allAcceptable = [question.correctAnswer, ...(question.acceptableAnswers || [])];
  for (const acc of allAcceptable) {
    const accVec = parseVector(acc);
    if (accVec && userVec.length === accVec.length && userVec.every((val, idx) => val === accVec[idx])) {
      return {
        isCorrect: true,
        spellingCorrect: true,
        enharmonicCorrect: true,
        userAnswer,
        expectedAnswer: question.correctAnswer,
        explanation: `Correct! ${question.explanation}`,
      };
    }
  }

  return {
    isCorrect: false,
    spellingCorrect: false,
    enharmonicCorrect: false,
    userAnswer,
    expectedAnswer: question.correctAnswer,
    explanation: `Incorrect. Expected "${question.correctAnswer}". ${question.explanation}`,
  };
}

/**
 * Helper to parse tokens from a string for pitch-class / sequence / note validation.
 */
function parseTokens(str: string): string[] {
  const cleaned = cleanAnswerString(str);
  return cleaned
    .replace(/[\[\]<>\(\)]/g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
}

/**
 * Validates pitch_class_array questions.
 * Preserves sequence order for row answers / ordered answers.
 */
function validatePitchClassArrayAnswer(question: DrillQuestion, userAnswer: string): AnswerValidationResult {
  const userTokens = parseTokens(userAnswer);
  if (userTokens.length === 0) {
    return {
      isCorrect: false,
      spellingCorrect: false,
      enharmonicCorrect: false,
      userAnswer,
      expectedAnswer: question.correctAnswer,
      explanation: `Invalid input. Expected pitch classes or note names. ${question.explanation}`,
    };
  }

  // Attempt to parse user tokens into pitch class integers
  let userPcs: number[];
  try {
    userPcs = userTokens.map(t => noteToPitchClass(t));
  } catch {
    return {
      isCorrect: false,
      spellingCorrect: false,
      enharmonicCorrect: false,
      userAnswer,
      expectedAnswer: question.correctAnswer,
      explanation: `Invalid pitch class or note token. ${question.explanation}`,
    };
  }

  const allAcceptable = [question.correctAnswer, ...(question.acceptableAnswers || [])];

  for (const acc of allAcceptable) {
    const accTokens = parseTokens(acc);
    let accPcs: number[];
    try {
      accPcs = accTokens.map(t => noteToPitchClass(t));
    } catch {
      continue;
    }

    if (userPcs.length === accPcs.length && userPcs.every((pc, idx) => pc === accPcs[idx])) {
      const isExactSpelling = userTokens.join(' ').toLowerCase() === accTokens.join(' ').toLowerCase();
      return {
        isCorrect: true,
        spellingCorrect: isExactSpelling,
        enharmonicCorrect: true,
        userAnswer,
        expectedAnswer: question.correctAnswer,
        explanation: isExactSpelling
          ? `Correct! ${question.explanation}`
          : `Correct (enharmonically equivalent)! Note: Standard spelling is "${question.correctAnswer}". ${question.explanation}`,
      };
    }
  }

  return {
    isCorrect: false,
    spellingCorrect: false,
    enharmonicCorrect: false,
    userAnswer,
    expectedAnswer: question.correctAnswer,
    explanation: `Incorrect. Expected "${question.correctAnswer}". ${question.explanation}`,
  };
}

/**
 * Validates spelling_text questions.
 * Preserves Roman-numeral case, chord quality, inversion, and requested sevenths.
 */
function validateSpellingTextAnswer(question: DrillQuestion, userAnswer: string): AnswerValidationResult {
  const cleanedUser = cleanAnswerString(userAnswer);
  const normalizedUserWs = cleanedUser.replace(/\s+/g, ' ');

  const allAcceptable = [question.correctAnswer, ...(question.acceptableAnswers || [])];

  // Direct case-sensitive & whitespace-normalized comparison
  for (const acc of allAcceptable) {
    const cleanedAcc = cleanAnswerString(acc).replace(/\s+/g, ' ');
    if (normalizedUserWs === cleanedAcc) {
      return {
        isCorrect: true,
        spellingCorrect: true,
        enharmonicCorrect: true,
        userAnswer,
        expectedAnswer: question.correctAnswer,
        explanation: `Correct! ${question.explanation}`,
      };
    }
  }

  // Case-insensitive direct comparison ONLY if question is not spelling sensitive AND not Roman numeral / chord quality sensitive
  // Note: For spellingSensitive questions, case or exact spelling matters.
  if (!question.spellingSensitive) {
    const userLower = normalizedUserWs.toLowerCase();
    for (const acc of allAcceptable) {
      const accLower = cleanAnswerString(acc).replace(/\s+/g, ' ').toLowerCase();
      if (userLower === accLower) {
        return {
          isCorrect: true,
          spellingCorrect: true,
          enharmonicCorrect: true,
          userAnswer,
          expectedAnswer: question.correctAnswer,
          explanation: `Correct! ${question.explanation}`,
        };
      }
    }

    // Attempt pitch-class / enharmonic equivalence check for note sequence spelling questions
    const userTokens = parseTokens(userAnswer);
    try {
      const userPcs = userTokens.map(t => noteToPitchClass(t));
      for (const acc of allAcceptable) {
        const accTokens = parseTokens(acc);
        const accPcs = accTokens.map(t => noteToPitchClass(t));
        if (userPcs.length === accPcs.length && userPcs.length > 0 && userPcs.every((pc, idx) => pc === accPcs[idx])) {
          return {
            isCorrect: true,
            spellingCorrect: false,
            enharmonicCorrect: true,
            userAnswer,
            expectedAnswer: question.correctAnswer,
            explanation: `Correct (enharmonically equivalent)! Note: Standard spelling is "${question.correctAnswer}". ${question.explanation}`,
          };
        }
      }
    } catch {
      // Not note tokens
    }
  }

  return {
    isCorrect: false,
    spellingCorrect: false,
    enharmonicCorrect: false,
    userAnswer,
    expectedAnswer: question.correctAnswer,
    explanation: question.spellingSensitive
      ? `Incorrect spelling. Expected exact spelling "${question.correctAnswer}". ${question.explanation}`
      : `Incorrect. Expected "${question.correctAnswer}". ${question.explanation}`,
  };
}

/**
 * Validates multiple_choice questions.
 */
function validateMultipleChoiceAnswer(question: DrillQuestion, userAnswer: string): AnswerValidationResult {
  const cleanedUser = cleanAnswerString(userAnswer);

  const allAcceptable = [question.correctAnswer, ...(question.acceptableAnswers || [])];

  for (const acc of allAcceptable) {
    const cleanedAcc = cleanAnswerString(acc);
    if (cleanedUser === cleanedAcc || cleanedUser.toLowerCase() === cleanedAcc.toLowerCase()) {
      return {
        isCorrect: true,
        spellingCorrect: true,
        enharmonicCorrect: true,
        userAnswer,
        expectedAnswer: question.correctAnswer,
        explanation: `Correct! ${question.explanation}`,
      };
    }
  }

  return {
    isCorrect: false,
    spellingCorrect: false,
    enharmonicCorrect: false,
    userAnswer,
    expectedAnswer: question.correctAnswer,
    explanation: `Incorrect. Expected "${question.correctAnswer}". ${question.explanation}`,
  };
}

/**
 * Validates a user's answer against expected answer and acceptable alternatives.
 * Dispatches to input-type-specific validators.
 */
export function validateDrillAnswer(question: DrillQuestion, userAnswer: string): AnswerValidationResult {
  switch (question.inputType) {
    case 'vector_text':
      return validateVectorAnswer(question, userAnswer);
    case 'pitch_class_array':
      return validatePitchClassArrayAnswer(question, userAnswer);
    case 'spelling_text':
      return validateSpellingTextAnswer(question, userAnswer);
    case 'multiple_choice':
      return validateMultipleChoiceAnswer(question, userAnswer);
    default:
      return validateSpellingTextAnswer(question, userAnswer);
  }
}
