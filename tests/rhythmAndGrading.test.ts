import { describe, it, expect } from 'vitest';
import { updateSkillMastery, calculateExamReadiness, SkillItem, PracticeAttempt } from '../lib/adaptive/mastery';
import { getRhythmicSyllable, isSyncopated, COMMON_METERS } from '../lib/music/rhythm';

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

import { evaluateMidiSequence, PlayedNoteEvent } from '../lib/music/pianoGrading';

describe('Piano Automated Sequence Grading Engine', () => {
  it('handles empty target notes array gracefully', () => {
    const result = evaluateMidiSequence([], []);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.feedbackMessages).toContain('No target notes specified.');
  });

  it('evaluates completely correct MIDI note sequence', () => {
    const targetNotes = [60, 62, 64, 65]; // C4, D4, E4, F4
    const playedEvents: PlayedNoteEvent[] = [
      { midi: 60, timestampMs: 0 },
      { midi: 62, timestampMs: 300 },
      { midi: 64, timestampMs: 600 },
      { midi: 65, timestampMs: 900 },
    ];

    const result = evaluateMidiSequence(playedEvents, targetNotes, 100);
    expect(result.score).toBe(100);
    expect(result.correctCount).toBe(4);
    expect(result.wrongNotes.length).toBe(0);
    expect(result.missedNotes.length).toBe(0);
  });

  it('identifies octave errors vs wrong notes correctly', () => {
    const targetNotes = [60, 64]; // C4, E4
    const playedEvents: PlayedNoteEvent[] = [
      { midi: 72, timestampMs: 0 }, // C5 (12 semitones up -> octave error)
      { midi: 65, timestampMs: 300 }, // F4 (wrong note for E4)
    ];

    const result = evaluateMidiSequence(playedEvents, targetNotes);
    expect(result.octaveErrors.length).toBe(1);
    expect(result.octaveErrors[0].expectedMidi).toBe(60);
    expect(result.wrongNotes.length).toBe(2); // Both C5 (octave error) and F4 count as wrong notes
    expect(result.wrongNotes[1].expectedNote).toBe('E');
  });

  it('identifies missed notes when played sequence is truncated', () => {
    const targetNotes = [60, 62, 64, 65];
    const playedEvents: PlayedNoteEvent[] = [
      { midi: 60, timestampMs: 0 },
      { midi: 62, timestampMs: 300 },
    ];

    const result = evaluateMidiSequence(playedEvents, targetNotes);
    expect(result.correctCount).toBe(2);
    expect(result.missedNotes.length).toBe(2);
    expect(result.missedNotes[0].expectedMidi).toBe(64);
  });

  it('detects timing hesitations between notes', () => {
    const targetNotes = [60, 62];
    // Expected quarter note interval at 120 bpm is 500ms
    const playedEvents: PlayedNoteEvent[] = [
      { midi: 60, timestampMs: 0 },
      { midi: 62, timestampMs: 2500 }, // Huge 2.5s delay -> hesitation
    ];

    const result = evaluateMidiSequence(playedEvents, targetNotes, 120);
    expect(result.timingErrors.length).toBe(1);
    expect(result.timingErrors[0].issue).toBe('hesitation');
  });
});
