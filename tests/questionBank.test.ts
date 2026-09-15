import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  fingerprintQuestion,
  generateUnique,
  loadRecentPromptStore,
  rememberFingerprint,
  QUESTION_BANK_STORAGE_KEY,
} from '../lib/practice/questionBank';
import { generateDrillQuestion } from '../lib/music/drillEngine';

class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }
}

describe('Question bank uniqueness and fingerprinting', () => {
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
});
