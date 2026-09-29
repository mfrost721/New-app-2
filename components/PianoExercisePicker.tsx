'use client';

import React from 'react';
import {
  PianoExercise,
  PianoLevel,
  PianoCategory,
} from '@/lib/music/pianoCurriculum';
import { UserStoreState } from '@/lib/storage/store';
import { BookOpen, Layers } from 'lucide-react';

export interface PianoExercisePickerProps {
  selectedLevel: PianoLevel;
  onSelectLevel: (level: PianoLevel) => void;
  selectedCategory: PianoCategory | 'all';
  onSelectCategory: (category: PianoCategory | 'all') => void;
  filteredExercises: PianoExercise[];
  selectedExerciseId: string;
  onSelectExercise: (id: string) => void;
  userStore: UserStoreState | null;
  customKey: string;
  onCustomKeyChange: (key: string) => void;
  customScaleType: 'Major' | 'Natural Minor' | 'Harmonic Minor' | 'Melodic Minor';
  onCustomScaleTypeChange: (st: 'Major' | 'Natural Minor' | 'Harmonic Minor' | 'Melodic Minor') => void;
}

export function PianoExercisePicker({
  selectedLevel,
  selectedCategory,
  onSelectCategory,
  filteredExercises,
  selectedExerciseId,
  onSelectExercise,
  userStore,
  customKey,
  onCustomKeyChange,
  customScaleType,
  onCustomScaleTypeChange,
}: PianoExercisePickerProps) {
  const categories: (PianoCategory | 'all')[] = [
    'all',
    'scales',
    'arpeggios',
    'chords_cadences',
    'harmonization_transposition',
    'sight_reading_rhythm',
    'repertoire_project',
  ];

  return (
    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center space-x-1">
          <BookOpen className="w-4 h-4 mr-1" />
          <span>{selectedLevel} Modules</span>
        </span>
        <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
          {filteredExercises.length} Drills
        </span>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
              selectedCategory === cat
                ? 'bg-slate-700 text-amber-300 border border-slate-600'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/50'
            }`}
          >
            {cat === 'all' ? 'All' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Exercise Items List */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {filteredExercises.map((ex) => {
          const isSelected = ex.id === selectedExerciseId;
          const skill = userStore?.skills.find((s) => s.id === ex.id);
          const mastery = skill ? skill.mastery : 0;

          return (
            <button
              key={ex.id}
              onClick={() => onSelectExercise(ex.id)}
              className={`w-full text-left p-3 rounded-xl transition-all border ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/50 text-slate-100 ring-1 ring-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold leading-tight">{ex.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 ml-2 shrink-0">
                  BPM {ex.targetTempoBpm}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                <span className="capitalize">{ex.category.replace('_', ' ')}</span>
                <span
                  className={`font-mono font-bold ${
                    mastery >= 80
                      ? 'text-emerald-400'
                      : mastery >= 60
                      ? 'text-amber-400'
                      : 'text-slate-500'
                  }`}
                >
                  Mastery: {mastery}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Scale Generator Widget */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
        <span className="text-[10px] font-bold uppercase text-sky-400 flex items-center space-x-1">
          <Layers className="w-3.5 h-3.5 mr-1" />
          <span>Dynamic 12-Key Scale Generator</span>
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <select
            value={customKey}
            onChange={(e) => onCustomKeyChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
          >
            {['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'].map((k) => (
              <option key={k} value={k}>
                {k} Key
              </option>
            ))}
          </select>
          <select
            value={customScaleType}
            onChange={(e) =>
              onCustomScaleTypeChange(
                e.target.value as 'Major' | 'Natural Minor' | 'Harmonic Minor' | 'Melodic Minor'
              )
            }
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
          >
            <option value="Major">Major</option>
            <option value="Natural Minor">Natural Minor</option>
            <option value="Harmonic Minor">Harmonic Minor</option>
            <option value="Melodic Minor">Melodic Minor</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default PianoExercisePicker;
