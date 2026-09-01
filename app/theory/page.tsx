'use client';

import React, { useState, useMemo } from 'react';
import PitchClassClock from '@/components/PitchClassClock';
import MatrixGrid from '@/components/MatrixGrid';
import ScoreViewer from '@/components/ScoreViewer';
import KeyboardVisualizer from '@/components/KeyboardVisualizer';
import { getNormalOrder, getPrimeForm, getIntervalVector, formatIntervalVector } from '@/lib/music/pitchClass';
import { buildScale, SCALE_DEFINITIONS, ModeName } from '@/lib/music/scalesAndModes';
import {
  generateDrillQuestion,
  validateDrillAnswer,
  DrillCategory,
  DrillDifficulty,
  AnswerValidationResult,
} from '@/lib/music/drillEngine';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import { Brain, Check, Clock, Sparkles, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';

export default function TheoryPage() {
  const [activeTab, setActiveTab] = useState<'drills' | 'setTheory' | 'matrixSpeedRun' | 'modes' | 'scoreAnalysis'>('drills');

  // Drill Runner state
  const [drillCategory, setDrillCategory] = useState<DrillCategory>('tonal');
  const [drillDifficulty, setDrillDifficulty] = useState<DrillDifficulty>(1);
  const [seedInput, setSeedInput] = useState<number>(42);
  const [userDrillInput, setUserDrillInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<AnswerValidationResult | null>(null);

  // Set Theory State
  const [selectedPcs, setSelectedPcs] = useState<number[]>([0, 1, 4]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Matrix Speed Run state
  const sampleRow = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [matrixResult, setMatrixResult] = useState<string | null>(null);

  // Mode Trainer state
  const currentMode: ModeName = 'Dorian';

  // Current Drill Question generated deterministically
  const currentDrillQuestion = useMemo(() => {
    return generateDrillQuestion(drillCategory, drillDifficulty, seedInput);
  }, [drillCategory, drillDifficulty, seedInput]);

  const togglePc = (pc: number) => {
    setSelectedPcs(prev =>
      prev.includes(pc) ? prev.filter(p => p !== pc) : [...prev, pc].sort((a, b) => a - b)
    );
  };

  const currentNormal = getNormalOrder(selectedPcs);
  const currentPrime = getPrimeForm(selectedPcs);
  const currentVector = getIntervalVector(selectedPcs);

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

  const handleDrillSubmit = (inputToValidate?: string) => {
    const textToTest = inputToValidate !== undefined ? inputToValidate : userDrillInput;
    if (!textToTest.trim()) return;

    const res = validateDrillAnswer(currentDrillQuestion, textToTest);
    setValidationResult(res);

    const store = loadUserStore();
    recordPracticeAttemptInStore(store, {
      skillId: currentDrillQuestion.skillId,
      isCorrect: res.isCorrect,
      confidenceRating: res.isCorrect ? 4 : 2,
      responseTimeMs: 4500,
      errorType: res.isCorrect ? undefined : 'Drill answer mistake',
      date: new Date().toISOString(),
    });
  };

  const handleNextDrillQuestion = () => {
    setSeedInput(prev => prev + 1);
    setUserDrillInput('');
    setValidationResult(null);
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
        <div role="tablist" aria-label="Theory laboratory sections" className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            id="tab-drills"
            role="tab"
            aria-selected={activeTab === 'drills'}
            aria-controls="tabpanel-drills"
            onClick={() => setActiveTab('drills')}
            className={`px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'drills' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Theory Drills
          </button>
          <button
            id="tab-setTheory"
            role="tab"
            aria-selected={activeTab === 'setTheory'}
            aria-controls="tabpanel-setTheory"
            onClick={() => setActiveTab('setTheory')}
            className={`px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'setTheory' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Pitch-Class Sets
          </button>
          <button
            id="tab-matrixSpeedRun"
            role="tab"
            aria-selected={activeTab === 'matrixSpeedRun'}
            aria-controls="tabpanel-matrixSpeedRun"
            onClick={() => setActiveTab('matrixSpeedRun')}
            className={`px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'matrixSpeedRun' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Matrix Speed Run
          </button>
          <button
            id="tab-modes"
            role="tab"
            aria-selected={activeTab === 'modes'}
            aria-controls="tabpanel-modes"
            onClick={() => setActiveTab('modes')}
            className={`px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'modes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Modes & Scales
          </button>
          <button
            id="tab-scoreAnalysis"
            role="tab"
            aria-selected={activeTab === 'scoreAnalysis'}
            aria-controls="tabpanel-scoreAnalysis"
            onClick={() => setActiveTab('scoreAnalysis')}
            className={`px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'scoreAnalysis' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Score Arena
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 0. GRADED DRILLS ENGINE */}
      {activeTab === 'drills' && (
        <div id="tabpanel-drills" role="tabpanel" aria-labelledby="tab-drills" className="space-y-6">
          {/* Controls bar */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category:</span>
              {(['tonal', 'form', 'modes', 'setTheory', 'twelveTone', 'rhythm', 'postTonal'] as DrillCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setDrillCategory(cat);
                    setValidationResult(null);
                    setUserDrillInput('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    drillCategory === cat
                      ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3 text-xs font-bold">
              <span className="text-slate-400 uppercase">Difficulty:</span>
              {[1, 2, 3, 4].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => {
                    setDrillDifficulty(lvl as DrillDifficulty);
                    setValidationResult(null);
                    setUserDrillInput('');
                  }}
                  className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center ${
                    drillDifficulty === lvl
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}

              <button
                onClick={() => setSeedInput(Math.floor(Math.random() * 10000))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>New Seed</span>
              </button>
            </div>
          </div>

          {/* Drill Question Card */}
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold rounded-lg uppercase">
                {currentDrillQuestion.topic} • Lvl {currentDrillQuestion.difficulty}
              </span>
              <span className="text-slate-500 font-mono">Seed: #{seedInput}</span>
            </div>

            <h2 className="text-lg font-bold text-slate-100">{currentDrillQuestion.prompt}</h2>

            {/* Multiple Choice Options */}
            {currentDrillQuestion.options ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {currentDrillQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setUserDrillInput(opt);
                      handleDrillSubmit(opt);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      userDrillInput === opt
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              /* Text Input */
              <div className="flex space-x-3 pt-2">
                <input
                  type="text"
                  placeholder="Enter answer (e.g. notes, prime form, ratio)..."
                  value={userDrillInput}
                  onChange={(e) => setUserDrillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDrillSubmit()}
                  className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  onClick={() => handleDrillSubmit()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
                >
                  Submit
                </button>
              </div>
            )}

            {/* Validation Explanation Box */}
            {validationResult && (
              <div
                className={`p-4 rounded-xl text-xs space-y-2 border ${
                  validationResult.isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center space-x-2">
                  {validationResult.isCorrect ? <Check className="w-4 h-4 text-emerald-400" /> : <HelpCircle className="w-4 h-4 text-rose-400" />}
                  <span>{validationResult.isCorrect ? 'Correct!' : 'Incorrect'}</span>
                </div>
                <p className="leading-relaxed">{validationResult.explanation}</p>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleNextDrillQuestion}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-lg text-xs flex items-center space-x-1"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {!validationResult.isCorrect && (
                    <button
                      onClick={() => setValidationResult(null)}
                      className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. SET THEORY LAB */}
      {activeTab === 'setTheory' && (
        <div id="tabpanel-setTheory" role="tabpanel" aria-labelledby="tab-setTheory" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              onClick={() => handleRecordSuccess('t1')}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
            >
              Log Set Calculation Practice
            </button>
          </div>
        </div>
      )}

      {/* 2. TWELVE-TONE MATRIX SPEED RUN */}
      {activeTab === 'matrixSpeedRun' && (
        <div id="tabpanel-matrixSpeedRun" role="tabpanel" aria-labelledby="tab-matrixSpeedRun" className="space-y-6">
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

          <MatrixGrid p0Row={sampleRow} showNotes={true} />

          <div className="flex space-x-3 max-w-md">
            <input
              type="text"
              aria-label="Row transformation input"
              placeholder="Enter row transformation (e.g. 7)"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <button
              onClick={() => {
                if (userAnswer === '7' || userAnswer === 'G') {
                  setMatrixResult('Correct! I7 begins on pitch class 7 (G).');
                  handleRecordSuccess('t3');
                } else {
                  setMatrixResult('Incorrect. I7 starts on index 7.');
                }
              }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
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
        <div id="tabpanel-modes" role="tabpanel" aria-labelledby="tab-modes" className="space-y-6">
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100">Mode Identification Trainer</h2>
            <p className="text-xs text-slate-400">
              Listen to the mode and inspect the visual keyboard to identify its quality.
            </p>

            <KeyboardVisualizer
              activeMidis={buildScale('C', currentMode).pitchClasses.map(pc => 60 + pc)}
              labelMode="note"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(SCALE_DEFINITIONS) as ModeName[]).slice(0, 8).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    if (mode === currentMode) {
                      setFeedback(`Correct! Scale is ${mode}.`);
                      handleRecordSuccess('t4');
                    } else {
                      setFeedback(`Incorrect. Scale is ${currentMode}.`);
                    }
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
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
        <div id="tabpanel-scoreAnalysis" role="tabpanel" aria-labelledby="tab-scoreAnalysis" className="space-y-6">
          <ScoreViewer
            title="Schoenberg Op. 19 Excerpt Analysis"
            annotations={[
              { measure: 1, label: 'Octatonic Collection [0,1,3,4,6,7,9,10]' },
              { measure: 2, label: 'Secondary Dominant V7/V' },
            ]}
          />

          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Analysis Prompt</h3>
            <p className="text-xs text-slate-400">
              Identify the harmonic structure present in Measure 1.
            </p>
            <button
              onClick={() => handleRecordSuccess('t5')}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              Confirm Analysis (Octatonic)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
