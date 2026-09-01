import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import {
  loadUserStore,
  saveUserStore,
  recordPracticeAttemptInStore,
  exportUserStoreData,
  importUserStoreData,
  migrateAndSanitizeStore,
  CURRENT_SCHEMA_VERSION,
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

  getAllKeys(): string[] {
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

  it('returns INITIAL_STATE with current version when localStorage is empty', () => {
    const store = loadUserStore();
    expect(store.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(store.academicStreak).toBe(INITIAL_STATE.academicStreak);
    expect(store.skills.length).toBe(INITIAL_SKILLS.length);
  });

  it('handles corrupted JSON in localStorage gracefully and backs up corrupted string', () => {
    const corruptedJson = 'invalid{json:123';
    localStorageMock.setItem('frost_music_lab_user_store_v1', corruptedJson);

    // Suppress console.error during expected failure test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = loadUserStore();
    expect(store.academicStreak).toBe(INITIAL_STATE.academicStreak);
    expect(store.skills.length).toBe(INITIAL_SKILLS.length);

    // Verify backup was saved in localStorage
    const backupKeys = localStorageMock.getAllKeys().filter((k) => k.startsWith('frost_music_lab_corrupt_backup_'));
    expect(backupKeys.length).toBe(1);
    expect(localStorageMock.getItem(backupKeys[0])).toBe(corruptedJson);

    consoleSpy.mockRestore();
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
    expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
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

    const updatedSkill = updated.skills.find((s) => s.id === 't1');
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

  describe('Schema Migrations and Data Hardening', () => {
    it('migrates unversioned v1 data to current version deterministically', () => {
      const legacyData = {
        examDate: '2026-12-08',
        isRoadMode: true,
        academicStreak: 10,
        pianoStreak: 7,
        lastAcademicDate: '2026-03-01',
        lastPianoDate: '2026-03-01',
        totalMinutesStudied: 400,
        skills: [
          {
            id: 't1',
            category: 'Theory IV',
            topic: 'Pitch-Class Sets & Prime Form',
            mastery: 90,
            totalAttempts: 20,
            correctAttempts: 18,
            lastPracticed: '2026-03-01',
            recentLatencyMs: [1200],
            errorHistory: [],
          },
        ],
        history: [],
      };

      const result = migrateAndSanitizeStore(legacyData);
      expect(result.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.academicStreak).toBe(10);
      expect(result.isRoadMode).toBe(true);
      // Ensures missing INITIAL_SKILLS were merged into user's skills list
      expect(result.skills.length).toBe(INITIAL_SKILLS.length);
      expect(result.skills.find((s) => s.id === 't1')?.mastery).toBe(90);
    });

    it('clamps out-of-range numeric fields and removes malformed skill items safely', () => {
      const corruptedFieldsData = {
        version: 1,
        academicStreak: -15, // Should clamp to 0
        pianoStreak: 'invalid_number', // Should fallback to INITIAL_STATE.pianoStreak
        totalMinutesStudied: 'not_a_number',
        skills: [
          null, // Malformed null entry
          { id: 't1', mastery: 150, totalAttempts: 5, correctAttempts: 10 }, // mastery > 100, correctAttempts > totalAttempts
          { invalid: 'object' }, // Missing id
        ],
      };

      const result = migrateAndSanitizeStore(corruptedFieldsData);
      expect(result.academicStreak).toBe(0);
      expect(result.pianoStreak).toBe(INITIAL_STATE.pianoStreak);
      expect(result.totalMinutesStudied).toBe(INITIAL_STATE.totalMinutesStudied);

      const t1 = result.skills.find((s) => s.id === 't1');
      expect(t1).toBeDefined();
      expect(t1?.mastery).toBe(100); // Clamped to 100 max
      expect(t1?.correctAttempts).toBe(5); // Clamped to totalAttempts
    });

    it('handles future schema versions safely without losing user progress', () => {
      const futureData = {
        version: 99,
        futureFeatureFlag: true,
        academicStreak: 15,
        pianoStreak: 12,
        totalMinutesStudied: 800,
        skills: INITIAL_SKILLS,
        history: [],
      };

      const result = migrateAndSanitizeStore(futureData);
      expect(result.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.academicStreak).toBe(15);
      expect(result.pianoStreak).toBe(12);
      expect(result.totalMinutesStudied).toBe(800);
    });

    it('exports user store data with proper metadata envelope', () => {
      const customState: UserStoreState = {
        ...INITIAL_STATE,
        academicStreak: 20,
      };

      const payload = exportUserStoreData(customState);
      expect(payload.app).toBe('frost_music_lab');
      expect(payload.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(typeof payload.exportedAt).toBe('string');
      expect(payload.data.academicStreak).toBe(20);
    });

    it('imports serialized JSON backup payload and updates store correctly', () => {
      const backupData = {
        app: 'frost_music_lab',
        version: 1,
        exportedAt: '2026-03-01T00:00:00.000Z',
        data: {
          ...INITIAL_STATE,
          academicStreak: 42,
          pianoStreak: 24,
        },
      };

      const jsonStr = JSON.stringify(backupData);
      const imported = importUserStoreData(jsonStr);

      expect(imported.academicStreak).toBe(42);
      expect(imported.pianoStreak).toBe(24);

      // Verify imported state was saved to localStorage
      const reloaded = loadUserStore();
      expect(reloaded.academicStreak).toBe(42);
    });

    it('throws informative error on importing malformed JSON', () => {
      expect(() => importUserStoreData('invalid-json')).toThrow('Invalid JSON format in backup file.');
      expect(() => importUserStoreData(null)).toThrow('Import data is empty or invalid.');
    });
  });
});
