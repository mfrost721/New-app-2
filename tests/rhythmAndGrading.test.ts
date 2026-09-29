import { describe, it, expect } from 'vitest';
import { updateSkillMastery, calculateExamReadiness, SkillItem, PracticeAttempt } from '../lib/adaptive/mastery';
import { getRhythmicSyllable, isSyncopated, COMMON_METERS } from '../lib/music/rhythm';
import { evaluateMidiSequence, PlayedNoteEvent } from '../lib/music/pianoGrading';

describe('Rhythm & Meter Engine Unit Tests', () => {
  it('returns valid meter definitions for common meters', () => {
    expect(COMMON_METERS['4/4'].type).toBe('simple');
    expect(COMMON_METERS['6/8'].type).toBe('compound');
    expect(COMMON_METERS['7/8'].type).toBe('asymmetric');
  });

  it('generates correct rhythmic counting syllables across all counting systems', () => {
    // Eastman
    expect(getRhythmicSyllable(1, 0, 'Eastman')).toBe('1');
    expect(getRhythmicSyllable(1, 1, 'Eastman')).toBe('ti');
    expect(getRhythmicSyllable(1, 2, 'Eastman')).toBe('te');
    expect(getRhythmicSyllable(1, 3, 'Eastman')).toBe('ta');

    // Traditional
    expect(getRhythmicSyllable(2, 0, 'Traditional (1-e-&-a)')).toBe('2');
    expect(getRhythmicSyllable(2, 1, 'Traditional (1-e-&-a)')).toBe('e');
    expect(getRhythmicSyllable(2, 2, 'Traditional (1-e-&-a)')).toBe('&');
    expect(getRhythmicSyllable(2, 3, 'Traditional (1-e-&-a)')).toBe('a');

    // Takadimi
    expect(getRhythmicSyllable(3, 0, 'Takadimi')).toBe('ta');
    expect(getRhythmicSyllable(3, 1, 'Takadimi')).toBe('ka');
    expect(getRhythmicSyllable(3, 2, 'Takadimi')).toBe('di');
    expect(getRhythmicSyllable(3, 3, 'Takadimi')).toBe('mi');

    // Pizza
    expect(getRhythmicSyllable(4, 0, 'Pizza')).toBe('Piz');
    expect(getRhythmicSyllable(4, 1, 'Pizza')).toBe('za');
    expect(getRhythmicSyllable(4, 2, 'Pizza')).toBe('slice');
    expect(getRhythmicSyllable(4, 3, 'Pizza')).toBe('hot');
  });

  it('detects syncopated subdivisions correctly', () => {
    expect(isSyncopated(0)).toBe(false); // On-beat
    expect(isSyncopated(1)).toBe(true);  // Off-beat sub
    expect(isSyncopated(2)).toBe(false); // Off-beat main
    expect(isSyncopated(3)).toBe(true);  // Off-beat sub
  });
});

describe('Grading & Adaptive Mastery Calculations', () => {
  const baseSkill: SkillItem = {
    id: 's1',
    category: 'Theory IV',
    topic: 'Pitch-Class Sets',
    mastery: 50,
    totalAttempts: 10,
    correctAttempts: 5,
    lastPracticed: '',
    recentLatencyMs: [],
    errorHistory: [],
  };

  it('applies speed and low-confidence bonus for fast correct answer', () => {
    const attempt: PracticeAttempt = {
      skillId: 's1',
      isCorrect: true,
      confidenceRating: 1, // Low confidence -> bonus
      responseTimeMs: 2000, // < 4000ms -> speed bonus
      date: '2026-03-01',
    };

    const updated = updateSkillMastery(baseSkill, attempt);
    // Base +5, speed bonus +2, confidence bonus +3 = +10
    expect(updated.mastery).toBe(60);
    expect(updated.correctAttempts).toBe(6);
    expect(updated.recentLatencyMs).toContain(2000);
  });

  it('applies heavy penalty for overconfident incorrect answer', () => {
    const attempt: PracticeAttempt = {
      skillId: 's1',
      isCorrect: false,
      confidenceRating: 5, // Overconfident -> penalty
      responseTimeMs: 5000,
      errorType: 'Confused inversion',
      date: '2026-03-01',
    };

    const updated = updateSkillMastery(baseSkill, attempt);
    // Penalty -(8 + 6) = -14
    expect(updated.mastery).toBe(36);
    expect(updated.correctAttempts).toBe(5);
    expect(updated.errorHistory).toContain('Confused inversion');
  });

  it('computes category exam readiness metrics, labels, and top/weak topics', () => {
    const skills: SkillItem[] = [
      { id: '1', category: 'Theory IV', topic: 'Sets', mastery: 90, totalAttempts: 10, correctAttempts: 9, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
      { id: '2', category: 'Theory IV', topic: 'Vectors', mastery: 85, totalAttempts: 10, correctAttempts: 8, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
      { id: '3', category: 'Theory IV', topic: 'Matrix', mastery: 95, totalAttempts: 10, correctAttempts: 9, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
    ];

    const readiness = calculateExamReadiness(skills, 'Theory IV');
    expect(readiness.masteryPercentage).toBe(90);
    expect(readiness.readinessLabel).toBe('EXAM READY');
    expect(readiness.passingProbability).toBeGreaterThan(85);
    expect(readiness.strongestTopics[0]).toBe('Matrix');
  });

  it('returns default fallback readiness when category has no skills', () => {
    const readiness = calculateExamReadiness([], 'Class Piano IV');
    expect(readiness.masteryPercentage).toBe(0);
    expect(readiness.readinessLabel).toBe('LOW');
    expect(readiness.passingProbability).toBe(25);
  });
});

describe('evaluateMidiSequence Grading Tests', () => {
  it('handles empty target sequence gracefully', () => {
    const res = evaluateMidiSequence([], []);
    expect(res.score).toBe(100);
    expect(res.passed).toBe(true);
    expect(res.feedbackMessages).toContain('No target notes specified.');
  });

  it('evaluates missing notes when no notes are played', () => {
    const res = evaluateMidiSequence([], [60, 62, 64]);
    expect(res.score).toBe(0);
    expect(res.passed).toBe(false);
    expect(res.missedNotes.length).toBe(3);
    expect(res.feedbackMessages.some(f => f.includes('No notes played.'))).toBe(true);
  });

  it('evaluates extra notes played beyond target sequence with clear feedback', () => {
    const played: PlayedNoteEvent[] = [
      { midi: 60, timestampMs: 0 },
      { midi: 62, timestampMs: 500 },
      { midi: 64, timestampMs: 1000 },
      { midi: 65, timestampMs: 1500 },
      { midi: 67, timestampMs: 2000 },
    ];
    const target = [60, 62, 64];

    const res = evaluateMidiSequence(played, target);
    expect(res.extraNotes.length).toBe(2);
    expect(res.correctCount).toBe(3);
    expect(res.feedbackMessages.some(f => f.includes('Extra Notes (2)'))).toBe(true);
  });

  it('separates octave displacement from wrong pitch-class errors', () => {
    // Target: C4 (60), D4 (62), E4 (64)
    // Played: C5 (72, octave error), F4 (65, wrong pitch class), E4 (64)
    const played: PlayedNoteEvent[] = [
      { midi: 72, timestampMs: 0 },
      { midi: 65, timestampMs: 500 },
      { midi: 64, timestampMs: 1000 },
    ];
    const target = [60, 62, 64];

    const res = evaluateMidiSequence(played, target);
    expect(res.octaveErrors.length).toBe(1);
    expect(res.octaveErrors[0].expectedMidi).toBe(60);
    expect(res.octaveErrors[0].playedMidi).toBe(72);

    expect(res.wrongNotes.length).toBe(1);
    expect(res.wrongNotes[0].expectedMidi).toBe(62);
    expect(res.wrongNotes[0].playedMidi).toBe(65);

    expect(res.feedbackMessages.some(f => f.includes('Octave Displacement (1)'))).toBe(true);
    expect(res.feedbackMessages.some(f => f.includes('Wrong Notes (1)'))).toBe(true);
  });

  it('evaluates rhythm hesitations and rushed notes when timestamps exist', () => {
    // Target BPM = 100 -> 600ms per quarter note
    // Played intervals: 1500ms (hesitation, ratio 2.5), 100ms (rushed, ratio ~0.16)
    const played: PlayedNoteEvent[] = [
      { midi: 60, timestampMs: 0 },
      { midi: 62, timestampMs: 1500 }, // hesitation
      { midi: 64, timestampMs: 1600 }, // rushed
    ];
    const target = [60, 62, 64];

    const res = evaluateMidiSequence(played, target, 100);
    expect(res.timingErrors.length).toBe(2);
    expect(res.timingErrors.some(t => t.issue === 'hesitation')).toBe(true);
    expect(res.timingErrors.some(t => t.issue === 'rushed')).toBe(true);
    expect(res.feedbackMessages.some(f => f.includes('Rhythm / Tempo Issues'))).toBe(true);
  });
});
