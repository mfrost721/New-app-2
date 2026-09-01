'use client';

import React, { useState, useEffect, useRef } from 'react';
import PitchClassClock from '@/components/PitchClassClock';
import MatrixGrid from '@/components/MatrixGrid';
import ScoreViewer from '@/components/ScoreViewer';
import KeyboardVisualizer from '@/components/KeyboardVisualizer';
import { getNormalOrder, getPrimeForm, getIntervalVector, formatIntervalVector } from '@/lib/music/pitchClass';
import { getRowTransformation } from '@/lib/music/twelveTone';
import { buildScale, SCALE_DEFINITIONS, ModeName } from '@/lib/music/scalesAndModes';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import { soundEngine } from '@/lib/audio/soundEngine';
import { Brain, Check, Clock, RefreshCw, AlertCircle, Volume2 } from 'lucide-react';

export default function TheoryPage() {
  const [activeTab, setActiveTab] = useState<'setTheory' | 'matrixSpeedRun' | 'modes' | 'scoreAnalysis'>('setTheory');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Set Theory State
  const [selectedPcs, setSelectedPcs] = useState<number[]>([0, 1, 4]);

  // Matrix Speed Run State
  const sampleP0 = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
  const [speedRunPrompt, setSpeedRunPrompt] = useState<{ form: 'P' | 'I' | 'R' | 'RI'; index: number; targetNoteIdx: number }>({ form: 'I', index: 7, targetNoteIdx: 0 });
  const [userSpeedAnswer, setUserSpeedAnswer] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [speedRunScore, setSpeedRunScore] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mode Trainer state
  const modeList: ModeName[] = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian', 'Whole Tone'];
  const [targetMode, setTargetMode] = useState<ModeName>('Dorian');
  const [selectedModeAnswer, setSelectedModeAnswer] = useState<ModeName | null>(null);

  // Score Arena State
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('');
  const [analysisSubmitted, setAnalysisSubmitted] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const togglePc = (pc: number) => {
    setSelectedPcs(prev =>
      prev.includes(pc) ? prev.filter(p => p !== pc) : [...prev, pc].sort((a, b) => a - b)
    );
  };

  const currentNormal = getNormalOrder(selectedPcs);
  const currentPrime = getPrimeForm(selectedPcs);
  const currentVector = getIntervalVector(selectedPcs);

  // Matrix Speed Run Logic
  const startSpeedRun = () => {
    setTimeLeft(60);
    setSpeedRunScore(0);
    setIsTimerRunning(true);
    generateNextSpeedPrompt();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const generateNextSpeedPrompt = () => {
    const forms: ('P' | 'I' | 'R' | 'RI')[] = ['P', 'I', 'R', 'RI'];
    const form = forms[Math.floor(Math.random() * forms.length)];
    const index = Math.floor(Math.random() * 12);
    const targetNoteIdx = Math.floor(Math.random() * 12);
    setSpeedRunPrompt({ form, index, targetNoteIdx });
    setUserSpeedAnswer('');
  };

  const handleSpeedRunSubmit = () => {
    if (!isTimerRunning) return;
    const expectedRow = getRowTransformation(sampleP0, speedRunPrompt.form, speedRunPrompt.index);
    const expectedNote = expectedRow[speedRunPrompt.targetNoteIdx];

    const userNum = parseInt(userSpeedAnswer.trim(), 10);
    const isCorrect = userNum === expectedNote;

    recordPracticeAttemptInStore(loadUserStore(), {
      skillId: 't3',
      isCorrect,
      confidenceRating: 4,
      responseTimeMs: 2500,
      errorType: isCorrect ? undefined : `Selected ${userNum} instead of ${expectedNote} for ${speedRunPrompt.form}${speedRunPrompt.index}`,
      date: new Date().toISOString(),
    });

    if (isCorrect) {
      setSpeedRunScore(prev => prev + 1);
      setFeedback({ message: `Correct! ${speedRunPrompt.form}${speedRunPrompt.index}[${speedRunPrompt.targetNoteIdx}] = ${expectedNote}`, type: 'success' });
      generateNextSpeedPrompt();
    } else {
      setFeedback({ message: `Incorrect. Expected note was ${expectedNote}.`, type: 'error' });
    }
  };

  // Mode Trainer Logic
  const generateNewModePrompt = () => {
    const newMode = modeList[Math.floor(Math.random() * modeList.length)];
    setTargetMode(newMode);
    setSelectedModeAnswer(null);
    setFeedback(null);
  };

  const handleModeSubmit = (chosenMode: ModeName) => {
    setSelectedModeAnswer(chosenMode);
    const isCorrect = chosenMode === targetMode;

    recordPracticeAttemptInStore(loadUserStore(), {
      skillId: 't4',
      isCorrect,
      confidenceRating: 3,
      responseTimeMs: 3000,
      errorType: isCorrect ? undefined : `Chosen ${chosenMode} instead of ${targetMode}`,
      date: new Date().toISOString(),
    });

    if (isCorrect) {
      setFeedback({ message: `Correct! Scale is ${targetMode}.`, type: 'success' });
    } else {
      setFeedback({ message: `Incorrect. You chose ${chosenMode}, but scale was ${targetMode}.`, type: 'error' });
    }
  };

  // Score Arena Logic
  const handleScoreAnalysisSubmit = () => {
    setAnalysisSubmitted(true);
    const isCorrect = selectedAnalysis === 'Octatonic (W-H)';

    recordPracticeAttemptInStore(loadUserStore(), {
      skillId: 't5',
      isCorrect,
      confidenceRating: 3,
      responseTimeMs: 4000,
      errorType: isCorrect ? undefined : `Chosen ${selectedAnalysis} instead of Octatonic`,
      date: new Date().toISOString(),
    });

    if (isCorrect) {
      setFeedback({ message: 'Correct! Measure 1 features the Octatonic (W-H) collection [0,1,3,4,6,7,9,10].', type: 'success' });
    } else {
      setFeedback({ message: `Incorrect. You selected ${selectedAnalysis}. The correct collection is Octatonic (W-H).`, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <Brain className="w-6 h-6 text-amber-400" />
            <span>Music Theory IV Laboratory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Set theory, 12-tone serialism speed-run, mode identification, and score analysis.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('setTheory'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'setTheory' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Pitch-Class Sets
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('matrixSpeedRun'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'matrixSpeedRun' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Matrix Speed Run
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('modes'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'modes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Modes & Scales
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('scoreAnalysis'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'scoreAnalysis' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Score Arena
          </button>
        </div>
      </div>

      {/* Accessible Feedback Banner */}
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

      {/* 1. SET THEORY LAB */}
      {activeTab === 'setTheory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Interactive Pitch-Class Clock</h2>
            <PitchClassClock selectedPcs={selectedPcs} onTogglePc={togglePc} />
            <p className="text-xs text-slate-400 text-center">Tap nodes to add or remove pitch classes.</p>
          </div>

          <div className="space-y-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <h2 className="text-lg font-bold text-slate-100">Calculated Set Parameters</h2>

            <div className="space-y-3 font-mono text-sm">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Selected Set:</span>
                <span className="text-amber-400 font-bold">[{selectedPcs.join(', ')}]</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Normal Order:</span>
                <span className="text-amber-400 font-bold">[{currentNormal.join(', ')}]</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Prime Form:</span>
                <span className="text-emerald-400 font-bold">[{currentPrime.join(', ')}]</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Interval Vector:</span>
                <span className="text-sky-400 font-bold">{formatIntervalVector(currentVector)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TWELVE-TONE MATRIX SPEED RUN */}
      {activeTab === 'matrixSpeedRun' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Timed Twelve-Tone Matrix Speed Run</h2>
                <p className="text-xs text-slate-400">P0 = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6]. Find the requested pitch class integer!</p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time: {timeLeft}s</span>
                </div>
                <button
                  type="button"
                  onClick={startSpeedRun}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
                >
                  {isTimerRunning ? 'Restart Speed Run' : 'Start 60s Speed Run'}
                </button>
              </div>
            </div>

            {isTimerRunning && (
              <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold">Challenge Question:</span>
                  <div className="text-lg font-black text-amber-400 mt-0.5">
                    What is pitch class note #{speedRunPrompt.targetNoteIdx + 1} of row {speedRunPrompt.form}{speedRunPrompt.index}?
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-xs text-slate-400">Score:</span>
                  <div className="text-2xl font-black text-emerald-400">{speedRunScore}</div>
                </div>
              </div>
            )}

            {isTimerRunning && (
              <div className="flex space-x-3">
                <input
                  type="number"
                  min={0}
                  max={11}
                  placeholder="Enter integer (0-11)"
                  value={userSpeedAnswer}
                  onChange={(e) => setUserSpeedAnswer(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={handleSpeedRunSubmit}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Submit Answer
                </button>
              </div>
            )}

            {/* Matrix Display */}
            <MatrixGrid p0Row={sampleP0} showNotes={true} />
          </div>
        </div>
      )}

      {/* 3. MODES & SCALES */}
      {activeTab === 'modes' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Mode & Symmetrical Scale Identification</h2>
              <p className="text-xs text-slate-400">Inspect the scale degrees and select the correct mode name.</p>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  const pcs = buildScale('C', targetMode).pitchClasses;
                  soundEngine.playChord(pcs.map(p => 60 + p), 1.2, true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Scale</span>
              </button>
              <button
                type="button"
                onClick={generateNewModePrompt}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Prompt</span>
              </button>
            </div>
          </div>

          <KeyboardVisualizer
            activeMidis={buildScale('C', targetMode).pitchClasses.map(pc => 60 + pc)}
            labelMode="scaleDegree"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modeList.map((mode) => (
              <button
                type="button"
                key={mode}
                disabled={selectedModeAnswer !== null}
                onClick={() => handleModeSubmit(mode)}
                className={`p-3 border text-xs font-bold rounded-xl transition-all ${
                  selectedModeAnswer === mode
                    ? mode === targetMode
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-rose-950 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:text-amber-400'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. SCORE ARENA */}
      {activeTab === 'scoreAnalysis' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <ScoreViewer
            title="Formal Excerpt Analysis — Schoenberg Op. 19 No. 2"
            notes={[
              { pitch: 'G4', duration: 'quarter' },
              { pitch: 'B4', duration: 'quarter' },
              { pitch: 'D#5', duration: 'quarter' },
              { pitch: 'F#5', duration: 'quarter' },
            ]}
          />

          <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100">Analysis Prompt</h3>
            <p className="text-xs text-slate-400">
              Select the primary pitch-class collection or formal structure utilized in this excerpt:
            </p>

            <select
              value={selectedAnalysis}
              disabled={analysisSubmitted}
              onChange={(e) => setSelectedAnalysis(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="">-- Select Collection --</option>
              <option value="Dorian Mode">Dorian Mode</option>
              <option value="Octatonic (W-H)">Octatonic (W-H) Collection</option>
              <option value="Whole Tone Scale">Whole Tone Scale</option>
              <option value="Major Pentatonic">Major Pentatonic</option>
            </select>

            <button
              type="button"
              disabled={analysisSubmitted || !selectedAnalysis}
              onClick={handleScoreAnalysisSubmit}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50"
            >
              Submit Formal Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
