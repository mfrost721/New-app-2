import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import {
  loadUserStore,
  saveUserStore,
  recordPracticeAttemptInStore,
  migrateAndSanitizeStore,
  createExportPayload,
  importUserStore,
  INITIAL_STATE,
  INITIAL_SKILLS,
  CURRENT_SCHEMA_VERSION,
  UserStoreState,
} from '../lib/storage/store';
import { PracticeAttempt, SkillItem } from '../lib/adaptive/mastery';

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

  keys(): string[] {
    return Object.keys(this.store);
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
    expect(store.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(store.academicStreak).toBe(INITIAL_STATE.academicStreak);
    expect(store.skills.length).toBe(INITIAL_SKILLS.length);
  });

  it('handles corrupted JSON in localStorage gracefully and backs up raw string', () => {
    localStorageMock.setItem('frost_music_lab_user_store_v1', 'invalid{json:');
    const store = loadUserStore();
    expect(store.academicStreak).toBe(INITIAL_STATE.academicStreak);
    expect(store.skills.length).toBe(INITIAL_SKILLS.length);

    // Verify corrupt string was backed up
    const corruptKeys = localStorageMock.keys().filter(k => k.startsWith('frost_music_lab_corrupt_backup'));
    expect(corruptKeys.length).toBe(1);
    expect(localStorageMock.getItem(corruptKeys[0])).toBe('invalid{json:');
  });

  it('handles non-object JSON primitives in localStorage safely', () => {
    localStorageMock.setItem('frost_music_lab_user_store_v1', '12345');
    const store = loadUserStore();
    expect(store.version).toBe(CURRENT_SCHEMA_VERSION);
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

  it('caps history list at 100 entries', () => {
    const state = {
      ...INITIAL_STATE,
      history: Array.from({ length: 100 }, (_, i) => ({
        skillId: `t1-${i}`,
        isCorrect: true,
        responseTimeMs: 1000,
        date: '2026-03-01',
      })),
    };

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

  describe('Schema Versioning & Deterministic Migrations', () => {
    it('migrates unversioned legacy v1 store to v2 with schema version set', () => {
      const legacyV1Data = {
        examDate: '2026-12-08',
        isRoadMode: true,
        academicStreak: 10,
        pianoStreak: 4,
        totalMinutesStudied: 200,
        skills: [
          { id: 't1', category: 'Theory IV', topic: 'P-Sets', mastery: 88, totalAttempts: 10, correctAttempts: 8, lastPracticed: '2026-01-01', recentLatencyMs: [1200], errorHistory: [] }
        ],
        history: [],
      };

      const migrated = migrateAndSanitizeStore(legacyV1Data);
      expect(migrated.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(migrated.isRoadMode).toBe(true);
      expect(migrated.academicStreak).toBe(10);
      // Existing skill progress preserved
      const t1 = migrated.skills.find(s => s.id === 't1');
      expect(t1?.mastery).toBe(88);
      // Missing default skills added
      expect(migrated.skills.length).toBe(INITIAL_SKILLS.length);
    });

    it('merges newly added initial skills without losing existing student progress', () => {
      const partialData = {
        version: 1,
        academicStreak: 15,
        skills: [
          { id: 't1', category: 'Theory IV', topic: 'Custom Topic', mastery: 95, totalAttempts: 50, correctAttempts: 45, lastPracticed: '', recentLatencyMs: [], errorHistory: [] }
        ],
      };

      const sanitized = migrateAndSanitizeStore(partialData);
      expect(sanitized.skills.length).toBe(INITIAL_SKILLS.length);
      const t1 = sanitized.skills.find(s => s.id === 't1');
      expect(t1?.mastery).toBe(95);
      expect(t1?.totalAttempts).toBe(50);
    });

    it('clamps mastery scores to [0, 100] and cleans invalid numbers', () => {
      const malformedSkillsData = {
        version: 2,
        skills: [
          { id: 't1', category: 'Theory IV', topic: 'T1', mastery: 150, totalAttempts: -5, correctAttempts: 10, recentLatencyMs: ['invalid', 2000, -500], errorHistory: [123, 'valid error'] },
          { id: 't2', category: 'Theory IV', topic: 'T2', mastery: -25, totalAttempts: 4, correctAttempts: 10 }
        ],
      };

      const sanitized = migrateAndSanitizeStore(malformedSkillsData);
      const t1 = sanitized.skills.find(s => s.id === 't1');
      const t2 = sanitized.skills.find(s => s.id === 't2');

      expect(t1?.mastery).toBe(100);
      expect(t1?.totalAttempts).toBe(0);
      expect(t1?.correctAttempts).toBe(0);
      expect(t1?.recentLatencyMs).toEqual([2000]);
      expect(t1?.errorHistory).toEqual(['valid error']);

      expect(t2?.mastery).toBe(0);
      expect(t2?.correctAttempts).toBe(4); // capped at totalAttempts (4)
    });

    it('preserves unknown top-level and skill-level fields added by future versions', () => {
      const futureData = {
        version: 3,
        examDate: '2027-01-01',
        isRoadMode: false,
        academicStreak: 7,
        futureSettingEnabled: true,
        skills: [
          { id: 't1', category: 'Theory IV', topic: 'P-Sets', mastery: 75, totalAttempts: 5, correctAttempts: 4, lastPracticed: '', recentLatencyMs: [], errorHistory: [], futureSkillBadge: 'gold' }
        ],
      };

      const sanitized = migrateAndSanitizeStore(futureData);
      expect(sanitized.futureSettingEnabled).toBe(true);
      const t1 = sanitized.skills.find(s => s.id === 't1') as (SkillItem & { futureSkillBadge?: string });
      expect(t1?.futureSkillBadge).toBe('gold');
    });

    it('sanitizes streaks, totalMinutesStudied, and roadMode flag', () => {
      const invalidFieldsData = {
        version: 2,
        academicStreak: -10,
        pianoStreak: 'invalid',
        totalMinutesStudied: -50,
        isRoadMode: 1, // truthy primitive -> boolean true
      };

      const sanitized = migrateAndSanitizeStore(invalidFieldsData);
      expect(sanitized.academicStreak).toBe(INITIAL_STATE.academicStreak);
      expect(sanitized.pianoStreak).toBe(INITIAL_STATE.pianoStreak);
      expect(sanitized.totalMinutesStudied).toBe(INITIAL_STATE.totalMinutesStudied);
      expect(sanitized.isRoadMode).toBe(true);
    });
  });

  describe('Export Payload Creation & Import Validation', () => {
    it('createExportPayload returns a structured payload with metadata', () => {
      const state: UserStoreState = {
        ...INITIAL_STATE,
        academicStreak: 20,
      };

      const payload = createExportPayload(state);
      expect(payload.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(payload.app).toBe('frost_music_lab');
      expect(typeof payload.exportedAt).toBe('string');
      expect(payload.state.academicStreak).toBe(20);
    });

    it('importUserStore imports a valid export payload string and saves to localStorage', () => {
      const exportObject = {
        version: CURRENT_SCHEMA_VERSION,
        exportedAt: '2026-03-01T12:00:00Z',
        app: 'frost_music_lab',
        state: {
          ...INITIAL_STATE,
          academicStreak: 42,
          pianoStreak: 21,
        },
      };

      const result = importUserStore(JSON.stringify(exportObject));
      expect(result.success).toBe(true);
      expect(result.state?.academicStreak).toBe(42);
      expect(result.state?.pianoStreak).toBe(21);

      // Verify localStorage was updated
      const loaded = loadUserStore();
      expect(loaded.academicStreak).toBe(42);
    });

    it('importUserStore imports legacy unversioned state objects successfully', () => {
      const legacyState = {
        academicStreak: 18,
        pianoStreak: 9,
        skills: INITIAL_SKILLS,
      };

      const result = importUserStore(JSON.stringify(legacyState));
      expect(result.success).toBe(true);
      expect(result.state?.academicStreak).toBe(18);
      expect(result.state?.version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('importUserStore handles malformed inputs gracefully with error messages', () => {
      expect(importUserStore('').success).toBe(false);
      expect(importUserStore('   ').success).toBe(false);
      expect(importUserStore('invalid json string').success).toBe(false);
      expect(importUserStore('12345').success).toBe(false);
      expect(importUserStore('null').success).toBe(false);
      expect(importUserStore('[]').success).toBe(false);
    });
  });
});
