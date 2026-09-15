import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  fingerprintQuestion,
  generateUnique,
  loadRecentPromptStore,
  rememberFingerprint,
  resetPools,
  getPoolStatus,
  loadQuestionBankStore,
  QUESTION_BANK_STORAGE_KEY,
} from '../lib/practice/questionBank';
import { generateDrillQuestion } from '../lib/music/drillEngine';

class LocalStorageMock {
  private store: Record<string, string> = {};
  public throwOnSet = false;

  clear() {
    this.store = {};
    this.throwOnSet = false;
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key: string, value: string) {
    if (this.throwOnSet) {
      throw new Error('QuotaExceededError: Storage quota exceeded');
    }
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }
}

describe('Question bank uniqueness, pool selection, and storage fallback', () => {
  const localStorageMock = new LocalStorageMock();

  beforeAll(() => {
    (globalThis as unknown as { window: unknown }).window = globalThis;
    (globalThis as unknown as { localStorage: unknown }).localStorage = localStorageMock;
  });

  afterAll(() => {
    // @ts-expect-error cleanup window mock
    delete globalThis.window;
    // @ts-expect-error cleanup localStorage mock
    delete globalThis.localStorage;
  });

  beforeEach(() => {
    localStorageMock.clear();
    resetPools();
  });

  it('creates stable fingerprints for the same prompt payload', () => {
    const q = generateDrillQuestion('setTheory', 1, 42);
    expect(fingerprintQuestion(q)).toBe(fingerprintQuestion({
      category: q.category,
      prompt: ` ${q.prompt} `,
      correctAnswer: q.correctAnswer,
    }));
  });

  it('remembers fingerprints in localStorage with a rolling cap', () => {
    rememberFingerprint('aaa', 2);
    rememberFingerprint('bbb', 2);
    rememberFingerprint('ccc', 2);
    const stored = loadRecentPromptStore();
    expect(stored.fingerprints).toEqual(['ccc', 'bbb']);
    expect(localStorageMock.getItem(QUESTION_BANK_STORAGE_KEY)).toContain('ccc');
  });

  it('generateUnique avoids an already-seen fingerprint when another seed exists', () => {
    const first = generateUnique({ category: 'tonal', difficulty: 1, seed: 100 });
    const firstPrint = fingerprintQuestion(first);
    const second = generateUnique({ category: 'tonal', difficulty: 1, seed: 100 });
    expect(fingerprintQuestion(second)).not.toBe(firstPrint);
    expect(loadRecentPromptStore().fingerprints.length).toBeGreaterThanOrEqual(2);
  });

  it('generateUnique still returns a question if the recent pool is saturated', () => {
    const q = generateUnique({
      category: 'postTonal',
      difficulty: 1,
      seed: 7,
      recentLimit: 1,
      maxAttempts: 1,
    });
    expect(q.prompt).toBeTruthy();
    expect(q.correctAnswer).toBeTruthy();
    expect(loadRecentPromptStore().fingerprints.length).toBe(1);
  });

  it('maintains strict pool isolation between categories, difficulties, and subtopics', () => {
    // Draw 2 questions from tonal/1
    const t1_q1 = generateUnique({ category: 'tonal', difficulty: 1 });
    const t1_q2 = generateUnique({ category: 'tonal', difficulty: 1 });
    expect(fingerprintQuestion(t1_q1)).not.toBe(fingerprintQuestion(t1_q2));

    const statusT1 = getPoolStatus('tonal', 1);
    expect(statusT1.remainingInCycle).toBe(statusT1.poolSize - 2);

    // Confirm tonal/2 and modes/1 are completely unimpacted
    const statusT2 = getPoolStatus('tonal', 2);
    expect(statusT2.remainingInCycle).toBe(statusT2.poolSize);

    const statusModes = getPoolStatus('modes', 1);
    expect(statusModes.remainingInCycle).toBe(statusModes.poolSize);
  });

  it('exhausts finite pools without replacement, reports pool size, and marks review on restart', () => {
    // Cadence Identification has 5 cadences in CADENCE_DEFINITIONS
    const poolStatus = getPoolStatus('tonal', 4);
    expect(poolStatus.poolSize).toBe(5);

    const cycle0Prints: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const q = generateUnique({ category: 'tonal', difficulty: 4, seed: 42 });
      expect(q.poolSize).toBe(5);
      expect(q.isReview).toBe(false);
      cycle0Prints.push(fingerprintQuestion(q));
    }

    // All 5 in cycle 0 must be unique
    const unique0 = new Set(cycle0Prints);
    expect(unique0.size).toBe(5);

    // The 6th draw triggers pool exhaustion and restart for cycle 1
    const q6 = generateUnique({ category: 'tonal', difficulty: 4, seed: 42 });
    expect(q6.poolSize).toBe(5);
    expect(q6.isReview).toBe(true);

    const q6Print = fingerprintQuestion(q6);
    const lastCycle0Print = cycle0Prints[4];

    // Rule: when restarting a pool with >1 item, avoid repeating the last item immediately
    expect(q6Print).not.toBe(lastCycle0Print);
  });

  it('persists pool history and remaining queue across store reloads', () => {
    const q1 = generateUnique({ category: 'rhythm', difficulty: 1, seed: 99 });
    const q2 = generateUnique({ category: 'rhythm', difficulty: 1, seed: 99 });
    expect(fingerprintQuestion(q1)).not.toBe(fingerprintQuestion(q2));

    // Reload store data from storage
    const reloadedStore = loadQuestionBankStore();
    expect(reloadedStore).toBeDefined();
    const status = getPoolStatus('rhythm', 1);
    expect(status.remainingInCycle).toBe(status.poolSize - 2);

    // Draw 3rd question after reload
    const q3 = generateUnique({ category: 'rhythm', difficulty: 1, seed: 99 });
    const q3Print = fingerprintQuestion(q3);
    expect(q3Print).not.toBe(fingerprintQuestion(q1));
    expect(q3Print).not.toBe(fingerprintQuestion(q2));
  });

  it('falls back to in-memory state when localStorage is blocked or throws', () => {
    localStorageMock.throwOnSet = true;

    // Drawing should succeed without throwing
    const q1 = generateUnique({ category: 'setTheory', difficulty: 4, seed: 123 });
    const q2 = generateUnique({ category: 'setTheory', difficulty: 4, seed: 123 });

    expect(q1.prompt).toBeTruthy();
    expect(q2.prompt).toBeTruthy();
    expect(fingerprintQuestion(q1)).not.toBe(fingerprintQuestion(q2));
    expect(q1.poolSize).toBe(8); // Z-related sets pool size (8 pairs)
    expect(q1.isReview).toBe(false);
  });

  it('generates deterministic candidate queues when given explicit seeds', () => {
    const runA = Array.from({ length: 5 }, () => generateUnique({ category: 'tonal', difficulty: 1, seed: 777 }));

    resetPools();

    const runB = Array.from({ length: 5 }, () => generateUnique({ category: 'tonal', difficulty: 1, seed: 777 }));

    expect(runA.map(fingerprintQuestion)).toEqual(runB.map(fingerprintQuestion));
  });
});
