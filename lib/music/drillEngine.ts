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

import { noteToPitchClass, pitchClassToNote, getPrimeForm, getIntervalVector, formatIntervalVector, Z_RELATED_PAIRS } from './pitchClass';
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
  correctAnswer: string; // Canonical answer string
  spellingSensitive: boolean; // True if exact flat/sharp spelling is required (e.g., key signature)
  acceptableAnswers?: string[]; // Alternative valid answers (e.g., enharmonic or alternate formatting)
  explanation: string;
  hint?: string;
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
        const accidentalLabel = info.accidentalType === 'none' ? 'accidentals' : info.accidentalType;
        const countText = `${info.accidentalsCount} ${accidentalLabel}`;
        return {
          id: `tonal_ks_${seed}`,
          category: 'tonal',
          difficulty: 1,
          skillId: 't4',
          topic: 'Key Signatures',
          prompt: `How many sharps or flats are in the key signature of ${info.key}?`,
          inputType: 'spelling_text',
          correctAnswer: countText,
          acceptableAnswers: [
            `${info.accidentalsCount} ${accidentalLabel}`,
            `${info.accidentalsCount}`,
            ...(info.accidentalNotes.length > 0 ? [info.accidentalNotes.join(', '), info.accidentalNotes.join(' ')] : []),
          ],
          spellingSensitive: true,
          explanation: `${info.key} has ${countText}${info.accidentalNotes.length > 0 ? ` (${info.accidentalNotes.join(', ')})` : ''}.`,
        };
      } else if (difficulty === 2) {
        // Triad / 7th chord spelling
        const root = sample(TONIC_NOTES);
        const qualities: (TriadQuality | SeventhQuality)[] = ['major', 'minor', 'diminished', 'major-minor', 'minor-minor'];
        const qual = sample(qualities);
        const spelling = spellChord(root, qual, 0);
        const notesStr = spelling.pitchClasses.map(pc => pitchClassToNote(pc)).join(' ');

        return {
          id: `tonal_chord_${seed}`,
          category: 'tonal',
          difficulty: 2,
          skillId: 'a2',
          topic: 'Chord Spelling',
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
        };
      } else if (difficulty === 3) {
        // Secondary dominant
        const targetDegrees: ('ii' | 'iii' | 'IV' | 'V' | 'vi')[] = ['ii', 'iii', 'IV', 'V', 'vi'];
        const target = sample(targetDegrees);
        const key = sample(['C', 'G', 'D', 'F', 'Bb']);
        const secDom = generateSecondaryDominant(key, target);
        return {
          id: `tonal_sec_${seed}`,
          category: 'tonal',
          difficulty: 3,
          skillId: 'a4',
          topic: 'Secondary Dominants',
          prompt: `In the key of ${key} major, what is the Roman numeral for the dominant 7th of ${target}?`,
          inputType: 'spelling_text',
          correctAnswer: `V7/${target}`,
          acceptableAnswers: [`V7/${target}`, `V7 / ${target}`, `V/${target}`],
          spellingSensitive: true,
          explanation: `The secondary dominant of ${target} in ${key} major is written ${secDom.romanNumeral}.`,
        };
      } else {
        // Cadences
        const cadenceKeys = Object.keys(CADENCE_DEFINITIONS) as (keyof typeof CADENCE_DEFINITIONS)[];
        const selectedType = sample(cadenceKeys);
        const def = CADENCE_DEFINITIONS[selectedType];
        return {
          id: `tonal_cad_${seed}`,
          category: 'tonal',
          difficulty: 4,
          skillId: 'a3',
          topic: 'Cadence Identification',
          prompt: `Which cadence type is characterized by ${def.description.toLowerCase()}?`,
          inputType: 'multiple_choice',
          options: cadenceKeys,
          correctAnswer: selectedType,
          spellingSensitive: false,
          explanation: `${selectedType}: ${def.description}`,
        };
      }
    }

    case 'form': {
      const dbItem = FORMAL_ANALYSIS_DATABASE[Math.floor(rng() * FORMAL_ANALYSIS_DATABASE.length)];
      return {
        id: `form_${seed}`,
        category: 'form',
        difficulty,
        skillId: 't5',
        topic: 'Formal Analysis',
        prompt: dbItem.prompt,
        inputType: 'multiple_choice',
        options: dbItem.options,
        correctAnswer: dbItem.correctAnswer,
        spellingSensitive: false,
        explanation: dbItem.explanation,
      };
    }

    case 'modes': {
      const modeNames: ModeName[] = ['Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian', 'Whole Tone', 'Octatonic (W-H)', 'Octatonic (H-W)'];
      const chosenMode = sample(modeNames);
      const tonic = sample(['C', 'D', 'E', 'F', 'G', 'A', 'Bb']);
      const scale = buildScale(tonic, chosenMode);
      const def = SCALE_DEFINITIONS[chosenMode];

      return {
        id: `mode_${seed}`,
        category: 'modes',
        difficulty,
        skillId: 't4',
        topic: 'Modes & Symmetrical Scales',
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
      };
    }

    case 'setTheory': {
      if (difficulty <= 2) {
        // Normal Order / Prime Form
        const rawPcs = Array.from({ length: 3 + Math.floor(rng() * 2) }, () => Math.floor(rng() * 12));
        const prime = getPrimeForm(rawPcs);
        const primeStr = `[${prime.join(', ')}]`;

        return {
          id: `set_prime_${seed}`,
          category: 'setTheory',
          difficulty,
          skillId: 't1',
          topic: 'Prime Form Calculation',
          prompt: `Calculate the Prime Form for the pitch-class set [${rawPcs.join(', ')}]:`,
          inputType: 'pitch_class_array',
          correctAnswer: primeStr,
          acceptableAnswers: [primeStr, `[${prime.join(',')}]`, prime.join(' '), prime.join(',')],
          spellingSensitive: false,
          explanation: `The prime form (Forte/Rahn standard) starting at 0 with smallest left-packed intervals is ${primeStr}.`,
        };
      } else if (difficulty === 3) {
        // Interval class vector
        const rawPcs = Array.from({ length: 3 + Math.floor(rng() * 2) }, () => Math.floor(rng() * 12));
        const vec = getIntervalVector(rawPcs);
        const vecStr = formatIntervalVector(vec);
        return {
          id: `set_icv_${seed}`,
          category: 'setTheory',
          difficulty: 3,
          skillId: 't2',
          topic: 'Interval-Class Vector',
          prompt: `Calculate the Interval-Class Vector <ic1 ic2 ic3 ic4 ic5 ic6> for set [${rawPcs.join(', ')}]:`,
          inputType: 'vector_text',
          correctAnswer: vecStr,
          acceptableAnswers: [vecStr, `<${vec.join('')}>`, vec.join(' '), vec.join(',')],
          spellingSensitive: false,
          explanation: `The interval-class vector counts interval classes 1 through 6: ${vecStr}.`,
        };
      } else {
        // Z-related sets
        const pair = sample(Z_RELATED_PAIRS);
        return {
          id: `set_z_${seed}`,
          category: 'setTheory',
          difficulty: 4,
          skillId: 't1',
          topic: 'Z-Related Sets',
          prompt: `Pitch class sets ${pair.pair[0]} (${pair.primeA.join(',')}) and ${pair.pair[1]} (${pair.primeB.join(',')}) share interval vector ${pair.icv}. What term describes pairs that share an interval vector but are not equivalent under Tn/TnI?`,
          inputType: 'multiple_choice',
          options: ['Z-related sets', 'Inversional equivalences', 'Homometric rows', 'Hexachordal complements'],
          correctAnswer: 'Z-related sets',
          spellingSensitive: false,
          explanation: 'Z-related sets (named by Allen Forte) share the exact same interval-class vector without being Tn or TnI equivalent.',
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

      return {
        id: `tt_${seed}`,
        category: 'twelveTone',
        difficulty,
        skillId: 't3',
        topic: '12-Tone Serial Transformations',
        prompt: `Given P0 = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6], what are the first 3 pitch classes of ${form}${index}?`,
        inputType: 'pitch_class_array',
        correctAnswer: firstThree,
        acceptableAnswers: [firstThree, transformed.slice(0, 3).join(' '), transformed.slice(0, 3).join('')],
        spellingSensitive: false,
        explanation: `${form}${index} yields row starting with pitch classes [${firstThree}]. Full row: [${transformed.join(', ')}].`,
      };
    }

    case 'rhythm': {
      if (difficulty <= 2) {
        const meterNames = Object.keys(COMMON_METERS);
        const mKey = sample(meterNames);
        const mDef = COMMON_METERS[mKey];
        return {
          id: `rhythm_meter_${seed}`,
          category: 'rhythm',
          difficulty,
          skillId: 't6',
          topic: 'Meter Classification',
          prompt: `Classify the time signature ${mKey}:`,
          inputType: 'multiple_choice',
          options: ['simple', 'compound', 'asymmetric', 'mixed'],
          correctAnswer: mDef.type,
          spellingSensitive: false,
          explanation: `${mKey} is a ${mDef.description.toLowerCase()}.`,
        };
      } else {
        const tupletNames = Object.keys(COMMON_TUPLETS);
        const tKey = sample(tupletNames);
        const tDef = COMMON_TUPLETS[tKey];
        return {
          id: `rhythm_tuplet_${seed}`,
          category: 'rhythm',
          difficulty,
          skillId: 't6',
          topic: 'Tuplet Ratios',
          prompt: `What is the note-ratio for a ${tKey}?`,
          inputType: 'spelling_text',
          correctAnswer: tDef.ratio,
          acceptableAnswers: [tDef.ratio, `${tDef.numNotes}:${tDef.inTimeOf}`, `${tDef.numNotes} in ${tDef.inTimeOf}`],
          spellingSensitive: true,
          explanation: `A ${tKey} plays ${tDef.numNotes} notes in the time of ${tDef.inTimeOf} (${tDef.ratio}).`,
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

      return {
        id: `post_tonal_${seed}`,
        category: 'postTonal',
        difficulty,
        skillId: 't5',
        topic: '20th-Century Post-Tonal Concepts',
        prompt: q.prompt,
        inputType: 'multiple_choice',
        options: q.options,
        correctAnswer: q.correct,
        spellingSensitive: false,
        explanation: q.explanation,
      };
    }

    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

/**
 * Validates a user's answer against expected answer and acceptable alternatives.
 * Handles enharmonic equivalence vs strict spelling sensitivity.
 */
export function validateDrillAnswer(question: DrillQuestion, userAnswer: string): AnswerValidationResult {
  const cleanUser = userAnswer.trim().toLowerCase();
  const cleanCorrect = question.correctAnswer.trim().toLowerCase();

  // 1. Exact match with the canonical correct answer → full credit (spellingCorrect + enharmonicCorrect)
  if (cleanUser === cleanCorrect) {
    return {
      isCorrect: true,
      spellingCorrect: true,
      enharmonicCorrect: true,
      userAnswer,
      expectedAnswer: question.correctAnswer,
      explanation: `Correct! ${question.explanation}`,
    };
  }

  // 2. Match against acceptable alternatives (alternate formats, numeric-only, enharmonic spellings)
  //    → correct but spellingCorrect is false (the canonical spelling was not used)
  const alternatives = (question.acceptableAnswers || []).map(a => a.trim().toLowerCase());
  if (alternatives.includes(cleanUser)) {
    return {
      isCorrect: true,
      spellingCorrect: false,
      enharmonicCorrect: true,
      userAnswer,
      expectedAnswer: question.correctAnswer,
      explanation: `Correct! ${question.explanation}`,
    };
  }

  // 2. If question is spelling sensitive, reject enharmonic variations that don't match exactly
  if (question.spellingSensitive) {
    return {
      isCorrect: false,
      spellingCorrect: false,
      enharmonicCorrect: checkEnharmonicMatch(userAnswer, question.correctAnswer),
      userAnswer,
      expectedAnswer: question.correctAnswer,
      explanation: `Incorrect spelling. Expected exact spelling "${question.correctAnswer}". ${question.explanation}`,
    };
  }

  // 3. For pitch-class / array / non-spelling-sensitive input, test pitch-class / enharmonic equivalence
  const isEnharmonic = checkEnharmonicMatch(userAnswer, question.correctAnswer);
  if (isEnharmonic) {
    return {
      isCorrect: true,
      spellingCorrect: false,
      enharmonicCorrect: true,
      userAnswer,
      expectedAnswer: question.correctAnswer,
      explanation: `Correct (enharmonically equivalent)! Note: Standard spelling is "${question.correctAnswer}". ${question.explanation}`,
    };
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
 * Helper to check if two note or pitch class strings are enharmonically equivalent.
 */
function checkEnharmonicMatch(input: string, expected: string): boolean {
  try {
    const parsePcs = (str: string): number[] => {
      // Extract numbers or note names from brackets/commas/spaces
      const tokens = str.replace(/[\[\]<>\(\)]/g, ' ').split(/[\s,]+/).filter(Boolean);
      return tokens.map(t => noteToPitchClass(t));
    };

    const userPcs = parsePcs(input);
    const expectedPcs = parsePcs(expected);

    if (userPcs.length !== expectedPcs.length || userPcs.length === 0) return false;
    return userPcs.every((pc, idx) => pc === expectedPcs[idx]);
  } catch {
    return false;
  }
}
