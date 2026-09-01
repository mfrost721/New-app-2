'use client';

import React, { useState } from 'react';
import PitchClassClock from '@/components/PitchClassClock';
import MatrixGrid from '@/components/MatrixGrid';
import ScoreViewer from '@/components/ScoreViewer';
import KeyboardVisualizer from '@/components/KeyboardVisualizer';
import { getNormalOrder, getPrimeForm, getIntervalVector, formatIntervalVector } from '@/lib/music/pitchClass';
import { buildScale, SCALE_DEFINITIONS, ModeName } from '@/lib/music/scalesAndModes';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import { Brain, Check, Clock } from 'lucide-react';

const SAMPLE_ROW = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
const SCORE_ANNOTATIONS = [
  { measure: 1, label: 'Octatonic Collection [0,1,3,4,6,7,9,10]' },
  { measure: 2, label: 'Secondary Dominant V7/V' },
];

export default function TheoryPage() {
  const [activeTab, setActiveTab] = useState<'setTheory' | 'matrixSpeedRun' | 'modes' | 'scoreAnalysis' | 'mockExam'>('setTheory');

  // Set Theory State
  const [selectedPcs, setSelectedPcs] = useState<number[]>([0, 1, 4]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Matrix Speed Run state
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [matrixResult, setMatrixResult] = useState<string | null>(null);

  // Mode Trainer state
  const currentMode: ModeName = 'Dorian';

  const togglePc = React.useCallback((pc: number) => {
    setSelectedPcs(prev =>
      prev.includes(pc) ? prev.filter(p => p !== pc) : [...prev, pc].sort((a, b) => a - b)
    );
  }, []);

  const currentNormal = React.useMemo(() => getNormalOrder(selectedPcs), [selectedPcs]);
  const currentPrime = React.useMemo(() => getPrimeForm(selectedPcs), [selectedPcs]);
  const currentVector = React.useMemo(() => getIntervalVector(selectedPcs), [selectedPcs]);
  const modeActiveMidis = React.useMemo(() => buildScale('C', currentMode).pitchClasses.map(pc => 60 + pc), [currentMode]);

  const handleRecordSuccess = (skillId: string) => {
    const store = loadUserStore();
    recordPracticeAttemptInStore(store, {
      skillId,
      isCorrect: true,
      confidenceRating: 4,
      responseTimeMs: 3000,
      date: new Date().toISOString(),
    });
    setFeedback('Success! Mastery updated (+6 pts).');
    setTimeout(() => setFeedback(null), 3000);
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
            Master 20th-century set theory, 12-tone matrices, symmetrical scales, and large formal analysis.
          </p>
        </div>

        {/* Tab Switcher */}
        <div role="tablist" aria-label="Theory drill sections" className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'setTheory'}
            onClick={() => setActiveTab('setTheory')}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'setTheory' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Pitch-Class Sets
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'matrixSpeedRun'}
            onClick={() => setActiveTab('matrixSpeedRun')}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'matrixSpeedRun' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Matrix Speed Run
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'modes'}
            onClick={() => setActiveTab('modes')}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'modes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Modes & Scales
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'scoreAnalysis'}
            onClick={() => setActiveTab('scoreAnalysis')}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'scoreAnalysis' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Score Arena
          </button>
        </div>
      </div>

      {feedback && (
        <div role="status" aria-live="polite" className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. SET THEORY LAB */}
      {activeTab === 'setTheory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Interactive Pitch-Class Clock</h2>
            <PitchClassClock selectedPcs={selectedPcs} onTogglePc={togglePc} />
            <p className="text-xs text-slate-400 text-center">Tap nodes to add or remove pitch classes from your set.</p>
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
                <span className="text-slate-400">Interval-Class Vector:</span>
                <span className="text-sky-400 font-bold">{formatIntervalVector(currentVector)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRecordSuccess('t1')}
              className="w-full py-3 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Log Set Calculation Practice
            </button>
          </div>
        </div>
      )}

      {/* 2. TWELVE-TONE MATRIX SPEED RUN */}
      {activeTab === 'matrixSpeedRun' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-100">Twelve-Tone Matrix Challenge</h2>
              <p className="text-xs text-slate-400">Find the requested row transformation for P0 = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6]</p>
            </div>
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Question: What is I7 first note?</span>
            </div>
          </div>

          <MatrixGrid p0Row={SAMPLE_ROW} showNotes={true} />

          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="text"
              aria-label="Row transformation answer"
              placeholder="Enter row transformation (e.g. 7)"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={() => {
                if (userAnswer === '7' || userAnswer === 'G') {
                  setMatrixResult('Correct! I7 begins on pitch class 7 (G).');
                  handleRecordSuccess('t3');
                } else {
                  setMatrixResult('Incorrect. I7 starts on index 7.');
                }
              }}
              className="px-5 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Submit
            </button>
          </div>

          {matrixResult && (
            <div className={`p-3 rounded-xl text-xs font-bold border ${matrixResult.startsWith('Correct') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              {matrixResult}
            </div>
          )}
        </div>
      )}

      {/* 3. MODES & SCALES */}
      {activeTab === 'modes' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100">Mode Identification Trainer</h2>
            <p className="text-xs text-slate-400">
              Listen to the mode and inspect the visual keyboard to identify its quality.
            </p>

            <KeyboardVisualizer
              activeMidis={modeActiveMidis}
              labelMode="note"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(SCALE_DEFINITIONS) as ModeName[]).slice(0, 8).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => {
                    if (mode === currentMode) {
                      setFeedback(`Correct! Scale is ${mode}.`);
                      handleRecordSuccess('t4');
                    } else {
                      setFeedback(`Incorrect. Scale is ${currentMode}.`);
                    }
                  }}
                  className={`p-3 min-h-[44px] rounded-xl border text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    mode === currentMode
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SCORE ARENA */}
      {activeTab === 'scoreAnalysis' && (
        <div className="space-y-6">
          <ScoreViewer
            title="Schoenberg Op. 19 Excerpt Analysis"
            annotations={SCORE_ANNOTATIONS}
          />

          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Analysis Prompt</h3>
            <p className="text-xs text-slate-400">
              Identify the harmonic structure present in Measure 1.
            </p>
            <button
              type="button"
              onClick={() => handleRecordSuccess('t5')}
              className="px-4 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Confirm Analysis (Octatonic)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
