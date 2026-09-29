'use client';

import React from 'react';
import { RubricGradingResult } from '@/lib/music/pianoGrading';
import { Award } from 'lucide-react';

export interface SelfRubricPanelProps {
  rubricAccuracy: number;
  onRubricAccuracyChange: (val: number) => void;
  rubricTempo: number;
  onRubricTempoChange: (val: number) => void;
  rubricTechnique: number;
  onRubricTechniqueChange: (val: number) => void;
  rubricHarmony: number;
  onRubricHarmonyChange: (val: number) => void;
  rubricResult: RubricGradingResult | null;
  onEvaluateRubric: () => void;
  onCommitRubric: (score: number, isPassed: boolean) => void;
}

export function SelfRubricPanel({
  rubricAccuracy,
  onRubricAccuracyChange,
  rubricTempo,
  onRubricTempoChange,
  rubricTechnique,
  onRubricTechniqueChange,
  rubricHarmony,
  onRubricHarmonyChange,
  rubricResult,
  onEvaluateRubric,
  onCommitRubric,
}: SelfRubricPanelProps) {
  return (
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
          onClick={onEvaluateRubric}
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
            onChange={(e) => onRubricAccuracyChange(Number(e.target.value))}
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
            onChange={(e) => onRubricTempoChange(Number(e.target.value))}
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
            onChange={(e) => onRubricTechniqueChange(Number(e.target.value))}
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
            onChange={(e) => onRubricHarmonyChange(Number(e.target.value))}
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
              onClick={() => onCommitRubric(rubricResult.totalScore, rubricResult.totalScore >= 75)}
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
  );
}

export default SelfRubricPanel;
