'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { recordPracticeAttemptInStore, loadUserStore, UserStoreState } from '@/lib/storage/store';
import {
  CURRICULUM_EXERCISES,
  PianoExercise,
  PianoLevel,
  PianoCategory,
  getPianoExercisesByLevel,
  createDynamicScaleExercise,
} from '@/lib/music/pianoCurriculum';
import {
  evaluateMidiSequence,
  evaluateRubricGrading,
  PlayedNoteEvent,
  DirectGradingResult,
  RubricGradingResult,
} from '@/lib/music/pianoGrading';
import PianoExercisePicker from '@/components/PianoExercisePicker';
import MidiPerformancePanel from '@/components/MidiPerformancePanel';
import { Piano, CheckCircle2 } from 'lucide-react';

function PianoContent() {
  const searchParams = useSearchParams();

  const [selectedLevel, setSelectedLevel] = useState<PianoLevel>('Class Piano IV');
  const [selectedCategory, setSelectedCategory] = useState<PianoCategory | 'all'>('all');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('p4_scale_eb_maj');

  const [userStore, setUserStore] = useState<UserStoreState | null>(null);

  // Dynamic Scale Builder states
  const [customKey, setCustomKey] = useState<string>('C');
  const [customScaleType, setCustomScaleType] = useState<'Major' | 'Natural Minor' | 'Harmonic Minor' | 'Melodic Minor'>('Major');

  // Performance tracking states
  const [playedEvents, setPlayedEvents] = useState<PlayedNoteEvent[]>([]);
  const [directResult, setDirectResult] = useState<DirectGradingResult | null>(null);
  const [rubricResult, setRubricResult] = useState<RubricGradingResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Rubric sliders state
  const [rubricAccuracy, setRubricAccuracy] = useState<number>(25);
  const [rubricTempo, setRubricTempo] = useState<number>(20);
  const [rubricTechnique, setRubricTechnique] = useState<number>(20);
  const [rubricHarmony, setRubricHarmony] = useState<number>(20);

  // Sight-reading timer state
  const [previewCountdown, setPreviewCountdown] = useState<number | null>(null);

  useEffect(() => {
    setUserStore(loadUserStore());
  }, []);

  // Deep link handling
  useEffect(() => {
    const skillParam = searchParams.get('skill') || searchParams.get('exercise');
    const categoryParam = searchParams.get('category');

    if (skillParam) {
      const match = CURRICULUM_EXERCISES.find(ex => ex.id === skillParam);
      if (match) {
        setSelectedLevel(match.level);
        setSelectedExerciseId(match.id);
        if (categoryParam && ['scales', 'arpeggios', 'chords_cadences', 'harmonization_transposition', 'sight_reading_rhythm', 'repertoire_project'].includes(categoryParam)) {
          setSelectedCategory(categoryParam as PianoCategory);
        }
      } else {
        setSelectedExerciseId(skillParam);
      }
    } else if (categoryParam && ['all', 'scales', 'arpeggios', 'chords_cadences', 'harmonization_transposition', 'sight_reading_rhythm', 'repertoire_project'].includes(categoryParam)) {
      setSelectedCategory(categoryParam as PianoCategory | 'all');
    }
  }, [searchParams]);

  // Filter exercises
  let currentExercise: PianoExercise | undefined;
  if (selectedExerciseId.startsWith('dynamic_')) {
    currentExercise = createDynamicScaleExercise(customKey, customScaleType, selectedLevel);
  } else {
    currentExercise = CURRICULUM_EXERCISES.find(ex => ex.id === selectedExerciseId);
  }

  if (!currentExercise) {
    currentExercise = CURRICULUM_EXERCISES[0];
  }

  const exercisesForLevel = getPianoExercisesByLevel(selectedLevel);
  const filteredExercises = selectedCategory === 'all'
    ? exercisesForLevel
    : exercisesForLevel.filter(ex => ex.category === selectedCategory);

  // Reset attempt buffer when exercise changes
  const handleSelectExercise = (id: string) => {
    setSelectedExerciseId(id);
    setPlayedEvents([]);
    setDirectResult(null);
    setRubricResult(null);
    setStatusMessage(null);
  };

  // Keyboard note press handler
  const handleNoteClick = (midi: number) => {
    const event: PlayedNoteEvent = {
      midi,
      timestampMs: Date.now(),
    };
    const newEvents = [...playedEvents, event];
    setPlayedEvents(newEvents);

    // Auto-evaluate when note count reaches or exceeds target length
    if (currentExercise && newEvents.length >= currentExercise.targetNotes.length) {
      const result = evaluateMidiSequence(
        newEvents,
        currentExercise.targetNotes,
        currentExercise.targetTempoBpm,
        'Keyboard'
      );
      setDirectResult(result);
    }
  };

  const handleClearBuffer = () => {
    setPlayedEvents([]);
    setDirectResult(null);
    setRubricResult(null);
    setStatusMessage(null);
  };

  const startPreviewTimer = () => {
    setPreviewCountdown(20);
    const interval = setInterval(() => {
      setPreviewCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Record practice attempt in state store
  const handleCommitAttempt = (score: number, isPassed: boolean, method: string) => {
    if (!userStore || !currentExercise) return;

    const updated = recordPracticeAttemptInStore(userStore, {
      skillId: currentExercise.id,
      isCorrect: isPassed,
      confidenceRating: score >= 90 ? 5 : score >= 75 ? 4 : 2,
      responseTimeMs: Math.max(1000, playedEvents.length * 600),
      errorType: isPassed ? undefined : (directResult?.wrongNotes.length ? 'Wrong Notes' : 'Rhythm/Timing Issue'),
      date: new Date().toISOString(),
    });

    setUserStore(updated);
    setStatusMessage(`Attempt saved! Progress recorded using ${method} (Score: ${score}%).`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Rubric evaluation handler
  const handleEvaluateRubric = () => {
    const res = evaluateRubricGrading({
      noteAccuracy: rubricAccuracy,
      tempoRhythm: rubricTempo,
      techniqueFingering: rubricTechnique,
      harmonyVoiceLeading: rubricHarmony,
    });
    setRubricResult(res);
  };

  const skillItem = userStore?.skills.find(s => s.id === currentExercise?.id);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <Piano className="w-7 h-7 text-amber-400" />
            <span>Class Piano Proficiency Lab</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Exam-oriented piano curriculum (Class Piano III & IV), hardware Web MIDI note stream autograding, microphone pitch analysis, and transparent rubric certification.
          </p>
        </div>

        {/* Level Switcher */}
        <div className="flex space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedLevel('Class Piano III')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedLevel === 'Class Piano III' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Class Piano III Curriculum
          </button>
          <button
            onClick={() => setSelectedLevel('Class Piano IV')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedLevel === 'Class Piano IV' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Class Piano IV Proficiency
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Grid Layout: Sidebar Exercises + Main Practice Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <PianoExercisePicker
            selectedLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            filteredExercises={filteredExercises}
            selectedExerciseId={selectedExerciseId}
            onSelectExercise={handleSelectExercise}
            userStore={userStore}
            customKey={customKey}
            onCustomKeyChange={(k) => {
              setCustomKey(k);
              setSelectedExerciseId(`dynamic_${k}_${customScaleType}`);
            }}
            customScaleType={customScaleType}
            onCustomScaleTypeChange={(st) => {
              setCustomScaleType(st);
              setSelectedExerciseId(`dynamic_${customKey}_${st}`);
            }}
          />
        </div>

        <div className="lg:col-span-8">
          <MidiPerformancePanel
            currentExercise={currentExercise}
            playedEvents={playedEvents}
            directResult={directResult}
            onNoteClick={handleNoteClick}
            onClearBuffer={handleClearBuffer}
            previewCountdown={previewCountdown}
            onStartPreviewTimer={startPreviewTimer}
            onCommitDirectAttempt={handleCommitAttempt}
            rubricProps={{
              rubricAccuracy,
              onRubricAccuracyChange: setRubricAccuracy,
              rubricTempo,
              onRubricTempoChange: setRubricTempo,
              rubricTechnique,
              onRubricTechniqueChange: setRubricTechnique,
              rubricHarmony,
              onRubricHarmonyChange: setRubricHarmony,
              rubricResult,
              onEvaluateRubric: handleEvaluateRubric,
              onCommitRubric: (score, isPassed) => handleCommitAttempt(score, isPassed, 'Rubric Self-Cert'),
            }}
            skillItem={skillItem}
            pianoStreak={userStore?.pianoStreak || 0}
          />
        </div>
      </div>
    </div>
  );
}

export default function PianoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Piano Laboratory...</div>}>
      <PianoContent />
    </Suspense>
  );
}
