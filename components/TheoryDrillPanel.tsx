'use client';

import React from 'react';
import { DrillCategory, DrillDifficulty, DrillQuestion, AnswerValidationResult } from '@/lib/music/drillEngine';
import TheoryAnswerInput from './TheoryAnswerInput';
import TheoryFeedback from './TheoryFeedback';
import ScoreViewer, { ScoreNote } from './ScoreViewer';
import { Sparkles } from 'lucide-react';

export interface TheoryDrillPanelProps {
  drillCategory: DrillCategory;
  onSelectCategory: (category: DrillCategory) => void;
  drillDifficulty: DrillDifficulty;
  onSelectDifficulty: (difficulty: DrillDifficulty) => void;
  seedInput: number;
  onNewSeed: () => void;
  currentQuestion: DrillQuestion;
  userDrillInput: string;
  onUserInputChange: (val: string) => void;
  onSubmitAnswer: (inputToValidate?: string) => void;
  validationResult: AnswerValidationResult | null;
  onNextQuestion: () => void;
  onRetry: () => void;
}

export function TheoryDrillPanel({
  drillCategory,
  onSelectCategory,
  drillDifficulty,
  onSelectDifficulty,
  seedInput,
  onNewSeed,
  currentQuestion,
  userDrillInput,
  onUserInputChange,
  onSubmitAnswer,
  validationResult,
  onNextQuestion,
  onRetry,
}: TheoryDrillPanelProps) {
  const categories: DrillCategory[] = [
    'tonal',
    'form',
    'modes',
    'setTheory',
    'twelveTone',
    'rhythm',
    'postTonal',
  ];

  // Helper to construct ScoreViewer notes for Chord Spelling questions
  const isChordSpelling = currentQuestion.topic === 'Chord Spelling' || currentQuestion.subtopic === 'Chord Spelling';
  let drillScoreNotes: ScoreNote[] | undefined;

  if (isChordSpelling && currentQuestion.correctAnswer) {
    const tokens = currentQuestion.correctAnswer.split(/[\s,]+/).filter(Boolean);
    const isNotes = tokens.length > 0 && tokens.every(t => /^[A-Ga-g][#b♭♯♮]*$/.test(t));
    if (isNotes) {
      drillScoreNotes = tokens.map(t => ({
        pitch: `${t.toUpperCase()}4`,
        duration: 'quarter',
      }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
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
          {([1, 2, 3, 4] as DrillDifficulty[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => onSelectDifficulty(lvl)}
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
            onClick={onNewSeed}
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
            {currentQuestion.topic} • Lvl {currentQuestion.difficulty}
          </span>
          <span className="text-slate-500 font-mono">Seed: #{seedInput}</span>
        </div>

        <h2 className="text-lg font-bold text-slate-100">{currentQuestion.prompt}</h2>

        {drillScoreNotes && drillScoreNotes.length > 0 && (
          <ScoreViewer
            title={`Staff Notation Target: ${currentQuestion.topic}`}
            notes={drillScoreNotes}
            clef="treble"
          />
        )}

        <TheoryAnswerInput
          options={currentQuestion.options}
          value={userDrillInput}
          onChange={onUserInputChange}
          onSubmit={onSubmitAnswer}
        />

        {validationResult && (
          <TheoryFeedback
            validationResult={validationResult}
            onNextQuestion={onNextQuestion}
            onRetry={onRetry}
          />
        )}
      </div>
    </div>
  );
}

export default TheoryDrillPanel;
