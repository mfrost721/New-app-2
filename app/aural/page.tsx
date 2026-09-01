'use client';

import React, { useState, useEffect, useRef } from 'react';
import ScoreViewer from '@/components/ScoreViewer';
import { soundEngine } from '@/lib/audio/soundEngine';
import {
  autoCorrelate,
  PitchAnalysisResult,
  evaluateSungPitch,
  PitchEvaluationResult,
  getNoteNameWithOctave,
} from '@/lib/audio/pitchDetection';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import { Mic, Volume2, Check, AlertCircle, Square } from 'lucide-react';

export default function AuralPage() {
  const [activeTab, setActiveTab] = useState<'noteInKey' | 'chordsAnd64' | 'dictation' | 'sightSinging'>('noteInKey');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Note-in-key ladder state (Target: E4 / MIDI 64 = Mi in C Major)
  const targetDegree = 4; // chromatic semitone offset above C4 (0=C,2=D,4=E,5=F,...)
  const targetMidi = 64; // E4

  // Sight singing microphone pitch detection state
  const [isRecording, setIsRecording] = useState(false);
  const [pitchResult, setPitchResult] = useState<PitchAnalysisResult | null>(null);
  const [singingScore, setSingingScore] = useState<PitchEvaluationResult | null>(null);

  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectedPitchFramesRef = useRef<(PitchAnalysisResult | null)[]>([]);

  const stopRecordingAndCleanup = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(t => t.stop());
      activeStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        void audioCtxRef.current.close();
      } catch {
        // Safe catch
      }
      audioCtxRef.current = null;
    }
    setIsRecording(false);
  };

  // Cleanup media streams and scheduled audio on unmount or tab switch
  useEffect(() => {
    return () => {
      stopRecordingAndCleanup();
      soundEngine.stopAll();
    };
  }, []);

  // Cadence playback for Note-in-Key
  const playCadence = () => {
    soundEngine.stopAll();
    // Progression I - IV - V - I in C Major, then target note
    soundEngine.playProgression(
      [
        [60, 64, 67], // C
        [60, 65, 69], // F
        [59, 62, 67], // G
        [60, 64, 67], // C
      ],
      0.6
    );
    soundEngine.playNote(targetMidi, 1.2, 0.6, 2.6);
  };

  const handleMicStart = async () => {
    setMicError(null);
    setSingingScore(null);
    setPitchResult(null);
    collectedPitchFramesRef.current = [];

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone audio API is not supported in this browser context.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        stream.getTracks().forEach(t => t.stop());
        setMicError('Web Audio API is not supported in this browser.');
        return;
      }
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      setIsRecording(true);
      const buffer = new Float32Array(analyser.fftSize);

      recordingIntervalRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        const res = autoCorrelate(buffer, audioCtx.sampleRate, {
          clarityThreshold: 0.6,
          keyTonicPc: 0, // C Major context
        });
        collectedPitchFramesRef.current.push(res);
        if (res) {
          setPitchResult(res);
        }
      }, 100);

      // Record for 5 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        handleMicStop();
      }, 5000);
    } catch (err) {
      stopRecordingAndCleanup();
      const errObj = err as Error;
      if (errObj.name === 'NotAllowedError' || errObj.name === 'PermissionDeniedError') {
        setMicError('Microphone access was denied. Please allow microphone permissions to use Sight-Singing Studio.');
      } else if (errObj.name === 'NotFoundError' || errObj.name === 'DevicesNotFoundError') {
        setMicError('No microphone input device found.');
      } else {
        setMicError(`Microphone access error: ${errObj.message || 'Unable to open audio stream.'}`);
      }
    }
  };

  const handleMicStop = () => {
    const frames = [...collectedPitchFramesRef.current];
    stopRecordingAndCleanup();

    const evaluation = evaluateSungPitch(frames, targetMidi, {
      toleranceCents: 50,
      clarityThreshold: 0.6,
      minValidFrames: 3,
      allowOctaveShift: true,
    });

    setSingingScore(evaluation);

    if (evaluation.isCorrect) {
      handleRecordSuccess('a8', `Sight-singing evaluation passed! Grade: ${evaluation.totalScore}%`);
    } else {
      setFeedback(evaluation.feedback);
    }
  };

  const handleRecordSuccess = (skillId: string, customMsg?: string) => {
    const store = loadUserStore();
    recordPracticeAttemptInStore(store, {
      skillId,
      isCorrect: true,
      confidenceRating: 4,
      responseTimeMs: 2500,
      date: new Date().toISOString(),
    });
    setFeedback(customMsg || 'Correct! Mastery updated (+6 pts).');
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <Mic className="w-6 h-6 text-amber-400" />
            <span>Aural Skills IV & Sight-Singing Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ear training for 7th chords, 6/4 chord functions, secondary dominants, dictation, and real-time sung pitch analysis.
          </p>
        </div>

        {/* Tab Switcher */}
        <div role="tablist" aria-label="Aural skills drill sections" className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'noteInKey'}
            onClick={() => {
              stopRecordingAndCleanup();
              soundEngine.stopAll();
              setActiveTab('noteInKey');
            }}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'noteInKey' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Note-in-Key
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chordsAnd64'}
            onClick={() => {
              stopRecordingAndCleanup();
              soundEngine.stopAll();
              setActiveTab('chordsAnd64');
            }}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'chordsAnd64' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Chords & 6/4 Functions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dictation'}
            onClick={() => {
              stopRecordingAndCleanup();
              soundEngine.stopAll();
              setActiveTab('dictation');
            }}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'dictation' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Melodic Dictation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sightSinging'}
            onClick={() => {
              stopRecordingAndCleanup();
              soundEngine.stopAll();
              setActiveTab('sightSinging');
            }}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'sightSinging' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sight-Singing Studio
          </button>
        </div>
      </div>

      {feedback && (
        <div role="status" aria-live="polite" className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center space-x-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {micError && (
        <div role="alert" aria-live="assertive" className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* 1. NOTE IN KEY LADDER */}
      {activeTab === 'noteInKey' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Note-in-Key Solfege Ladder</h2>
              <p className="text-xs text-slate-400">Tonal key establishment followed by target pitch class identification.</p>
            </div>
            <button
              type="button"
              onClick={playCadence}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all"
            >
              <Volume2 className="w-4 h-4" />
              <span>Play Key Cadence + Note</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { degree: 0, solfege: 'Do (1)' },
              { degree: 2, solfege: 'Re (2)' },
              { degree: 4, solfege: 'Mi (3)' },
              { degree: 5, solfege: 'Fa (4)' },
              { degree: 7, solfege: 'Sol (5)' },
              { degree: 9, solfege: 'La (6)' },
              { degree: 11, solfege: 'Ti (7)' },
              { degree: 1, solfege: 'Di (♭2)' },
            ].map((item) => (
              <button
                type="button"
                key={item.degree}
                onClick={() => {
                  soundEngine.playNote(60 + item.degree, 0.8);
                  if (item.degree === targetDegree) {
                    handleRecordSuccess('a1', 'Correct! Target note was Mi.');
                  } else {
                    setFeedback(`Incorrect. Target note was Mi (3rd scale degree). You picked ${item.solfege}.`);
                  }
                }}
                className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-bold text-slate-200 hover:text-amber-400 transition-all"
              >
                {item.solfege}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. CHORDS & 6/4 FUNCTIONS */}
      {activeTab === 'chordsAnd64' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Second-Inversion (6/4) & Seventh Chord Trainer</h2>
              <p className="text-xs text-slate-400">Distinguish cadential 6/4 vs passing 6/4 vs pedal 6/4 aurally.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.stopAll();
                // Play Cadential 6/4 progression (I6/4 - V7 - I)
                soundEngine.playProgression(
                  [
                    [60, 64, 67], // I
                    [67, 72, 76], // I6/4
                    [67, 71, 74, 77], // V7
                    [60, 64, 67], // I
                  ],
                  0.75
                );
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Play Cadential 6/4 Progression</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Cadential 6/4', func: 'cadential' },
              { title: 'Passing 6/4', func: 'passing' },
              { title: 'Pedal / Neighbor 6/4', func: 'pedal' },
            ].map((item, i) => (
              <button
                type="button"
                key={i}
                onClick={() => {
                  if (item.func === 'cadential') {
                    handleRecordSuccess('a3', 'Correct! Progression features a Cadential 6/4 function.');
                  } else {
                    setFeedback(`Incorrect. Function played was Cadential 6/4.`);
                  }
                }}
                className="p-5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-sm font-bold text-slate-100 hover:border-amber-400/50 transition-all"
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. MELODIC DICTATION */}
      {activeTab === 'dictation' && (
        <div className="space-y-6">
          <ScoreViewer
            title="Melodic Dictation Prompt (4 Measures)"
            notes={[
              { pitch: 'C4', duration: 'quarter' },
              { pitch: 'D4', duration: 'quarter' },
              { pitch: 'E4', duration: 'quarter' },
              { pitch: 'C4', duration: 'quarter' },
            ]}
          />
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Listen & Transcribe Melody</h3>
              <p className="text-xs text-slate-400">Click below to hear prompt audio (C4 - D4 - E4 - C4).</p>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  soundEngine.stopAll();
                  soundEngine.playScale([60, 62, 64, 60], 0.6, 100);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs flex items-center space-x-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Melody Audio</span>
              </button>
              <button
                type="button"
                onClick={() => handleRecordSuccess('a6', 'Melodic dictation submission accepted!')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Submit Dictation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SIGHT-SINGING STUDIO */}
      {activeTab === 'sightSinging' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Live Microphone Sight-Singing Studio</h2>
              <p className="text-xs text-slate-400">
                Target Note: <span className="text-amber-400 font-bold">{getNoteNameWithOctave(targetMidi)} (Mi)</span>. Real-time pitch autocorrelation, cents deviation, and accuracy scoring.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => soundEngine.playNote(targetMidi, 1.5)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs flex items-center space-x-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Reference Target Note</span>
              </button>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleMicStart}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Recording (5s)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMicStop}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center space-x-2 animate-pulse"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop & Evaluate</span>
                </button>
              )}
            </div>
          </div>

          <ScoreViewer title="Target Sight-Singing Excerpt (Level IV - Single Target Note E4)" />

          {/* Real-time detected Pitch Display */}
          {pitchResult ? (
            <div role="status" aria-live="polite" className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">DETECTED PITCH</span>
                <span className="text-amber-400 font-bold text-base">{pitchResult.fullName}</span>
                <span className="text-slate-500 text-[10px] ml-1">({pitchResult.frequency} Hz)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SOLFÈGE / DEGREE</span>
                <span className="text-slate-100 font-bold text-sm">
                  {pitchResult.solfege} ({pitchResult.scaleDegree})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CENTS DEVIATION</span>
                <span
                  className={
                    Math.abs(pitchResult.centsDeviation) <= 15
                      ? 'text-emerald-400 font-bold text-sm'
                      : Math.abs(pitchResult.centsDeviation) <= 35
                      ? 'text-amber-400 font-bold text-sm'
                      : 'text-rose-400 font-bold text-sm'
                  }
                >
                  {pitchResult.centsDeviation > 0 ? `+${pitchResult.centsDeviation}` : pitchResult.centsDeviation} cents
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CLARITY / CONFIDENCE</span>
                <span className="text-sky-400 font-bold text-sm">{Math.round(pitchResult.clarity * 100)}%</span>
              </div>
            </div>
          ) : (
            isRecording && (
              <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 text-amber-400 text-xs text-center font-mono animate-pulse">
                Listening for vocal pitch... Please sing target note into microphone.
              </div>
            )
          )}

          {singingScore && (
            <div className="p-5 bg-slate-950 rounded-xl border border-amber-500/30 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Pitch Accuracy</div>
                  <div className="text-2xl font-black text-amber-400">{singingScore.pitchScore}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Rhythm & Stability</div>
                  <div className="text-2xl font-black text-sky-400">{singingScore.rhythmScore}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Overall Grade</div>
                  <div className="text-2xl font-black text-emerald-400">{singingScore.totalScore}%</div>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 text-center font-mono">
                {singingScore.feedback}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
