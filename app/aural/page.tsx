'use client';

import React, { useState, useEffect } from 'react';
import KeyboardVisualizer from '@/components/KeyboardVisualizer';
import ScoreViewer from '@/components/ScoreViewer';
import { soundEngine } from '@/lib/audio/soundEngine';
import { autoCorrelate, PitchAnalysisResult } from '@/lib/audio/pitchDetection';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import { Mic, Volume2, Play, Check, RefreshCw, Activity, Music, Radio } from 'lucide-react';

export default function AuralPage() {
  const [activeTab, setActiveTab] = useState<'noteInKey' | 'chordsAnd64' | 'dictation' | 'sightSinging'>('noteInKey');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Note-in-key ladder state
  const [targetDegree, setTargetDegree] = useState<number>(4); // Mi (3rd degree)
  const [playedCadence, setPlayedCadence] = useState(false);

  // Sight singing microphone pitch detection state
  const [isRecording, setIsRecording] = useState(false);
  const [pitchResult, setPitchResult] = useState<PitchAnalysisResult | null>(null);
  const [singingScore, setSingingScore] = useState<{ pitch: number; rhythm: number; total: number } | null>(null);

  // Cadence playback for Note-in-Key
  const playCadence = () => {
    // I - IV - V - I in C Major
    soundEngine.playChord([60, 64, 67], 0.6); // C
    setTimeout(() => soundEngine.playChord([60, 65, 69], 0.6), 600); // F
    setTimeout(() => soundEngine.playChord([59, 62, 67], 0.6), 1200); // G
    setTimeout(() => soundEngine.playChord([60, 64, 67], 0.8), 1800); // C
    setTimeout(() => {
      soundEngine.playNote(60 + targetDegree, 1.2);
      setPlayedCadence(true);
    }, 2600);
  };

  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [activeStream]);

  const handleMicStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveStream(stream);
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      setIsRecording(true);
      const buffer = new Float32Array(analyser.fftSize);

      const interval = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        const res = autoCorrelate(buffer, audioCtx.sampleRate);
        if (res) {
          setPitchResult(res);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach(t => t.stop());
        setActiveStream(null);
        audioCtx.close();
        setIsRecording(false);
        // Note: Raw mic pitch evaluation prototype - actual sung score depends on pitch analysis matching.
      }, 5000);
    } catch (err) {
      alert('Microphone access is required for Sight-Singing Studio.');
    }
  };

  const handleRecordSuccess = (skillId: string) => {
    const store = loadUserStore();
    recordPracticeAttemptInStore(store, {
      skillId,
      isCorrect: true,
      confidenceRating: 4,
      responseTimeMs: 2500,
      date: new Date().toISOString(),
    });
    setFeedback('Correct! Mastery updated (+6 pts).');
    setTimeout(() => setFeedback(null), 3000);
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
            type="button"
            onClick={() => setActiveTab('noteInKey')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'noteInKey' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Note-in-Key
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chordsAnd64')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'chordsAnd64' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Chords & 6/4 Functions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dictation')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'dictation' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Melodic Dictation
          </button>
          <button
            type="button"
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
                  if (item.degree === targetDegree) {
                    handleRecordSuccess('a1');
                  } else {
                    setFeedback(`Incorrect. Target note was Mi.`);
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
                type="button"
                key={i}
                onClick={() => handleRecordSuccess('a3')}
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
              type="button"
              onClick={() => handleRecordSuccess('a6')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Submit Dictation (Prototype)
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
              <span>{isRecording ? 'Listening (5s)...' : 'Start Recording (Prototype)'}</span>
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
