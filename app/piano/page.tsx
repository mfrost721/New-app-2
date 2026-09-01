'use client';

import React, { useState, useEffect, useRef } from 'react';
import KeyboardVisualizer from '@/components/KeyboardVisualizer';
import ScoreViewer from '@/components/ScoreViewer';
import { recordPracticeAttemptInStore, loadUserStore, UserStoreState } from '@/lib/storage/store';
import {
  CURRICULUM_EXERCISES,
  PianoExercise,
  PianoLevel,
  PianoCategory,
  getPianoExercisesByLevel,
  createDynamicScaleExercise
} from '@/lib/music/pianoCurriculum';
import {
  evaluateMidiSequence,
  evaluateRubricGrading,
  PlayedNoteEvent,
  DirectGradingResult,
  RubricGradingResult
} from '@/lib/music/pianoGrading';
import { autoCorrelate } from '@/lib/audio/pitchDetection';
import { soundEngine } from '@/lib/audio/soundEngine';
import {
  Piano, Clock, RotateCcw, Award, CheckCircle2,
  AlertTriangle, Mic, MicOff, Layers, BookOpen
} from 'lucide-react';

export default function PianoPage() {
  const [selectedLevel, setSelectedLevel] = useState<PianoLevel>('Class Piano IV');
  const [selectedCategory, setSelectedCategory] = useState<PianoCategory | 'all'>('all');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('p4_scale_eb_maj');

  const [inputMode, setInputMode] = useState<'MIDI' | 'Keyboard' | 'Audio'>('MIDI');
  const [userStore, setUserStore] = useState<UserStoreState | null>(null);

  // Dynamic Scale Builder states
  const [customKey, setCustomKey] = useState<string>('C');
  const [customScaleType, setCustomScaleType] = useState<'Major' | 'Natural Minor' | 'Harmonic Minor' | 'Melodic Minor'>('Major');

  // Performance tracking states
  const [playedEvents, setPlayedEvents] = useState<PlayedNoteEvent[]>([]);
  const [directResult, setDirectResult] = useState<DirectGradingResult | null>(null);
  const [rubricResult, setRubricResult] = useState<RubricGradingResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Audio mic states
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Rubric sliders state
  const [rubricAccuracy, setRubricAccuracy] = useState<number>(25);
  const [rubricTempo, setRubricTempo] = useState<number>(20);
  const [rubricTechnique, setRubricTechnique] = useState<number>(20);
  const [rubricHarmony, setRubricHarmony] = useState<number>(20);

  // Sight-reading timer state
  const [previewCountdown, setPreviewCountdown] = useState<number | null>(null);

  const stopMicListening = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        void audioContextRef.current.close();
      } catch {
        // Safe catch
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsMicListening(false);
  };

  useEffect(() => {
    setUserStore(loadUserStore());
    return () => {
      stopMicListening();
    };
  }, []);

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
        inputMode === 'Audio' ? 'Keyboard' : inputMode
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

  // Audio Microphone Stream Control
  const toggleMicListening = async () => {
    if (isMicListening) {
      stopMicListening();
      return;
    }

    stopMicListening();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        stream.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
        setStatusMessage('Web Audio API is not supported in this browser.');
        return;
      }

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsMicListening(true);
      setInputMode('Audio');

      const buffer = new Float32Array(analyser.fftSize);
      let lastDetectedMidi = -1;

      const processAudio = () => {
        if (!analyserRef.current || !audioContextRef.current || audioContextRef.current.state === 'closed') {
          return;
        }
        analyserRef.current.getFloatTimeDomainData(buffer);
        const pitch = autoCorrelate(buffer, audioCtx.sampleRate);

        if (pitch && pitch.clarity > 0.85 && pitch.midi !== lastDetectedMidi) {
          lastDetectedMidi = pitch.midi;
          soundEngine.playNote(pitch.midi);
          handleNoteClick(pitch.midi);
        }

        animFrameRef.current = requestAnimationFrame(processAudio);
      };

      processAudio();
    } catch {
      setStatusMessage('Microphone access denied or not supported in this browser environment.');
    }
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
        {/* Left Sidebar: Curriculum Exercises Catalog */}
        <div className="lg:col-span-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center space-x-1">
              <BookOpen className="w-4 h-4 mr-1" />
              <span>{selectedLevel} Modules</span>
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
              {filteredExercises.length} Drills
            </span>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1">
            {(['all', 'scales', 'arpeggios', 'chords_cadences', 'harmonization_transposition', 'sight_reading_rhythm', 'repertoire_project'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                  selectedCategory === cat ? 'bg-slate-700 text-amber-300 border border-slate-600' : 'text-slate-400 hover:text-slate-200 bg-slate-950/50'
                }`}
              >
                {cat === 'all' ? 'All' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Exercise Items List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredExercises.map(ex => {
              const isSelected = ex.id === selectedExerciseId;
              const skill = userStore?.skills.find(s => s.id === ex.id);
              const mastery = skill ? skill.mastery : 0;

              return (
                <button
                  key={ex.id}
                  onClick={() => handleSelectExercise(ex.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 text-slate-100 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold leading-tight">{ex.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 ml-2 shrink-0">
                      BPM {ex.targetTempoBpm}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                    <span className="capitalize">{ex.category.replace('_', ' ')}</span>
                    <span className={`font-mono font-bold ${mastery >= 80 ? 'text-emerald-400' : mastery >= 60 ? 'text-amber-400' : 'text-slate-500'}`}>
                      Mastery: {mastery}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Scale Generator Widget */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase text-sky-400 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 mr-1" />
              <span>Dynamic 12-Key Scale Generator</span>
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={customKey}
                onChange={e => {
                  setCustomKey(e.target.value);
                  setSelectedExerciseId(`dynamic_${e.target.value}_${customScaleType}`);
                }}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
              >
                {['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'].map(k => (
                  <option key={k} value={k}>{k} Key</option>
                ))}
              </select>
              <select
                value={customScaleType}
                onChange={e => {
                  setCustomScaleType(e.target.value as unknown as 'Major');
                  setSelectedExerciseId(`dynamic_${customKey}_${e.target.value}`);
                }}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
              >
                <option value="Major">Major</option>
                <option value="Natural Minor">Natural Minor</option>
                <option value="Harmonic Minor">Harmonic Minor</option>
                <option value="Melodic Minor">Melodic Minor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Main Panel: Active Exercise Workbench */}
        <div className="lg:col-span-8 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
          {/* Header Info */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentExercise.level}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {currentExercise.keySignature}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-100 mt-2">{currentExercise.title}</h2>
              <p className="text-xs text-slate-400 mt-1">{currentExercise.instructions}</p>
            </div>

            {/* Input Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMicListening}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 border transition-all ${
                  isMicListening
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {isMicListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isMicListening ? 'Stop Mic' : 'Audio Mic Mode'}</span>
              </button>

              <button
                onClick={handleClearBuffer}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                title="Reset Note Stream Buffer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drill Instructions & Fingering Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">Target Fingering & BPM</span>
              <p className="text-xs text-slate-200 font-mono">{currentExercise.standardFingering || 'Standard 1-2-3-1-2-3-4-5'}</p>
              <p className="text-[11px] text-slate-400 mt-1">Target Tempo: <strong className="text-slate-200">{currentExercise.targetTempoBpm} BPM</strong></p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-sky-400 tracking-wider">Pedagogy Explanation</span>
              <p className="text-xs text-slate-300 leading-relaxed">{currentExercise.explanation}</p>
            </div>
          </div>

          {/* Notation Score Preview */}
          {currentExercise.scoreNotation && (
            <ScoreViewer title={`Score Representation: ${currentExercise.title}`} />
          )}

          {/* Sight Reading Simulator Preview Timer */}
          {currentExercise.category === 'sight_reading_rhythm' && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-200">20-Second Observation Preview</span>
                <p className="text-[11px] text-slate-400">Observe score prior to strict non-stop performance execution.</p>
              </div>
              {previewCountdown === null ? (
                <button
                  onClick={startPreviewTimer}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Start 20s Preview</span>
                </button>
              ) : (
                <div className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-mono font-bold text-sm">
                  Timer: {previewCountdown}s
                </div>
              )}
            </div>
          )}

          {/* Interactive Keyboard Stream Visualizer */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Interactive Piano Keyboard (MIDI Input / Touch / Click)</span>
              <span className="font-mono text-amber-400">
                Played Notes Buffer: {playedEvents.length} / {currentExercise.targetNotes.length}
              </span>
            </div>
            <KeyboardVisualizer
              startMidi={48}
              numKeys={37}
              activeMidis={playedEvents.map(e => e.midi)}
              onNoteClick={handleNoteClick}
              labelMode="note"
            />
          </div>

          {/* Real-time MIDI Autograding Results Panel */}
          {directResult && (
            <div className={`p-5 rounded-xl border space-y-4 ${
              directResult.passed ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200' : 'bg-rose-500/10 border-rose-500/40 text-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {directResult.passed ? (
                    <Award className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  )}
                  <div>
                    <h3 className="text-base font-black text-slate-100">
                      Automated Sequence Evaluation: {directResult.score}%
                    </h3>
                    <p className="text-xs text-slate-400">
                      Input Method: {directResult.inputMethod} • Status: {directResult.passed ? 'PASSED (Mastery Standard)' : 'NEEDS PRACTICE'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCommitAttempt(directResult.score, directResult.passed, directResult.inputMethod)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  Commit Attempt to Progress
                </button>
              </div>

              {/* Diagnostic Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Correct Notes</span>
                  <span className="text-emerald-400 font-bold">{directResult.correctCount} / {directResult.totalTargetNotes}</span>
                </div>
                <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Wrong Notes</span>
                  <span className="text-rose-400 font-bold">{directResult.wrongNotes.length}</span>
                </div>
                <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Missed Notes</span>
                  <span className="text-amber-400 font-bold">{directResult.missedNotes.length}</span>
                </div>
                <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Timing Hesitations</span>
                  <span className="text-sky-400 font-bold">{directResult.timingErrors.length}</span>
                </div>
              </div>

              {/* Feedback Messages */}
              <div className="p-3 bg-slate-950 rounded-lg text-xs space-y-1">
                <span className="font-bold text-amber-400 block uppercase text-[10px]">Diagnostic Performance Feedback:</span>
                {directResult.feedbackMessages.map((msg, idx) => (
                  <p key={idx} className="text-slate-300">• {msg}</p>
                ))}
              </div>
            </div>
          )}

          {/* Transparent Rubric Certification Panel */}
          <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1">
                  <Award className="w-4 h-4 text-amber-400 mr-1" />
                  <span>Transparent Exam Rubric Certification</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Use rubric-based self-certification when automated input is non-polyphonic or audio-limited.
                </p>
              </div>
              <button
                onClick={handleEvaluateRubric}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs border border-slate-700"
              >
                Compute Rubric Score
              </button>
            </div>

            {/* Rubric Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Note Pitch Accuracy (0-25 pts):</span>
                  <span className="font-mono font-bold text-amber-400">{rubricAccuracy} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={rubricAccuracy}
                  onChange={e => setRubricAccuracy(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Tempo & Rhythm Consistency (0-25 pts):</span>
                  <span className="font-mono font-bold text-amber-400">{rubricTempo} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={rubricTempo}
                  onChange={e => setRubricTempo(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Standard Fingering & Technique (0-25 pts):</span>
                  <span className="font-mono font-bold text-amber-400">{rubricTechnique} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={rubricTechnique}
                  onChange={e => setRubricTechnique(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Harmony & Inversion Voicing (0-25 pts):</span>
                  <span className="font-mono font-bold text-amber-400">{rubricHarmony} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={rubricHarmony}
                  onChange={e => setRubricHarmony(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* Rubric Result Output */}
            {rubricResult && (
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-100">
                    Rubric Total: <strong className="text-amber-400">{rubricResult.totalScore} / 100</strong> ({rubricResult.gradeLabel})
                  </span>
                  <button
                    onClick={() => handleCommitAttempt(rubricResult.totalScore, rubricResult.totalScore >= 75, 'Rubric Self-Cert')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                  >
                    Certify Rubric Grade
                  </button>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  {rubricResult.feedback.map((f, idx) => (
                    <p key={idx}>• {f}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Student Mastery & Attempt Statistics */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center text-xs text-slate-300 gap-4">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Current Skill Status</span>
              <span className="font-bold text-slate-100">{currentExercise.title}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Total Attempts</span>
              <span className="font-mono font-bold">{skillItem ? skillItem.totalAttempts : 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Mastery Level</span>
              <span className="font-mono font-bold text-emerald-400">{skillItem ? skillItem.mastery : 0}%</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Piano Streak</span>
              <span className="font-mono font-bold text-amber-400">{userStore?.pianoStreak || 0} Days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
