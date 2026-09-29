'use client';

import React from 'react';
import { Volume2 } from 'lucide-react';

export interface AuralDrillPanelProps {
  activeTab: 'noteInKey' | 'chordsAnd64';
  onPlayCadence: () => void;
  onSelectDegree: (degree: number, solfege: string) => void;
  onPlayCadential64: () => void;
  onSelectFunction: (func: string, title: string) => void;
}

export function AuralDrillPanel({
  activeTab,
  onPlayCadence,
  onSelectDegree,
  onPlayCadential64,
  onSelectFunction,
}: AuralDrillPanelProps) {
  if (activeTab === 'noteInKey') {
    return (
      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Note-in-Key Solfege Ladder</h2>
            <p className="text-xs text-slate-400">Tonal key establishment followed by target pitch class identification.</p>
          </div>
          <button
            type="button"
            onClick={onPlayCadence}
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
              onClick={() => onSelectDegree(item.degree, item.solfege)}
              className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-bold text-slate-200 hover:text-amber-400 transition-all"
            >
              {item.solfege}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Second-Inversion (6/4) & Seventh Chord Trainer</h2>
          <p className="text-xs text-slate-400">Distinguish cadential 6/4 vs passing 6/4 vs pedal 6/4 aurally.</p>
        </div>
        <button
          type="button"
          onClick={onPlayCadential64}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2"
        >
          <Volume2 className="w-4 h-4" />
          <span>Play Cadential 6/4 Progression</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Cadential 6/4', func: 'cadential' },
          { title: 'Passing 6/4', func: 'passing' },
          { title: 'Pedal / Neighbor 6/4', func: 'pedal' },
        ].map((item, i) => (
          <button
            type="button"
            key={i}
            onClick={() => onSelectFunction(item.func, item.title)}
            className="p-5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-sm font-bold text-slate-100 hover:border-amber-400/50 transition-all"
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AuralDrillPanel;
