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
    expect(rx.recommendations[0].href).toBe('/piano?skill=p1');
    expect(rx.recommendations[1].href).toBe('/theory?skill=t1');
  });

  it('filters out Class Piano IV skills when road mode is active', () => {
    const rx = generatePracticePrescription(sampleSkills, 20, true);
    const pianoTopics = rx.recommendations.filter(r => r.category === 'Class Piano IV');
    expect(pianoTopics.length).toBe(0);

    // Non-piano weakest: t1 (30), t2 (50), t3 (80)
    expect(rx.recommendations[0].topic).toBe('Sets');
  });

  it('biases recommendations toward UCO Level IV exam skills when examDate is set', () => {
    const mixedSkills: SkillItem[] = [
      // Piano III skill with low mastery (10%) - not Level IV exam
      { id: 'p3_scale_c_maj', category: 'Class Piano III', topic: 'C Major', mastery: 10, totalAttempts: 2, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
      // Theory IV core exam skill with higher mastery (25%)
      { id: 't1', category: 'Theory IV', topic: 'Sets', mastery: 25, totalAttempts: 5, correctAttempts: 1, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
      // Aural IV core exam skill with higher mastery (30%)
      { id: 'a3', category: 'Aural Skills IV', topic: '6/4 Chords', mastery: 30, totalAttempts: 5, correctAttempts: 2, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
      // Piano IV core exam skill with higher mastery (35%)
      { id: 'p4_scale_eb_maj', category: 'Class Piano IV', topic: 'Eb Major Scale', mastery: 35, totalAttempts: 4, correctAttempts: 1, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
    ];

    const rxNoExam = generatePracticePrescription(mixedSkills, 20, false);
    // Without exam date, lowest mastery p3_scale_c_maj (10) comes first
    expect(rxNoExam.recommendations[0].skillId).toBe('p3_scale_c_maj');

    const rxWithExam = generatePracticePrescription(mixedSkills, 20, false, '2026-12-08');
    // With exam date, UCO IV exam skills (t1, a3, p4_scale_eb_maj) are prioritized
    expect(rxWithExam.recommendations[0].skillId).toBe('t1');
    expect(rxWithExam.recommendations[0].reason).toContain('Upcoming UCO IV exam priority');
  });

  it('maintains road-mode suppression of piano skills even when examDate is set', () => {
    const mixedSkills: SkillItem[] = [
      { id: 'p4_scale_eb_maj', category: 'Class Piano IV', topic: 'Eb Scale', mastery: 5, totalAttempts: 2, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
      { id: 't1', category: 'Theory IV', topic: 'Sets', mastery: 40, totalAttempts: 5, correctAttempts: 2, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
      { id: 'a1', category: 'Aural Skills IV', topic: 'Solfege', mastery: 50, totalAttempts: 5, correctAttempts: 2, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
    ];

    const rxRoadWithExam = generatePracticePrescription(mixedSkills, 20, true, '2026-12-08');
    const pianoRecs = rxRoadWithExam.recommendations.filter(r => r.category.startsWith('Class Piano'));
    expect(pianoRecs.length).toBe(0);
    expect(rxRoadWithExam.recommendations[0].skillId).toBe('t1');
  });

  it('handles empty skills array gracefully', () => {
    const rx = generatePracticePrescription([], 15, false);
    expect(rx.recommendations.length).toBe(1);
    expect(rx.recommendations[0].topic).toBe('Pitch-Class Set Theory');
    expect(rx.recommendations[0].allocatedMinutes).toBe(15);
    expect(rx.recommendations[0].href).toBe('/theory?skill=t1');
  });

  it('correctly distributes minutes across recommendations', () => {
    const rx = generatePracticePrescription(sampleSkills, 20, false);
    const sumMinutes = rx.recommendations.reduce((acc, r) => acc + r.allocatedMinutes, 0);
    expect(sumMinutes).toBe(20);
  });
});
