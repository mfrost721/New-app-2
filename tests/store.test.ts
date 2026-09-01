import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import {
  loadUserStore,
  saveUserStore,
  recordPracticeAttemptInStore,
  INITIAL_STATE,
  INITIAL_SKILLS,
  UserStoreState,
} from '../lib/storage/store';
import { PracticeAttempt } from '../lib/adaptive/mastery';

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

describe('Storage and UserStore Engine', () => {
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
    vi.restoreAllMocks();
  });

  it('returns INITIAL_STATE when localStorage is empty', () => {
    const store = loadUserStore();
    expect(store.academicStreak).toBe(INITIAL_STATE.academicStreak);
    expect(store.skills.length).toBe(INITIAL_SKILLS.length);
  });

  it('handles corrupted JSON in localStorage gracefully without throwing', () => {
    localStorageMock.setItem('frost_music_lab_user_store_v1', 'invalid{json:');
    const store = loadUserStore();
    expect(store.academicStreak).toBe(INITIAL_STATE.academicStreak);
    expect(store.skills.length).toBe(INITIAL_SKILLS.length);
  });

  it('saves and reloads state from localStorage correctly', () => {
    const customState: UserStoreState = {
      ...INITIAL_STATE,
      academicStreak: 12,
      pianoStreak: 8,
      totalMinutesStudied: 500,
    };
    saveUserStore(customState);

    const loaded = loadUserStore();
    expect(loaded.academicStreak).toBe(12);
    expect(loaded.pianoStreak).toBe(8);
    expect(loaded.totalMinutesStudied).toBe(500);
  });

  it('returns currentState unchanged if attempt skillId is not found', () => {
    const attempt: PracticeAttempt = {
      skillId: 'non-existent-skill',
      isCorrect: true,
      responseTimeMs: 1500,
      date: '2026-03-01T10:00:00.000Z',
    };
    const updated = recordPracticeAttemptInStore(INITIAL_STATE, attempt);
    expect(updated).toEqual(INITIAL_STATE);
  });

  it('records practice attempt, updates skill mastery, history, and study time', () => {
    const attempt: PracticeAttempt = {
      skillId: 't1',
      isCorrect: true,
      responseTimeMs: 1200,
      date: INITIAL_STATE.lastAcademicDate || '2026-03-01',
    };

    const updated = recordPracticeAttemptInStore(INITIAL_STATE, attempt, 5);

    expect(updated.totalMinutesStudied).toBe(INITIAL_STATE.totalMinutesStudied + 5);
    expect(updated.history[0].skillId).toBe('t1');

    const updatedSkill = updated.skills.find(s => s.id === 't1');
    expect(updatedSkill?.totalAttempts).toBe(INITIAL_SKILLS[0].totalAttempts + 1);
    expect(updatedSkill?.correctAttempts).toBe(INITIAL_SKILLS[0].correctAttempts + 1);
  });

  it('updates academic streak correctly for same day, consecutive day, and missed days', () => {
    const baseState: UserStoreState = {
      ...INITIAL_STATE,
      academicStreak: 5,
      lastAcademicDate: '2026-03-01',
    };

    // Same day attempt -> streak remains 5
    const sameDayAttempt: PracticeAttempt = {
      skillId: 't1',
      isCorrect: true,
      responseTimeMs: 1000,
      date: '2026-03-01T12:00:00.000Z',
    };
    const sameDayState = recordPracticeAttemptInStore(baseState, sameDayAttempt);
    expect(sameDayState.academicStreak).toBe(5);

    // Consecutive day attempt -> streak increments to 6
    const nextDayAttempt: PracticeAttempt = {
      skillId: 't1',
      isCorrect: true,
      responseTimeMs: 1000,
      date: '2026-03-02T12:00:00.000Z',
    };
    const nextDayState = recordPracticeAttemptInStore(baseState, nextDayAttempt);
    expect(nextDayState.academicStreak).toBe(6);

    // Missed days attempt -> streak resets to 1
    const skippedDayAttempt: PracticeAttempt = {
      skillId: 't1',
      isCorrect: true,
      responseTimeMs: 1000,
      date: '2026-03-05T12:00:00.000Z',
    };
    const skippedState = recordPracticeAttemptInStore(baseState, skippedDayAttempt);
    expect(skippedState.academicStreak).toBe(1);
  });

  it('updates piano streak correctly for Class Piano IV skills', () => {
    const baseState: UserStoreState = {
      ...INITIAL_STATE,
      pianoStreak: 3,
      lastPianoDate: '2026-03-01',
    };

    const pianoAttempt: PracticeAttempt = {
      skillId: 'p4_scale_eb_maj', // Class Piano IV skill
      isCorrect: true,
      responseTimeMs: 1000,
      date: '2026-03-02T12:00:00.000Z',
    };

    const updated = recordPracticeAttemptInStore(baseState, pianoAttempt);
    expect(updated.pianoStreak).toBe(4);
    expect(updated.lastPianoDate).toBe('2026-03-02');
  });

  it('does not advance streaks or study minutes on incorrect attempts', () => {
    const baseState: UserStoreState = {
      ...INITIAL_STATE,
      academicStreak: 5,
      pianoStreak: 3,
      totalMinutesStudied: 100,
      lastAcademicDate: '2026-03-01',
      lastPianoDate: '2026-03-01',
    };

    const wrongAttempt: PracticeAttempt = {
      skillId: 't1',
      isCorrect: false,
      responseTimeMs: 2500,
      date: '2026-03-02T10:00:00.000Z',
    };

    const updated = recordPracticeAttemptInStore(baseState, wrongAttempt, 5);
    expect(updated.academicStreak).toBe(5);
    expect(updated.lastAcademicDate).toBe('2026-03-01');
    expect(updated.totalMinutesStudied).toBe(100);
  });

  it('maintains academic and piano streaks independently', () => {
    const baseState: UserStoreState = {
      ...INITIAL_STATE,
      academicStreak: 5,
      pianoStreak: 2,
      lastAcademicDate: '2026-03-01',
      lastPianoDate: '2026-03-01',
    };

    // Practice academic skill on next day
    const academicAttempt: PracticeAttempt = {
      skillId: 't1', // Theory IV
      isCorrect: true,
      responseTimeMs: 1000,
      date: '2026-03-02T10:00:00.000Z',
    };
    const updated = recordPracticeAttemptInStore(baseState, academicAttempt);
    expect(updated.academicStreak).toBe(6);
    expect(updated.pianoStreak).toBe(2);
  });

  it('caps history list at 100 entries', () => {
    const state = { ...INITIAL_STATE, history: Array.from({ length: 100 }, (_, i) => ({
      skillId: `t1-${i}`,
      isCorrect: true,
      responseTimeMs: 1000,
      date: '2026-03-01',
    })) };

    const newAttempt: PracticeAttempt = {
      skillId: 't1',
      isCorrect: true,
      responseTimeMs: 900,
      date: '2026-03-01',
    };

    const updated = recordPracticeAttemptInStore(state, newAttempt);
    expect(updated.history.length).toBe(100);
    expect(updated.history[0].skillId).toBe('t1');
  });
});
