'use client';

import { useEffect, useRef, useState } from 'react';
import ScoreViewer from '@/components/ScoreViewer';
import { soundEngine } from '@/lib/audio/soundEngine';
import { autoCorrelate, PitchAnalysisResult } from '@/lib/audio/pitchDetection';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import { Mic, Volume2, Check } from 'lucide-react';

export default function AuralPage() {
  const [activeTab, setActiveTab] = useState<'noteInKey' | 'chordsAnd64' | 'dictation' | 'sightSinging'>('noteInKey');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Note-in-key ladder state
  const targetDegree = 4; // Mi (3rd degree)

  // Sight singing microphone pitch detection state
  const [isRecording, setIsRecording] = useState(false);
  const [pitchResult, setPitchResult] = useState<PitchAnalysisResult | null>(null);
  const [singingScore, setSingingScore] = useState<{ pitch: number; rhythm: number; total: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validPitchFramesRef = useRef(0);
  const analyzedFramesRef = useRef(0);
  const absoluteCentsRef = useRef<number[]>([]);

  // Cadence playback for Note-in-Key
  const playCadence = () => {
    // I - IV - V - I in C Major
    soundEngine.playChord([60, 64, 67], 0.6); // C
    setTimeout(() => soundEngine.playChord([60, 65, 69], 0.6), 600); // F
    setTimeout(() => soundEngine.playChord([59, 62, 67], 0.6), 1200); // G
    setTimeout(() => soundEngine.playChord([60, 64, 67], 0.8), 1800); // C
    setTimeout(() => {
      soundEngine.playNote(60 + targetDegree, 1.2);
    }, 2600);
  };

  const cleanupMicResources = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupMicResources();
    };
  }, []);

  const recordAttempt = (skillId: string, isCorrect: boolean, responseTimeMs: number) => {
    const store = loadUserStore();
    recordPracticeAttemptInStore(store, {
      skillId,
      isCorrect,
      confidenceRating: isCorrect ? 4 : 2,
      responseTimeMs,
      date: new Date().toISOString(),
    });
    setFeedback(isCorrect ? 'Correct! Mastery updated.' : 'Logged as incorrect attempt. Keep practicing.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleMicStart = async () => {
    if (isRecording) return;
    try {
      cleanupMicResources();
      setPitchResult(null);
      setSingingScore(null);
      validPitchFramesRef.current = 0;
      analyzedFramesRef.current = 0;
      absoluteCentsRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      streamRef.current = stream;
      audioContextRef.current = audioCtx;

      setIsRecording(true);
      const buffer = new Float32Array(analyser.fftSize);

      intervalRef.current = setInterval(() => {
        analyzedFramesRef.current += 1;
        analyser.getFloatTimeDomainData(buffer);
        const res = autoCorrelate(buffer, audioCtx.sampleRate);
        if (res) {
          validPitchFramesRef.current += 1;
          absoluteCentsRef.current.push(Math.abs(res.centsDeviation));
          setPitchResult(res);
        }
      }, 100);

      timeoutRef.current = setTimeout(() => {
        cleanupMicResources();
        setIsRecording(false);

        const analyzedFrames = analyzedFramesRef.current;
        const validFrames = validPitchFramesRef.current;
        const avgAbsCents = absoluteCentsRef.current.length
          ? absoluteCentsRef.current.reduce((sum, n) => sum + n, 0) / absoluteCentsRef.current.length
          : 100;
        const pitchScore = Math.max(0, Math.min(100, Math.round(100 - avgAbsCents * 2.5)));
        const rhythmScore = analyzedFrames > 0
          ? Math.max(0, Math.min(100, Math.round((validFrames / analyzedFrames) * 100)))
          : 0;
        const total = Math.round((pitchScore * 0.7) + (rhythmScore * 0.3));
        setSingingScore({ pitch: pitchScore, rhythm: rhythmScore, total });

        const isCorrect = total >= 70;
        recordPracticeAttemptInStore(loadUserStore(), {
          skillId: 'a7',
          isCorrect,
          confidenceRating: isCorrect ? 4 : 2,
          responseTimeMs: 5000,
          date: new Date().toISOString(),
        });
        setFeedback(isCorrect ? 'Sight-singing passed and recorded.' : 'Sight-singing attempt recorded as incomplete.');
        setTimeout(() => setFeedback(null), 3000);
      }, 5000);
    } catch {
      cleanupMicResources();
      setIsRecording(false);
      alert('Microphone access is required for Sight-Singing Studio.');
    }
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
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('noteInKey')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'noteInKey' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Note-in-Key
          </button>
          <button
            onClick={() => setActiveTab('chordsAnd64')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'chordsAnd64' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Chords & 6/4 Functions
          </button>
          <button
            onClick={() => setActiveTab('dictation')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'dictation' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Melodic Dictation
          </button>
          <button
            onClick={() => setActiveTab('sightSinging')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'sightSinging' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sight-Singing Studio
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
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
                key={item.degree}
                onClick={() => {
                  if (item.degree === targetDegree) {
                    recordAttempt('a1', true, 2500);
                  } else {
                    recordAttempt('a1', false, 2500);
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
              onClick={() => {
                // Play Cadential 6/4 progression (I6/4 - V7 - I)
                soundEngine.playChord([60, 64, 67], 0.6); // I
                setTimeout(() => soundEngine.playChord([67, 72, 76], 0.8), 700); // I6/4
                setTimeout(() => soundEngine.playChord([67, 71, 74, 77], 0.8), 1500); // V7
                setTimeout(() => soundEngine.playChord([60, 64, 67], 1.0), 2300); // I
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Play Progression</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['Cadential 6/4', 'Passing 6/4', 'Pedal / Neighbor 6/4'].map((func, i) => (
              <button
                key={i}
                onClick={() => {
                  const isCorrect = window.confirm(`Mark "${func}" as your correct identification?`);
                  recordAttempt('a3', isCorrect, 3000);
                }}
                className="p-5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-sm font-bold text-slate-100 hover:border-amber-400/50 transition-all"
              >
                {func}
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
              <h3 className="text-sm font-bold text-slate-100">Playback Remaining: 3/3</h3>
              <p className="text-xs text-slate-400">Listen to melody and enter notes on interactive staff.</p>
            </div>
            <button
              onClick={() => {
                const isCorrect = window.confirm('Did your submitted dictation match the target melody?');
                recordAttempt('a6', isCorrect, 4000);
              }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Submit Dictation
            </button>
          </div>
        </div>
      )}

      {/* 4. SIGHT-SINGING STUDIO */}
      {activeTab === 'sightSinging' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Live Microphone Sight-Singing Studio</h2>
              <p className="text-xs text-slate-400">Real-time pitch autocorrelation, cents deviation, and accuracy scoring.</p>
            </div>
            <button
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

          <ScoreViewer title="Target Sight-Singing Excerpt (Level IV)" />

          {/* Real-time detected Pitch Display */}
          {pitchResult && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-slate-400">Detected Pitch: </span>
                <span className="text-amber-400 font-bold text-base">{pitchResult.noteName}</span>
                <span className="text-slate-400 ml-2">({pitchResult.frequency} Hz)</span>
              </div>
              <div>
                <span className="text-slate-400">Cents Deviation: </span>
                <span className={Math.abs(pitchResult.centsDeviation) < 15 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {pitchResult.centsDeviation > 0 ? `+${pitchResult.centsDeviation}` : pitchResult.centsDeviation} cents
                </span>
              </div>
            </div>
          )}

          {singingScore && (
            <div className="p-5 bg-slate-950 rounded-xl border border-amber-500/30 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Pitch Accuracy</div>
                <div className="text-2xl font-black text-amber-400">{singingScore.pitch}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Rhythm & Continuity</div>
                <div className="text-2xl font-black text-sky-400">{singingScore.rhythm}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Overall Grade</div>
                <div className="text-2xl font-black text-emerald-400">{singingScore.total}%</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
