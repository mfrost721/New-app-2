import { describe, it, expect } from 'vitest';
import {
  generateScaleNotes,
  generateArpeggioNotes,
  getPianoExercisesByLevel,
  createDynamicScaleExercise,
} from '../lib/music/pianoCurriculum';
import {
  evaluateMidiSequence,
  evaluateAudioPitchSequence,
  evaluateRubricGrading,
  PlayedNoteEvent,
} from '../lib/music/pianoGrading';
import {
  INITIAL_SKILLS,
  INITIAL_STATE,
  recordPracticeAttemptInStore,
} from '../lib/storage/store';

describe('Class Piano III & IV Curriculum', () => {
  it('contains valid curriculum exercises for both Class Piano III and IV', () => {
    const class3 = getPianoExercisesByLevel('Class Piano III');
    const class4 = getPianoExercisesByLevel('Class Piano IV');

    expect(class3.length).toBeGreaterThan(0);
    expect(class4.length).toBeGreaterThan(0);
  });

  it('generates correct multi-octave scale note sequences', () => {
    // C Major 2 octaves ascending + descending: 15 ascending + 14 descending = 29 notes
    const cMaj = generateScaleNotes('C', 'Major', 2, 60);
    expect(cMaj.length).toBe(29);
    expect(cMaj[0]).toBe(60); // C4
    expect(cMaj[14]).toBe(84); // C6
    expect(cMaj[28]).toBe(60); // C4

    // F# Harmonic Minor 2 octaves
    const fsHarm = generateScaleNotes('F#', 'Harmonic Minor', 2, 66);
    expect(fsHarm[0]).toBe(66); // F#4
    expect(fsHarm[6]).toBe(77); // E#5
    expect(fsHarm[7]).toBe(78); // F#5
  });

  it('generates correct arpeggio note sequences', () => {
    // C Major triad arpeggio 2 octaves (C, E, G, C, E, G, C) + descending = 13 notes
    const cArp = generateArpeggioNotes('C', 'major', 2, 60);
    expect(cArp.length).toBe(13);
    expect(cArp[0]).toBe(60);
    expect(cArp[1]).toBe(64);
    expect(cArp[2]).toBe(67);
    expect(cArp[3]).toBe(72);

    // Diminished 7th arpeggio
    const dDim7 = generateArpeggioNotes('D', 'diminished7', 2, 62);
    expect(dDim7[0]).toBe(62); // D
    expect(dDim7[1]).toBe(65); // F
    expect(dDim7[2]).toBe(68); // Ab
    expect(dDim7[3]).toBe(71); // B
  });

  it('creates dynamic scale exercises dynamically for any key and mode', () => {
    const dynamicEx = createDynamicScaleExercise('Ab', 'Melodic Minor', 'Class Piano IV', 2, 100);
    expect(dynamicEx.keySignature).toBe('Ab Melodic Minor');
    expect(dynamicEx.targetTempoBpm).toBe(100);
    expect(dynamicEx.targetNotes.length).toBe(29);
  });
});

describe('Class Piano Automated & Rubric Grading Engine', () => {
  it('correctly grades a perfect MIDI performance (100%)', () => {
    const targetNotes = [60, 62, 64, 65, 67, 69, 71, 72];
    const playedEvents: PlayedNoteEvent[] = targetNotes.map((midi, idx) => ({
      midi,
      timestampMs: idx * 600,
    }));

    const result = evaluateMidiSequence(playedEvents, targetNotes, 100, 'MIDI');
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(8);
    expect(result.wrongNotes.length).toBe(0);
    expect(result.missedNotes.length).toBe(0);
    expect(result.isAutomated).toBe(true);
  });

  it('identifies wrong notes, missed notes, extra notes, and octave errors', () => {
    const targetNotes = [60, 62, 64, 65];
    const playedEvents: PlayedNoteEvent[] = [
      { midi: 60, timestampMs: 0 },
      { midi: 63, timestampMs: 600 }, // wrong note (Eb instead of D)
      { midi: 76, timestampMs: 1200 }, // wrong octave (E5 instead of E4)
      { midi: 65, timestampMs: 1800 },
      { midi: 67, timestampMs: 2400 }, // extra note
    ];

    const result = evaluateMidiSequence(playedEvents, targetNotes, 100, 'MIDI');
    expect(result.passed).toBe(false);
    expect(result.wrongNotes.length).toBeGreaterThan(0);
    expect(result.extraNotes.length).toBe(1);
    expect(result.feedbackMessages.some(m => m.includes('Wrong Notes'))).toBe(true);
  });

  it('evaluates pitch detection audio sequence with audio transparency flag', () => {
    const targetNotes = [60, 62, 64];
    const detectedMidis = [60, 62, 64];

    const result = evaluateAudioPitchSequence(detectedMidis, targetNotes, 80);
    expect(result.score).toBe(100);
    expect(result.isAutomated).toBe(false);
    expect(result.inputMethod).toBe('Audio');
    expect(result.feedbackMessages.some(m => m.includes('[Audio Pitch Detection Note]'))).toBe(true);
  });

  it('computes transparent rubric scores cleanly', () => {
    const rubric = evaluateRubricGrading({
      noteAccuracy: 25,
      tempoRhythm: 20,
      techniqueFingering: 20,
      harmonyVoiceLeading: 25,
    });

    expect(rubric.totalScore).toBe(90);
    expect(rubric.gradeLabel).toBe('High Distinction');
    expect(rubric.categories.length).toBe(4);
  });
});

describe('Piano Progress & Storage Integration', () => {
  it('updates mastery and piano streaks upon recording practice attempts', () => {
    const state = { ...INITIAL_STATE };
    const initialSkill = INITIAL_SKILLS.find(s => s.id === 'p4_scale_eb_maj')!;
    const prevMastery = initialSkill.mastery;

    const updatedState = recordPracticeAttemptInStore(state, {
      skillId: 'p4_scale_eb_maj',
      isCorrect: true,
      confidenceRating: 5,
      responseTimeMs: 3500,
      date: new Date().toISOString(),
    });

    const updatedSkill = updatedState.skills.find(s => s.id === 'p4_scale_eb_maj')!;
    expect(updatedSkill.mastery).toBeGreaterThan(prevMastery);
    expect(updatedSkill.totalAttempts).toBe(initialSkill.totalAttempts + 1);
    expect(updatedSkill.correctAttempts).toBe(initialSkill.correctAttempts + 1);
    expect(updatedState.history.length).toBe(1);
  });
});
