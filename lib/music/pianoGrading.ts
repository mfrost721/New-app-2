/**
 * Class Piano Automated & Rubric Grading Engine
 * Evaluates MIDI/Keyboard played note streams, microphone pitch data,
 * generates diagnostic error feedback, and provides transparent rubric grading.
 */

import { pitchClassToNote } from './pitchClass';

export interface PlayedNoteEvent {
  midi: number;
  timestampMs: number;
  velocity?: number;
}

export interface DirectGradingResult {
  score: number; // 0 - 100
  passed: boolean; // Score >= 80% (or exam threshold)
  isAutomated: boolean; // True for MIDI/Keyboard input, False for audio/self-cert
  inputMethod: 'MIDI' | 'Keyboard' | 'Audio' | 'Self-Certified';
  totalTargetNotes: number;
  totalPlayedNotes: number;
  correctCount: number;
  wrongNotes: { expectedMidi: number; expectedNote: string; playedMidi: number; playedNote: string; index: number }[];
  missedNotes: { expectedMidi: number; expectedNote: string; index: number }[];
  extraNotes: { playedMidi: number; playedNote: string; timestampMs: number }[];
  octaveErrors: { expectedMidi: number; playedMidi: number; index: number }[];
  timingErrors: { noteIndex: number; delayMs: number; issue: 'hesitation' | 'rushed' }[];
  feedbackMessages: string[];
  tempoBpmAchieved?: number;
}

export interface RubricCategoryScore {
  name: string; // e.g. 'Note Accuracy', 'Tempo & Rhythm', 'Technique & Fingering', 'Harmony & Voice Leading'
  maxPoints: number; // default 25
  score: number; // 0 to maxPoints
  comments: string;
}

export interface RubricGradingResult {
  totalScore: number; // 0 - 100
  categories: RubricCategoryScore[];
  gradeLabel: 'High Distinction' | 'Pass' | 'Needs Revision' | 'Unsatisfactory';
  feedback: string[];
}

/**
 * Evaluates a sequential stream of played MIDI notes against a target note sequence.
 */
export function evaluateMidiSequence(
  playedEvents: PlayedNoteEvent[],
  targetNotes: number[],
  targetBpm: number = 100,
  inputMethod: 'MIDI' | 'Keyboard' = 'MIDI'
): DirectGradingResult {
  if (targetNotes.length === 0) {
    return {
      score: 100,
      passed: true,
      isAutomated: true,
      inputMethod,
      totalTargetNotes: 0,
      totalPlayedNotes: playedEvents.length,
      correctCount: 0,
      wrongNotes: [],
      missedNotes: [],
      extraNotes: [],
      octaveErrors: [],
      timingErrors: [],
      feedbackMessages: ['No target notes specified.'],
    };
  }

  const wrongNotes: DirectGradingResult['wrongNotes'] = [];
  const missedNotes: DirectGradingResult['missedNotes'] = [];
  const extraNotes: DirectGradingResult['extraNotes'] = [];
  const octaveErrors: DirectGradingResult['octaveErrors'] = [];
  const timingErrors: DirectGradingResult['timingErrors'] = [];
  const feedbackMessages: string[] = [];

  let correctCount = 0;
  let playedIdx = 0;

  // Compare sequence using index alignment with tolerance for extra/missed notes
  for (let i = 0; i < targetNotes.length; i++) {
    const expected = targetNotes[i];
    const expectedPc = ((expected % 12) + 12) % 12;
    const expectedNote = pitchClassToNote(expectedPc);

    if (playedIdx >= playedEvents.length) {
      missedNotes.push({ expectedMidi: expected, expectedNote, index: i });
      continue;
    }

    const played = playedEvents[playedIdx];
    const playedPc = ((played.midi % 12) + 12) % 12;
    const playedNote = pitchClassToNote(playedPc);

    if (played.midi === expected) {
      correctCount++;
      playedIdx++;
    } else if (playedPc === expectedPc) {
      // Octave error: right pitch class, wrong octave
      octaveErrors.push({ expectedMidi: expected, playedMidi: played.midi, index: i });
      wrongNotes.push({ expectedMidi: expected, expectedNote, playedMidi: played.midi, playedNote, index: i });
      playedIdx++;
    } else {
      // Check if played note matches the *next* target note (skip/missed note scenario)
      if (i + 1 < targetNotes.length && played.midi === targetNotes[i + 1]) {
        missedNotes.push({ expectedMidi: expected, expectedNote, index: i });
        // Don't advance playedIdx yet so it matches targetNotes[i+1] in next iteration
      } else {
        // Wrong note played
        wrongNotes.push({ expectedMidi: expected, expectedNote, playedMidi: played.midi, playedNote, index: i });
        playedIdx++;
      }
    }
  }

  // Any remaining played notes count as extra notes
  while (playedIdx < playedEvents.length) {
    const extra = playedEvents[playedIdx];
    extraNotes.push({
      playedMidi: extra.midi,
      playedNote: pitchClassToNote(((extra.midi % 12) + 12) % 12),
      timestampMs: extra.timestampMs,
    });
    playedIdx++;
  }

  // Analyze timing intervals if timing information is present
  if (playedEvents.length > 1) {
    const expectedMsPerNote = (60 / targetBpm) * 1000;
    for (let k = 1; k < playedEvents.length; k++) {
      const deltaMs = playedEvents[k].timestampMs - playedEvents[k - 1].timestampMs;
      const ratio = deltaMs / expectedMsPerNote;

      if (ratio > 2.2) {
        timingErrors.push({ noteIndex: k, delayMs: Math.round(deltaMs), issue: 'hesitation' });
      } else if (ratio < 0.4 && deltaMs > 20) {
        timingErrors.push({ noteIndex: k, delayMs: Math.round(deltaMs), issue: 'rushed' });
      }
    }
  }

  // Calculate raw score out of 100
  const noteAccuracyRatio = Math.max(0, correctCount - (extraNotes.length * 0.5)) / targetNotes.length;
  let rawScore = Math.round(noteAccuracyRatio * 100);

  // Apply timing penalty if hesitations or rushing occurred frequently
  if (timingErrors.length > 0) {
    const timingPenalty = Math.min(20, timingErrors.length * 4);
    rawScore = Math.max(0, rawScore - timingPenalty);
  }

  const score = Math.min(100, Math.max(0, rawScore));
  const passed = score >= 80;

  // Construct detailed diagnostic feedback
  if (correctCount === targetNotes.length && extraNotes.length === 0 && timingErrors.length === 0) {
    feedbackMessages.push('Perfect Execution! Pitch accuracy, octave placement, and steady pulse all verified.');
  } else {
    if (wrongNotes.length > 0) {
      feedbackMessages.push(`Wrong Notes (${wrongNotes.length}): e.g., played ${wrongNotes[0].playedNote} instead of ${wrongNotes[0].expectedNote} at note position ${wrongNotes[0].index + 1}.`);
    }
    if (octaveErrors.length > 0) {
      feedbackMessages.push(`Octave Displacement (${octaveErrors.length}): correct pitch class played in wrong octave.`);
    }
    if (missedNotes.length > 0) {
      feedbackMessages.push(`Missed Notes (${missedNotes.length}): skipped required pitches in the sequence.`);
    }
    if (extraNotes.length > 0) {
      feedbackMessages.push(`Extra Notes (${extraNotes.length}): additional key presses detected.`);
    }
    if (timingErrors.length > 0) {
      const hesitations = timingErrors.filter(t => t.issue === 'hesitation').length;
      const rushed = timingErrors.filter(t => t.issue === 'rushed').length;
      feedbackMessages.push(`Rhythm / Tempo Issues: ${hesitations} hesitations, ${rushed} rushed note changes.`);
    }
  }

  return {
    score,
    passed,
    isAutomated: true,
    inputMethod,
    totalTargetNotes: targetNotes.length,
    totalPlayedNotes: playedEvents.length,
    correctCount,
    wrongNotes,
    missedNotes,
    extraNotes,
    octaveErrors,
    timingErrors,
    feedbackMessages,
    tempoBpmAchieved: targetBpm,
  };
}

/**
 * Evaluates pitch detection stream (Microphone Audio).
 */
export function evaluateAudioPitchSequence(
  detectedMidis: number[],
  targetNotes: number[],
  targetBpm: number = 80
): DirectGradingResult {
  const msPerNote = (60 / targetBpm) * 1000;
  const playedEvents: PlayedNoteEvent[] = detectedMidis.map((midi, i) => ({
    midi,
    timestampMs: i * msPerNote,
  }));

  const result = evaluateMidiSequence(playedEvents, targetNotes, targetBpm, 'Audio' as unknown as 'MIDI');
  return {
    ...result,
    isAutomated: false, // Audio pitch detection requires transparent acknowledgment
    inputMethod: 'Audio',
    feedbackMessages: [
      '[Audio Pitch Detection Note]: Polyphonic piano chords cannot be 100% autograded via microphone. Single line sequence evaluated.',
      ...result.feedbackMessages,
    ],
  };
}

/**
 * Evaluates transparent rubric-based grading for self-certified or complex performances.
 */
export function evaluateRubricGrading(
  scores: {
    noteAccuracy: number; // 0 to 25
    tempoRhythm: number; // 0 to 25
    techniqueFingering: number; // 0 to 25
    harmonyVoiceLeading: number; // 0 to 25
  },
  customComments?: {
    noteAccuracy?: string;
    tempoRhythm?: string;
    techniqueFingering?: string;
    harmonyVoiceLeading?: string;
  }
): RubricGradingResult {
  const noteAcc = Math.min(25, Math.max(0, scores.noteAccuracy));
  const tempoRhythm = Math.min(25, Math.max(0, scores.tempoRhythm));
  const technique = Math.min(25, Math.max(0, scores.techniqueFingering));
  const harmony = Math.min(25, Math.max(0, scores.harmonyVoiceLeading));

  const totalScore = noteAcc + tempoRhythm + technique + harmony;

  const categories: RubricCategoryScore[] = [
    {
      name: 'Note Accuracy & Pitch Sequence',
      maxPoints: 25,
      score: noteAcc,
      comments: customComments?.noteAccuracy || (noteAcc >= 20 ? 'Flawless pitch execution.' : 'Minor pitch errors or missed accidentals.'),
    },
    {
      name: 'Tempo & Rhythm Consistency',
      maxPoints: 25,
      score: tempoRhythm,
      comments: customComments?.tempoRhythm || (tempoRhythm >= 20 ? 'Maintained target BPM without restarts.' : 'Rhythmic hesitation observed.'),
    },
    {
      name: 'Technique & Standard Fingering',
      maxPoints: 25,
      score: technique,
      comments: customComments?.techniqueFingering || (technique >= 20 ? 'Clean thumb turns and wrist posture.' : 'Non-standard fingering used.'),
    },
    {
      name: 'Harmony, Inversions & Texture',
      maxPoints: 25,
      score: harmony,
      comments: customComments?.harmonyVoiceLeading || (harmony >= 20 ? 'Correct chord voicings and smooth resolution.' : 'Voice leading inversions incomplete.'),
    },
  ];

  let gradeLabel: RubricGradingResult['gradeLabel'] = 'Pass';
  if (totalScore >= 90) gradeLabel = 'High Distinction';
  else if (totalScore >= 75) gradeLabel = 'Pass';
  else if (totalScore >= 60) gradeLabel = 'Needs Revision';
  else gradeLabel = 'Unsatisfactory';

  const feedback: string[] = [
    `Overall Rubric Score: ${totalScore}/100 (${gradeLabel})`,
    ...categories.map(c => `${c.name}: ${c.score}/${c.maxPoints} pts - ${c.comments}`),
  ];

  return {
    totalScore,
    categories,
    gradeLabel,
    feedback,
  };
}
