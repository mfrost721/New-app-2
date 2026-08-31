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

  it('resets streak to 1 if more than 1 day has elapsed since last practice', () => {
    const initialStore = {
      examDate: '2026-12-08',
      isRoadMode: false,
      academicStreak: 5,
      pianoStreak: 3,
      lastAcademicDate: '2025-01-01',
      lastPianoDate: '2025-01-01',
      skills: [dummySkill],
      history: [],
      totalMinutesStudied: 10,
    };

    const updated = recordPracticeAttemptInStore(initialStore, {
      skillId: 'test-1',
      isCorrect: true,
      responseTimeMs: 2000,
      date: new Date().toISOString(),
    });

    expect(updated.academicStreak).toBe(1);
  });
});
