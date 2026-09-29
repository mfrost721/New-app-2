'use client';

import React from 'react';
import { AnswerValidationResult } from '@/lib/music/drillEngine';
import { Check, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';

export interface TheoryFeedbackProps {
  validationResult: AnswerValidationResult;
  onNextQuestion: () => void;
  onRetry: () => void;
}

export function TheoryFeedback({
  validationResult,
  onNextQuestion,
  onRetry,
}: TheoryFeedbackProps) {
  return (
    <div
      className={`p-4 rounded-xl text-xs space-y-2 border ${
        validationResult.isCorrect
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
      }`}
    >
      <div className="font-bold flex items-center space-x-2">
        {validationResult.isCorrect ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <HelpCircle className="w-4 h-4 text-rose-400" />
        )}
        <span>{validationResult.isCorrect ? 'Correct!' : 'Incorrect'}</span>
      </div>
      <p className="leading-relaxed">{validationResult.explanation}</p>

      <div className="flex space-x-3 pt-2">
        <button
          onClick={onNextQuestion}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-lg text-xs flex items-center space-x-1"
        >
          <span>Next Question</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        {!validationResult.isCorrect && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default TheoryFeedback;
