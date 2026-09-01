import { describe, it, expect } from 'vitest';
import {
  generatePracticePrescription,
} from '../lib/adaptive/practicePrescription';
import { SkillItem } from '../lib/adaptive/mastery';

describe('Adaptive Practice Prescription Engine', () => {
  const sampleSkills: SkillItem[] = [
    { id: 't1', category: 'Theory IV', topic: 'Sets', mastery: 30, totalAttempts: 5, correctAttempts: 1, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
    { id: 't2', category: 'Theory IV', topic: 'Vectors', mastery: 50, totalAttempts: 5, correctAttempts: 2, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
    { id: 't3', category: 'Theory IV', topic: 'Matrix', mastery: 80, totalAttempts: 10, correctAttempts: 8, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
    { id: 'p1', category: 'Class Piano IV', topic: 'Scales', mastery: 20, totalAttempts: 4, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  ];

  it('prioritizes weakest skills when generating recommendations', () => {
    const rx = generatePracticePrescription(sampleSkills, 20, false);
    expect(rx.totalMinutes).toBe(20);
    expect(rx.recommendations.length).toBe(3);

    // Lowest mastery is p1 (20), then t1 (30), then t2 (50)
    expect(rx.recommendations[0].topic).toBe('Scales');
    expect(rx.recommendations[1].topic).toBe('Sets');
    expect(rx.recommendations[2].topic).toBe('Vectors');
  });

  it('filters out Class Piano IV skills when road mode is active', () => {
    const rx = generatePracticePrescription(sampleSkills, 20, true);
    const pianoTopics = rx.recommendations.filter(r => r.category === 'Class Piano IV');
    expect(pianoTopics.length).toBe(0);

    // Non-piano weakest: t1 (30), t2 (50), t3 (80)
    expect(rx.recommendations[0].topic).toBe('Sets');
  });

  it('handles empty skills array gracefully', () => {
    const rx = generatePracticePrescription([], 15, false);
    expect(rx.recommendations.length).toBe(1);
    expect(rx.recommendations[0].topic).toBe('Pitch-Class Set Theory');
    expect(rx.recommendations[0].allocatedMinutes).toBe(15);
  });

  it('correctly distributes minutes across recommendations', () => {
    const rx = generatePracticePrescription(sampleSkills, 20, false);
    const sumMinutes = rx.recommendations.reduce((acc, r) => acc + r.allocatedMinutes, 0);
    expect(sumMinutes).toBe(20);
  });

  it('filters out Class Piano III skills as well in Road Mode', () => {
    const pianoSkills: SkillItem[] = [
      ...sampleSkills,
      { id: 'p3', category: 'Class Piano III', topic: 'C Major Scale', mastery: 15, totalAttempts: 2, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
    ];
    const rx = generatePracticePrescription(pianoSkills, 15, true);
    const pianoRecs = rx.recommendations.filter(r => r.category === 'Class Piano III' || r.category === 'Class Piano IV');
    expect(pianoRecs.length).toBe(0);
  });

  it('handles low minute allocations and 0 totalMinutes gracefully without negative values', () => {
    const rx0 = generatePracticePrescription(sampleSkills, 0, false);
    expect(rx0.totalMinutes).toBe(0);
    expect(rx0.recommendations.reduce((acc, r) => acc + r.allocatedMinutes, 0)).toBe(0);

    const rx2 = generatePracticePrescription(sampleSkills, 2, false);
    expect(rx2.totalMinutes).toBe(2);
    expect(rx2.recommendations.reduce((acc, r) => acc + r.allocatedMinutes, 0)).toBe(2);
    expect(rx2.recommendations.every(r => r.allocatedMinutes >= 0)).toBe(true);
  });

  it('falls back to full skill set if all skills in list are piano skills in Road Mode', () => {
    const onlyPiano: SkillItem[] = [
      { id: 'p3_1', category: 'Class Piano III', topic: 'C Major', mastery: 40, totalAttempts: 1, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
      { id: 'p4_1', category: 'Class Piano IV', topic: 'Eb Major', mastery: 50, totalAttempts: 1, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
    ];
    const rx = generatePracticePrescription(onlyPiano, 10, true);
    expect(rx.recommendations.length).toBeGreaterThan(0);
    expect(rx.recommendations.reduce((acc, r) => acc + r.allocatedMinutes, 0)).toBe(10);
  });
});
