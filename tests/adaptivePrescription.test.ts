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
});
