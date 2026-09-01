'use client';

import React, { useState, useEffect, useRef } from 'react';
import ScoreViewer from '@/components/ScoreViewer';
import { soundEngine } from '@/lib/audio/soundEngine';
import { autoCorrelate, PitchAnalysisResult } from '@/lib/audio/pitchDetection';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import { Mic, Volume2, Check, RefreshCw, AlertCircle } from 'lucide-react';

export default function AuralPage() {
  const [activeTab, setActiveTab] = useState<'noteInKey' | 'chordsAnd64' | 'dictation' | 'sightSinging'>('noteInKey');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Note-in-key state
  const [noteInKeyTarget, setNoteInKeyTarget] = useState<{ degree: number; solfege: string; midi: number }>({ degree: 4, solfege: 'Mi (3)', midi: 64 });
  const [noteInKeySubmitted, setNoteInKeySubmitted] = useState<number | null>(null);

  // 6/4 Progression State
  const [sixFourTarget, setSixFourTarget] = useState<'cadential' | 'passing' | 'pedal'>('cadential');
  const [sixFourSubmitted, setSixFourSubmitted] = useState<string | null>(null);

  // Melodic Dictation State
  const targetDictation = ['C4', 'D4', 'E4', 'C4'];
  const [userDictationNotes, setUserDictationNotes] = useState<string[]>([]);
  const [dictationPlaybacks, setDictationPlaybacks] = useState(0);
  const [dictationSubmitted, setDictationSubmitted] = useState(false);

  // Sight Singing State
  const [isRecording, setIsRecording] = useState(false);
  const [detectedPitches, setDetectedPitches] = useState<string[]>([]);
  const [pitchResult, setPitchResult] = useState<PitchAnalysisResult | null>(null);
  const [singingScore, setSingingScore] = useState<{ pitch: number; continuity: number; total: number } | null>(null);

  // Cleanup Handles
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 1. Note-in-Key logic
  const degreesPool = [
    { degree: 0, solfege: 'Do (1)', midi: 60 },
    { degree: 2, solfege: 'Re (2)', midi: 62 },
    { degree: 4, solfege: 'Mi (3)', midi: 64 },
    { degree: 5, solfege: 'Fa (4)', midi: 65 },
    { degree: 7, solfege: 'Sol (5)', midi: 67 },
    { degree: 9, solfege: 'La (6)', midi: 69 },
    { degree: 11, solfege: 'Ti (7)', midi: 71 },
    { degree: 1, solfege: 'Di (♭2)', midi: 61 },
  ];

  const generateNewNoteInKeyPrompt = () => {
    const randomItem = degreesPool[Math.floor(Math.random() * degreesPool.length)];
    setNoteInKeyTarget(randomItem);
    setNoteInKeySubmitted(null);
    setFeedback(null);
  };

  const playCadence = () => {
    soundEngine.playChord([60, 64, 67], 0.6); // C
    setTimeout(() => soundEngine.playChord([60, 65, 69], 0.6), 600); // F
    setTimeout(() => soundEngine.playChord([59, 62, 67], 0.6), 1200); // G
    setTimeout(() => soundEngine.playChord([60, 64, 67], 0.8), 1800); // C
    setTimeout(() => soundEngine.playNote(noteInKeyTarget.midi, 1.2), 2600);
  };

  const handleNoteInKeySubmit = (selectedDegree: number) => {
    setNoteInKeySubmitted(selectedDegree);
    const isCorrect = selectedDegree === noteInKeyTarget.degree;

    recordPracticeAttemptInStore(loadUserStore(), {
      skillId: 'a1',
      isCorrect,
      confidenceRating: 3,
      responseTimeMs: 3000,
      errorType: isCorrect ? undefined : `Selected degree ${selectedDegree} instead of ${noteInKeyTarget.degree}`,
      date: new Date().toISOString(),
    });

    if (isCorrect) {
      setFeedback({ message: `Correct! The target note was indeed ${noteInKeyTarget.solfege}.`, type: 'success' });
    } else {
      setFeedback({ message: `Incorrect. You chose degree ${selectedDegree}, but the correct answer was ${noteInKeyTarget.solfege}.`, type: 'error' });
    }
  };

  // 2. 6/4 Progression Trainer
  const playSixFourProgression = () => {
    if (sixFourTarget === 'cadential') {
      soundEngine.playChord([60, 64, 67], 0.6);
      setTimeout(() => soundEngine.playChord([67, 72, 76], 0.8), 700);
      setTimeout(() => soundEngine.playChord([67, 71, 74, 77], 0.8), 1500);
      setTimeout(() => soundEngine.playChord([60, 64, 67], 1.0), 2300);
    } else if (sixFourTarget === 'passing') {
      soundEngine.playChord([60, 64, 67], 0.6);
      setTimeout(() => soundEngine.playChord([62, 65, 71], 0.8), 700);
      setTimeout(() => soundEngine.playChord([64, 67, 72], 1.0), 1500);
    } else {
      soundEngine.playChord([60, 64, 67], 0.6);
      setTimeout(() => soundEngine.playChord([60, 65, 69], 0.8), 700);
      setTimeout(() => soundEngine.playChord([60, 64, 67], 1.0), 1500);
    }
  };

  const handleSixFourSubmit = (choice: 'cadential' | 'passing' | 'pedal') => {
    setSixFourSubmitted(choice);
    const isCorrect = choice === sixFourTarget;

    recordPracticeAttemptInStore(loadUserStore(), {
      skillId: 'a3',
      isCorrect,
      confidenceRating: 3,
      responseTimeMs: 3500,
      errorType: isCorrect ? undefined : `Selected ${choice} 6/4 instead of ${sixFourTarget} 6/4`,
      date: new Date().toISOString(),
    });

    if (isCorrect) {
      setFeedback({ message: `Correct! Progression was ${sixFourTarget} 6/4.`, type: 'success' });
    } else {
      setFeedback({ message: `Incorrect. You selected ${choice} 6/4, but actual function was ${sixFourTarget} 6/4.`, type: 'error' });
    }
  };

  // 3. Melodic Dictation
  const handleDictationAddNote = (pitch: string) => {
    if (userDictationNotes.length < 4 && !dictationSubmitted) {
      setUserDictationNotes(prev => [...prev, pitch]);
    }
  };

  const handleDictationSubmit = () => {
    setDictationSubmitted(true);
    let pitchMatch = 0;
    userDictationNotes.forEach((note, idx) => {
      if (note === targetDictation[idx]) pitchMatch++;
    });

    const isCorrect = pitchMatch === 4 && userDictationNotes.length === 4;

    recordPracticeAttemptInStore(loadUserStore(), {
      skillId: 'a6',
      isCorrect,
      confidenceRating: 3,
      responseTimeMs: 8000,
      errorType: isCorrect ? undefined : `Dictation matched ${pitchMatch}/4 notes`,
      date: new Date().toISOString(),
    });

    if (isCorrect) {
      setFeedback({ message: 'Perfect dictation! All 4 notes matched target melody.', type: 'success' });
    } else {
      setFeedback({ message: `Dictation complete: ${pitchMatch}/4 notes correct. Target was C4 - D4 - E4 - C4.`, type: 'error' });
    }
  };

  // 4. Sight-Singing Mic Pitch Tracking
  const handleMicStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      setIsRecording(true);
      setDetectedPitches([]);
      setSingingScore(null);
      setFeedback(null);

      const buffer = new Float32Array(analyser.fftSize);
      const collectedNotes: string[] = [];

      intervalRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        const res = autoCorrelate(buffer, audioCtx.sampleRate);
        if (res && res.clarity > 0.5) {
          setPitchResult(res);
          if (!collectedNotes.includes(res.noteName)) {
            collectedNotes.push(res.noteName);
            setDetectedPitches(prev => [...prev.slice(-10), res.noteName]);
          }
        }
      }, 150);

      timerRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioCtxRef.current) audioCtxRef.current.close();
        setIsRecording(false);

        // Actual evaluation: check if target notes (C, E, G) were detected in microphone stream
        const targetPitches = ['C', 'E', 'G'];
        const matchedPitches = targetPitches.filter(p => collectedNotes.includes(p));
        const pitchScore = Math.round((matchedPitches.length / targetPitches.length) * 100);
        const continuityScore = collectedNotes.length >= 3 ? 90 : Math.round((collectedNotes.length / 3) * 80);
        const total = Math.round((pitchScore + continuityScore) / 2);

        const isCorrect = total >= 70;
        setSingingScore({ pitch: pitchScore, continuity: continuityScore, total });

        recordPracticeAttemptInStore(loadUserStore(), {
          skillId: 'a7',
          isCorrect,
          confidenceRating: 3,
          responseTimeMs: 5000,
          errorType: isCorrect ? undefined : `Sight singing score ${total}% (matched ${matchedPitches.length}/3 target notes)`,
          date: new Date().toISOString(),
        });

        if (isCorrect) {
          setFeedback({ message: `Sight-singing evaluation complete! Overall score: ${total}%.`, type: 'success' });
        } else {
          setFeedback({ message: `Sight-singing score ${total}%. Target notes were C, E, G. Practice tonal stability.`, type: 'error' });
        }
      }, 5000);
    } catch {
      setFeedback({ message: 'Microphone access denied or unavailable.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <Mic className="w-6 h-6 text-amber-400" />
            <span>Aural Skills IV Laboratory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Graded ear-training, 6/4 chord functions, melodic dictation, and sight-singing evaluation.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('noteInKey'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'noteInKey' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Note-in-Key
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('chordsAnd64'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'chordsAnd64' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            6/4 Functions
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('dictation'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'dictation' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Melodic Dictation
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('sightSinging'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'sightSinging' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sight-Singing Studio
          </button>
        </div>
      </div>

      {/* Accessible In-Page Status Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. NOTE IN KEY LADDER */}
      {activeTab === 'noteInKey' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Note-in-Key Solfege Drill</h2>
              <p className="text-xs text-slate-400">Listen to cadence and identify the scale degree.</p>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={playCadence}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Cadence + Target</span>
              </button>
              <button
                type="button"
                onClick={generateNewNoteInKeyPrompt}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Prompt</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {degreesPool.map((item) => (
              <button
                type="button"
                key={item.degree}
                disabled={noteInKeySubmitted !== null}
                onClick={() => handleNoteInKeySubmit(item.degree)}
                className={`p-4 border rounded-xl text-center text-xs font-bold transition-all ${
                  noteInKeySubmitted === item.degree
                    ? item.degree === noteInKeyTarget.degree
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-rose-950 border-rose-500 text-rose-300'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-amber-400'
                }`}
              >
                {item.solfege}
              </button>
            ))}
          </div>

          {noteInKeySubmitted !== null && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
              Actual Answer: <span className="text-amber-400 font-bold">{noteInKeyTarget.solfege}</span>
            </div>
          )}
        </div>
      )}

      {/* 2. CHORDS & 6/4 FUNCTIONS */}
      {activeTab === 'chordsAnd64' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Second-Inversion (6/4) Function Trainer</h2>
              <p className="text-xs text-slate-400">Identify harmonic function: Cadential, Passing, or Pedal 6/4.</p>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={playSixFourProgression}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Progression</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const options: ('cadential' | 'passing' | 'pedal')[] = ['cadential', 'passing', 'pedal'];
                  setSixFourTarget(options[Math.floor(Math.random() * options.length)]);
                  setSixFourSubmitted(null);
                  setFeedback(null);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Prompt</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 'cadential', label: 'Cadential 6/4' },
              { id: 'passing', label: 'Passing 6/4' },
              { id: 'pedal', label: 'Pedal / Neighbor 6/4' },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                disabled={sixFourSubmitted !== null}
                onClick={() => handleSixFourSubmit(item.id as 'cadential' | 'passing' | 'pedal')}
                className={`p-5 border rounded-xl text-center text-sm font-bold transition-all ${
                  sixFourSubmitted === item.id
                    ? item.id === sixFourTarget
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-rose-950 border-rose-500 text-rose-300'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {sixFourSubmitted !== null && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
              Actual Answer: <span className="text-amber-400 font-bold">{sixFourTarget.toUpperCase()} 6/4</span>
            </div>
          )}
        </div>
      )}

      {/* 3. MELODIC DICTATION */}
      {activeTab === 'dictation' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-100">4-Measure Melodic Dictation</h2>
                <p className="text-xs text-slate-400">Listen to melody and enter notes on interactive staff.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playNote(60, 0.5);
                  setTimeout(() => soundEngine.playNote(62, 0.5), 600);
                  setTimeout(() => soundEngine.playNote(64, 0.5), 1200);
                  setTimeout(() => soundEngine.playNote(60, 0.8), 1800);
                  setDictationPlaybacks(prev => prev + 1);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Melody ({dictationPlaybacks} played)</span>
              </button>
            </div>

            {/* Note Entry Buttons */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase">Enter Note Sequence:</span>
              <div className="flex space-x-2">
                {['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'].map((p) => (
                  <button
                    type="button"
                    key={p}
                    disabled={dictationSubmitted}
                    onClick={() => handleDictationAddNote(p)}
                    className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold rounded-lg text-xs"
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={dictationSubmitted}
                  onClick={() => setUserDictationNotes([])}
                  className="px-3 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold rounded-lg text-xs ml-auto"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs flex justify-between items-center">
              <span>Your Entry: [{userDictationNotes.join(', ') || 'Empty'}]</span>
              <button
                type="button"
                disabled={dictationSubmitted || userDictationNotes.length === 0}
                onClick={handleDictationSubmit}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50"
              >
                Submit Dictation
              </button>
            </div>

            {dictationSubmitted && (
              <ScoreViewer
                title="Actual Melody Solution"
                notes={[
                  { pitch: 'C4', duration: 'quarter' },
                  { pitch: 'D4', duration: 'quarter' },
                  { pitch: 'E4', duration: 'quarter' },
                  { pitch: 'C4', duration: 'quarter' },
                ]}
              />
            )}
          </div>
        </div>
      )}

      {/* 4. SIGHT-SINGING STUDIO */}
      {activeTab === 'sightSinging' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Sight-Singing Studio (Mic Autocorrelation)</h2>
              <p className="text-xs text-slate-400">Target Melody: C4 - E4 - G4. Sing into microphone.</p>
            </div>
            <button
              type="button"
              onClick={handleMicStart}
              disabled={isRecording}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isRecording ? 'Listening (5s)...' : 'Start Recording'}</span>
            </button>
          </div>

          <ScoreViewer
            title="Target Sight-Singing Excerpt (C Major Triad)"
            notes={[
              { pitch: 'C4', duration: 'half' },
              { pitch: 'E4', duration: 'half' },
              { pitch: 'G4', duration: 'whole' },
            ]}
          />

          {/* Real-time detected Pitch Display */}
          {pitchResult && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-slate-400">Detected Pitch: </span>
                <span className="text-amber-400 font-bold text-base">{pitchResult.noteName}</span>
                <span className="text-slate-400 ml-2">({pitchResult.frequency} Hz)</span>
              </div>
              <div>
                <span className="text-slate-400">Pitches Detected: </span>
                <span className="text-sky-400 font-bold">{detectedPitches.join(', ')}</span>
              </div>
            </div>
          )}

          {singingScore && (
            <div className="p-5 bg-slate-950 rounded-xl border border-amber-500/30 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Pitch Match</div>
                <div className="text-2xl font-black text-amber-400">{singingScore.pitch}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Continuity</div>
                <div className="text-2xl font-black text-sky-400">{singingScore.continuity}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Overall Grade</div>
                <div className={`text-2xl font-black ${singingScore.total >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {singingScore.total}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
