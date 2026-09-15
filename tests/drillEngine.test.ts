import { describe, it, expect } from 'vitest';
import {
  generateDrillQuestion,
  validateDrillAnswer,
  DrillCategory,
} from '../lib/music/drillEngine';
import { isZRelatedPair, Z_RELATED_PAIRS } from '../lib/music/pitchClass';
import { recordPracticeAttemptInStore, UserStoreState, INITIAL_SKILLS } from '../lib/storage/store';
import { FORMAL_ANALYSIS_DATABASE } from '../lib/music/formalAnalysis';

describe('Drill Engine & Question Generator', () => {
  it('generates reproducible questions with fixed seeds', () => {
    const q1 = generateDrillQuestion('tonal', 1, 12345);
    const q2 = generateDrillQuestion('tonal', 1, 12345);
    expect(q1.prompt).toBe(q2.prompt);
    expect(q1.correctAnswer).toBe(q2.correctAnswer);
  });

  it('generates questions across all 7 categories', () => {
    const categories: DrillCategory[] = ['tonal', 'form', 'modes', 'setTheory', 'twelveTone', 'rhythm', 'postTonal'];
    for (const cat of categories) {
      const q = generateDrillQuestion(cat, 2, 9999);
      expect(q.category).toBe(cat);
      expect(q.prompt).toBeTruthy();
      expect(q.correctAnswer).toBeTruthy();
      expect(q.explanation).toBeTruthy();
    }
  });

  it('validates exact matches correctly', () => {
    const q = generateDrillQuestion('postTonal', 1, 100);
    const res = validateDrillAnswer(q, q.correctAnswer);
    expect(res.isCorrect).toBe(true);
    expect(res.explanation).toContain('Correct!');
  });

  it('distinguishes spelling-sensitive answers from enharmonic answers', () => {
    const spellingSensitiveQ = generateDrillQuestion('tonal', 1, 555); // Key signature
    spellingSensitiveQ.spellingSensitive = true;
    spellingSensitiveQ.correctAnswer = '2 sharps';
    spellingSensitiveQ.acceptableAnswers = ['2 sharps', '2'];

    const incorrectSpellingRes = validateDrillAnswer(spellingSensitiveQ, '2 flats');
    expect(incorrectSpellingRes.isCorrect).toBe(false);

    const pitchClassQ = generateDrillQuestion('setTheory', 1, 777); // Non-spelling sensitive pitch classes
    pitchClassQ.spellingSensitive = false;
    pitchClassQ.correctAnswer = '0, 4, 7';

    // Enharmonic equivalent input (C, E, G in note names)
    const enharmonicRes = validateDrillAnswer(pitchClassQ, 'C E G');
    expect(enharmonicRes.isCorrect).toBe(true);
    expect(enharmonicRes.enharmonicCorrect).toBe(true);
  });

  it('gives concise educational explanations on incorrect answers', () => {
    const q = generateDrillQuestion('modes', 1, 888);
    const res = validateDrillAnswer(q, 'completely wrong answer');
    expect(res.isCorrect).toBe(false);
    expect(res.explanation).toContain('Incorrect');
    expect(res.explanation).toContain(q.correctAnswer);
  });
});

describe('Answer-Type-Specific Validation Fixtures', () => {
  describe('vector_text validation', () => {
    const vectorQ = {
      id: 'vec_test',
      category: 'setTheory' as const,
      difficulty: 3 as const,
      skillId: 't2',
      topic: 'Interval-Class Vector',
      prompt: 'Calculate ICV',
      inputType: 'vector_text' as const,
      correctAnswer: '<0 1 2 1 1 1>',
      acceptableAnswers: ['<0 1 2 1 1 1>', '0 1 2 1 1 1', '0,1,2,1,1,1'],
      spellingSensitive: false,
      explanation: 'ICV test.',
    };

    it('accepts valid vector formats', () => {
      expect(validateDrillAnswer(vectorQ, '<0 1 2 1 1 1>').isCorrect).toBe(true);
      expect(validateDrillAnswer(vectorQ, '0 1 2 1 1 1').isCorrect).toBe(true);
      expect(validateDrillAnswer(vectorQ, '0, 1, 2, 1, 1, 1').isCorrect).toBe(true);
    });

    it('rejects vector answers that reduce numbers modulo 12', () => {
      // <12 13 14 13 13 13> mod 12 would be <0 1 2 1 1 1>, but MUST be rejected
      const mod12Result = validateDrillAnswer(vectorQ, '<12 13 14 13 13 13>');
      expect(mod12Result.isCorrect).toBe(false);
    });

    it('rejects malformed or wrong-length vectors', () => {
      expect(validateDrillAnswer(vectorQ, '<0 1 2 1 1>').isCorrect).toBe(false); // 5 elements
      expect(validateDrillAnswer(vectorQ, '<0 1 2 1 1 1 0>').isCorrect).toBe(false); // 7 elements
      expect(validateDrillAnswer(vectorQ, 'abc def').isCorrect).toBe(false);
    });
  });

  describe('pitch_class_array validation', () => {
    const rowQ = {
      id: 'row_test',
      category: 'twelveTone' as const,
      difficulty: 1 as const,
      skillId: 't3',
      topic: 'Row Transformation',
      prompt: 'First 3 pitch classes of P0',
      inputType: 'pitch_class_array' as const,
      correctAnswer: '0, 11, 7',
      acceptableAnswers: ['0, 11, 7', '0 11 7'],
      spellingSensitive: false,
      explanation: 'Row order test.',
    };

    it('accepts exact pitch class order', () => {
      expect(validateDrillAnswer(rowQ, '0, 11, 7').isCorrect).toBe(true);
      expect(validateDrillAnswer(rowQ, 'C B G').isCorrect).toBe(true); // note names equivalent
    });

    it('rejects out-of-order pitch class arrays for ordered row questions', () => {
      expect(validateDrillAnswer(rowQ, '7, 11, 0').isCorrect).toBe(false);
      expect(validateDrillAnswer(rowQ, '0, 7, 11').isCorrect).toBe(false);
    });
  });

  describe('spelling_text validation', () => {
    const secDomQ = {
      id: 'sec_dom_test',
      category: 'tonal' as const,
      difficulty: 3 as const,
      skillId: 'a4',
      topic: 'Secondary Dominants',
      prompt: 'Roman numeral for dominant 7th of V',
      inputType: 'spelling_text' as const,
      correctAnswer: 'V7/V',
      acceptableAnswers: ['V7/V', 'V7 / V'],
      spellingSensitive: true,
      explanation: 'Secondary dominant test.',
    };

    it('accepts exact Roman numeral case, chord quality, and sevenths', () => {
      expect(validateDrillAnswer(secDomQ, 'V7/V').isCorrect).toBe(true);
      expect(validateDrillAnswer(secDomQ, 'V7 / V').isCorrect).toBe(true);
    });

    it('rejects V/V when V7/V is explicitly requested', () => {
      expect(validateDrillAnswer(secDomQ, 'V/V').isCorrect).toBe(false);
    });

    it('rejects wrong case for Roman numerals', () => {
      expect(validateDrillAnswer(secDomQ, 'v7/v').isCorrect).toBe(false);
      expect(validateDrillAnswer(secDomQ, 'v7/V').isCorrect).toBe(false);
    });

    it('normalizes Unicode accidentals in spelling questions', () => {
      const accidentalQ = {
        id: 'acc_test',
        category: 'tonal' as const,
        difficulty: 2 as const,
        skillId: 'a2',
        topic: 'Chord Spelling',
        prompt: 'Spell F# major triad',
        inputType: 'spelling_text' as const,
        correctAnswer: 'F# A# C#',
        acceptableAnswers: ['F# A# C#'],
        spellingSensitive: true,
        explanation: 'Accidental normalization test.',
      };

      expect(validateDrillAnswer(accidentalQ, 'F♯ A♯ C♯').isCorrect).toBe(true);
    });
  });

  describe('multiple_choice validation', () => {
    const mcQ = {
      id: 'mc_test',
      category: 'postTonal' as const,
      difficulty: 1 as const,
      skillId: 't5',
      topic: 'Post Tonal',
      prompt: 'Select term',
      inputType: 'multiple_choice' as const,
      options: ['Polychord / Polytonality', 'Quartal Harmony', 'Tone Cluster'],
      correctAnswer: 'Tone Cluster',
      spellingSensitive: false,
      explanation: 'MC test.',
    };

    it('accepts correct option', () => {
      expect(validateDrillAnswer(mcQ, 'Tone Cluster').isCorrect).toBe(true);
    });

    it('rejects incorrect options', () => {
      expect(validateDrillAnswer(mcQ, 'Quartal Harmony').isCorrect).toBe(false);
    });
  });
});

describe('Z-Related Pitch-Class Sets', () => {
  it('identifies Z-related set pairs', () => {
    const pair = Z_RELATED_PAIRS[0]; // 4-Z15 [0,1,4,6] and 4-Z29 [0,1,3,7]
    expect(isZRelatedPair([...pair.primeA], [...pair.primeB])).toBe(true);
  });

  it('returns false for non-Z-related sets', () => {
    expect(isZRelatedPair([0, 4, 7], [0, 3, 7])).toBe(false); // Transpositionally/Inversionally equivalent
  });
});

describe('Formal Analysis Database', () => {
  it('contains valid questions for Sonata-Allegro, Rondo, and Variations', () => {
    expect(FORMAL_ANALYSIS_DATABASE.length).toBeGreaterThanOrEqual(4);
    for (const item of FORMAL_ANALYSIS_DATABASE) {
      expect(item.prompt).toBeTruthy();
      expect(item.options).toContain(item.correctAnswer);
      expect(item.explanation).toBeTruthy();
    }
  });
});

describe('Streak Behavior & Protection', () => {
  const initialTestState: UserStoreState = {
    schemaVersion: 3,
    examDate: '2026-12-08',
    isRoadMode: false,
    academicStreak: 5,
    pianoStreak: 3,
    lastAcademicDate: '2026-05-01',
    lastPianoDate: '2026-05-01',
    totalMinutesStudied: 100,
    skills: INITIAL_SKILLS,
    history: [],
  };

  it('does NOT advance streak or total minutes on INCORRECT attempt', () => {
    const attemptDate = '2026-05-02T10:00:00.000Z';
    const updated = recordPracticeAttemptInStore(initialTestState, {
      skillId: 't1',
      isCorrect: false,
      responseTimeMs: 5000,
      date: attemptDate,
    }, 5);

    expect(updated.academicStreak).toBe(5); // Remained 5
    expect(updated.lastAcademicDate).toBe('2026-05-01'); // Did not advance date
    expect(updated.totalMinutesStudied).toBe(100); // Did not add minutes
  });

  it('ADVANCES streak and total minutes on CORRECT attempt next day', () => {
    const attemptDate = '2026-05-02T10:00:00.000Z';
    const updated = recordPracticeAttemptInStore(initialTestState, {
      skillId: 't1',
      isCorrect: true,
      responseTimeMs: 3000,
      date: attemptDate,
    }, 5);

    expect(updated.academicStreak).toBe(6); // Advanced 5 -> 6
    expect(updated.lastAcademicDate).toBe('2026-05-02');
    expect(updated.totalMinutesStudied).toBe(105);
  });
});
