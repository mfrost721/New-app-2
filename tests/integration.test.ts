import { describe, it, expect } from 'vitest';
import { recordPracticeAttemptInStore, validateAndMigrateStore, INITIAL_SKILLS } from '../lib/storage/store';
import { updateSkillMastery } from '../lib/adaptive/mastery';

describe('Integration & Storage Lifecycle Tests', () => {
  const dummySkill = INITIAL_SKILLS[0];

  it('verifies that incorrect answers decrease or preserve mastery', () => {
    const wrongAttempt = {
      skillId: dummySkill.id,
      isCorrect: false,
      confidenceRating: 5, // overconfident wrong answer
      responseTimeMs: 5000,
      date: new Date().toISOString(),
    };

    const updated = updateSkillMastery(dummySkill, wrongAttempt);
    expect(updated.mastery).toBeLessThan(dummySkill.mastery);
  });

  it('verifies that submitted attempts appear in history and update total minutes', () => {
    const initialStore = {
      examDate: '2026-12-08',
      isRoadMode: false,
      academicStreak: 1,
      pianoStreak: 1,
      lastAcademicDate: '2025-01-01',
      lastPianoDate: '2025-01-01',
      skills: INITIAL_SKILLS,
      history: [],
      totalMinutesStudied: 100,
    };

    const attempt = {
      skillId: 't1',
      isCorrect: true,
      confidenceRating: 4,
      responseTimeMs: 3000,
      date: '2025-01-02',
    };

    const updated = recordPracticeAttemptInStore(initialStore, attempt, 5);

    expect(updated.history.length).toBe(1);
    expect(updated.history[0].skillId).toBe('t1');
    expect(updated.totalMinutesStudied).toBe(105);
  });

  it('handles malformed storage migration gracefully', () => {
    const malformed = {
      academicStreak: 'invalid',
      skills: null,
    };

    const migrated = validateAndMigrateStore(malformed);
    expect(migrated.examDate).toBe('2026-12-08');
    expect(migrated.academicStreak).toBe(0);
    expect(migrated.skills.length).toBeGreaterThan(0);
  });
});
