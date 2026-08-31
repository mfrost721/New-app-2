import { describe, it, expect } from 'vitest';
import { INITIAL_STATE, recordPracticeAttemptInStore, UserStoreState } from '../lib/storage/store';

function makeState(overrides: Partial<UserStoreState>): UserStoreState {
  return {
    ...INITIAL_STATE,
    ...overrides,
    skills: INITIAL_STATE.skills.map(skill => ({ ...skill })),
    history: [],
  };
}

describe('User store streak logic', () => {
  it('increments streak only on consecutive day and resets after gaps', () => {
    const state = makeState({
      academicStreak: 5,
      lastAcademicDate: '2026-08-29',
      lastPianoDate: '2026-08-29',
      pianoStreak: 4,
    });

    const updated = recordPracticeAttemptInStore(state, {
      skillId: 't1',
      isCorrect: true,
      confidenceRating: 3,
      responseTimeMs: 1000,
      date: new Date().toISOString(),
    });

    expect(updated.academicStreak).toBe(1);
  });

  it('resets piano streak after missed days', () => {
    const state = makeState({
      academicStreak: 2,
      pianoStreak: 6,
      lastAcademicDate: '2026-08-29',
      lastPianoDate: '2026-08-29',
    });

    const updated = recordPracticeAttemptInStore(state, {
      skillId: 'p1',
      isCorrect: true,
      confidenceRating: 3,
      responseTimeMs: 1000,
      date: new Date().toISOString(),
    });

    expect(updated.pianoStreak).toBe(1);
  });
});
