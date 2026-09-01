import { describe, it, expect } from 'vitest';
import { updateSkillMastery, calculateExamReadiness, SkillItem } from '../lib/adaptive/mastery';
import { generatePracticePrescription } from '../lib/adaptive/practicePrescription';
import { recordPracticeAttemptInStore } from '../lib/storage/store';

describe('Adaptive Learning Engine & Mastery', () => {
  const dummySkill: SkillItem = {
    id: 'test-1',
    category: 'Theory IV',
    topic: 'Pitch-Class Sets',
    mastery: 50,
    totalAttempts: 5,
    correctAttempts: 3,
    lastPracticed: '2025-01-01',
    recentLatencyMs: [3000],
    errorHistory: [],
  };

  it('increases mastery on correct attempt and fast response', () => {
    const updated = updateSkillMastery(dummySkill, {
      skillId: 'test-1',
      isCorrect: true,
      confidenceRating: 5,
      responseTimeMs: 2000,
      date: '2025-01-02',
    });

    expect(updated.mastery).toBeGreaterThan(50);
    expect(updated.totalAttempts).toBe(6);
    expect(updated.correctAttempts).toBe(4);
  });

  it('penalizes incorrect attempt with high confidence rating', () => {
    const updated = updateSkillMastery(dummySkill, {
      skillId: 'test-1',
      isCorrect: false,
      confidenceRating: 5,
      responseTimeMs: 5000,
      errorType: 'Inversion error',
      date: '2025-01-02',
    });

    expect(updated.mastery).toBeLessThan(50);
    expect(updated.errorHistory).toContain('Inversion error');
  });

  it('calculates category exam readiness', () => {
    const skills: SkillItem[] = [
      { ...dummySkill, mastery: 80, topic: 'Topic A' },
      { ...dummySkill, mastery: 90, topic: 'Topic B' },
    ];
    const readiness = calculateExamReadiness(skills, 'Theory IV');

    expect(readiness.masteryPercentage).toBe(85);
    expect(readiness.readinessLabel).toBe('EXAM READY');
    expect(readiness.passingProbability).toBeGreaterThan(80);
  });

  it('generates practice prescriptions excluding piano in Road Mode', () => {
    const skills: SkillItem[] = [
      { ...dummySkill, id: 's1', category: 'Theory IV', topic: 'Theory Weakness', mastery: 30 },
      { ...dummySkill, id: 's2', category: 'Class Piano IV', topic: 'Piano Weakness', mastery: 10 },
    ];

    const rxRoad = generatePracticePrescription(skills, 20, true);
    expect(rxRoad.recommendations.some(r => r.category === 'Class Piano IV')).toBe(false);

    const rxHome = generatePracticePrescription(skills, 20, false);
    expect(rxHome.recommendations.some(r => r.category === 'Class Piano IV')).toBe(true);
  });

  describe('Streak behavior', () => {
    const pianoSkill: SkillItem = {
      ...dummySkill,
      id: 'piano-1',
      category: 'Class Piano IV',
      topic: 'Major Scales',
    };

    const baseStore = {
      examDate: '2026-12-08',
      isRoadMode: false,
      academicStreak: 5,
      pianoStreak: 3,
      lastAcademicDate: '2025-01-10',
      lastPianoDate: '2025-01-10',
      skills: [dummySkill, pianoSkill],
      history: [],
      totalMinutesStudied: 10,
    };

    it('does not increment streak on same-day practice', () => {
      const updated = recordPracticeAttemptInStore(baseStore, {
        skillId: 'test-1',
        isCorrect: true,
        responseTimeMs: 2000,
        date: '2025-01-10T12:00:00Z',
      });

      expect(updated.academicStreak).toBe(5);
    });

    it('increments streak by 1 on exactly one day later practice', () => {
      const updated = recordPracticeAttemptInStore(baseStore, {
        skillId: 'test-1',
        isCorrect: true,
        responseTimeMs: 2000,
        date: '2025-01-11T12:00:00Z',
      });

      expect(updated.academicStreak).toBe(6);
    });

    it('resets streak to 1 if more than 1 day has elapsed since last practice', () => {
      const updated = recordPracticeAttemptInStore(baseStore, {
        skillId: 'test-1',
        isCorrect: true,
        responseTimeMs: 2000,
        date: '2025-01-13T12:00:00Z',
      });

      expect(updated.academicStreak).toBe(1);
    });

    it('maintains independence between academic and piano streaks', () => {
      // Academic practice on same day as last practice
      const updatedAcademic = recordPracticeAttemptInStore(baseStore, {
        skillId: 'test-1',
        isCorrect: true,
        responseTimeMs: 2000,
        date: '2025-01-11T12:00:00Z',
      });

      // Academic streak updated, piano streak unchanged
      expect(updatedAcademic.academicStreak).toBe(6);
      expect(updatedAcademic.pianoStreak).toBe(3);

      // Piano practice 1 day later
      const updatedPiano = recordPracticeAttemptInStore(baseStore, {
        skillId: 'piano-1',
        isCorrect: true,
        responseTimeMs: 2000,
        date: '2025-01-11T12:00:00Z',
      });

      // Academic streak resets (targetSkill was piano so target skill category is Class Piano IV, but getDaysDiff calculates based on attempt date)
      // When practicing piano skill, lastAcademicDate remains '2025-01-10'. On 2025-01-11 academicDiff is 1 -> academicStreak becomes 5+1 = 6. Piano streak becomes 3+1 = 4.
      expect(updatedPiano.pianoStreak).toBe(4);
    });
  });
});
