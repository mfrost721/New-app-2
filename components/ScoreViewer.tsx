'use client';

import React from 'react';

export interface ScoreNote {
  pitch: string; // e.g., 'C4', 'E4', 'G4', 'B4'
  duration: 'quarter' | 'half' | 'whole' | 'eighth';
  accidental?: '♭' | '♯' | '♮';
  annotation?: string;
}

interface ScoreViewerProps {
  title?: string;
  clef?: 'treble' | 'bass';
  timeSignature?: [number, number];
  notes?: ScoreNote[];
  annotations?: { measure: number; label: string; color?: string }[];
  onNoteClick?: (index: number) => void;
}

export default function ScoreViewer({
  title = 'Excerpt Analysis',
  clef = 'treble',
  timeSignature = [4, 4],
  notes = [
    { pitch: 'C4', duration: 'quarter' },
    { pitch: 'E4', duration: 'quarter' },
    { pitch: 'G4', duration: 'quarter' },
    { pitch: 'B4', duration: 'quarter' },
  ],
  annotations = [],
  onNoteClick,
}: ScoreViewerProps) {
  return (
    <div className="w-full p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl select-none">
      {title && (
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <div className="text-xs text-amber-400 font-mono">
            {clef.toUpperCase()} CLEF | {timeSignature[0]}/{timeSignature[1]}
          </div>
        </div>
      )}

      <div className="relative w-full h-36 bg-slate-950 rounded-xl p-4 border border-slate-800 flex items-center overflow-x-auto">
        {/* Staff Lines */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-20 flex flex-col justify-between pointer-events-none">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="w-full h-0.5 bg-slate-700" />
          ))}
        </div>

        {/* Clef & Key Signature Placeholder */}
        <div className="z-10 flex items-center space-x-2 mr-6 text-slate-400 font-bold font-serif text-2xl">
          <span>{clef === 'treble' ? '𝄞' : '𝄢'}</span>
          <div className="flex flex-col text-xs font-mono text-slate-300 leading-tight">
            <span>{timeSignature[0]}</span>
            <span>{timeSignature[1]}</span>
          </div>
        </div>

        {/* Notes Display */}
        <div className="z-10 flex-1 flex items-center justify-around h-full">
          {notes.map((n, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onNoteClick && onNoteClick(idx)}
              aria-label={`Note ${n.accidental ? `${n.accidental}${n.pitch}` : n.pitch}, ${n.duration}${n.annotation ? `, annotation ${n.annotation}` : ''}`}
              className="relative flex flex-col items-center cursor-pointer group hover:scale-105 transition-transform p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:z-20"
            >
              {/* Optional Annotation Badge */}
              {n.annotation && (
                <span className="absolute -top-6 text-[10px] px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded shadow">
                  {n.annotation}
                </span>
              )}

              {/* Note Head & Stem */}
              <div className="relative flex items-center">
                {n.accidental && (
                  <span className="text-xs font-bold text-amber-400 mr-1">{n.accidental}</span>
                )}
                <div className="w-4 h-3 bg-amber-400 rounded-full transform -rotate-12 shadow-md group-hover:bg-amber-300" />
                <div className="w-0.5 h-10 bg-amber-400 absolute left-3.5 bottom-1/2 group-hover:bg-amber-300" />
              </div>

              {/* Pitch Label */}
              <span className="text-[10px] text-slate-400 font-mono mt-3">{n.pitch}</span>
            </button>
          ))}
        </div>

        {/* Annotations overlay */}
        {annotations.length > 0 && (
          <div className="absolute bottom-2 right-4 flex space-x-2">
            {annotations.map((ann, i) => (
              <span key={i} className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
                m.{ann.measure}: {ann.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
