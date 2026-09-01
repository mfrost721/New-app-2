'use client';

import React from 'react';
import { generateTwelveToneMatrix } from '@/lib/music/twelveTone';
import { pitchClassToNote } from '@/lib/music/pitchClass';

interface MatrixGridProps {
  p0Row: number[];
  userMatrix?: number[][];
  onCellChange?: (row: number, col: number, val: number) => void;
  showNotes?: boolean;
  interactive?: boolean;
}

export default function MatrixGrid({
  p0Row,
  userMatrix,
  onCellChange,
  showNotes = true,
  interactive = false,
}: MatrixGridProps) {
  const solutionMatrix = generateTwelveToneMatrix(p0Row);

  return (
    <div className="overflow-x-auto p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl select-none">
      <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 min-w-[550px]">
        {/* Top-left empty corner cell */}
        <div className="w-10 h-10 flex items-center justify-center font-bold text-xs text-amber-500 bg-slate-950 rounded border border-slate-800">
          P \ I
        </div>

        {/* Column Inversion Headers */}
        {solutionMatrix[0].map((val, colIdx) => (
          <div
            key={`col-header-${colIdx}`}
            className="w-10 h-10 flex flex-col items-center justify-center font-bold text-xs text-amber-400 bg-slate-950 rounded border border-slate-800"
          >
            <span>I{val}</span>
            {showNotes && <span className="text-[9px] text-slate-400">{pitchClassToNote(val)}</span>}
          </div>
        ))}

        {/* Matrix Rows */}
        {solutionMatrix.map((row, rIdx) => {
          const pLabel = row[0];
          return (
            <React.Fragment key={`row-group-${rIdx}`}>
              {/* Row Prime Header */}
              <div className="w-10 h-10 flex flex-col items-center justify-center font-bold text-xs text-amber-400 bg-slate-950 rounded border border-slate-800">
                <span>P{pLabel}</span>
                {showNotes && <span className="text-[9px] text-slate-400">{pitchClassToNote(pLabel)}</span>}
              </div>

              {/* Matrix Cells */}
              {row.map((correctVal, cIdx) => {
                const userVal = userMatrix ? userMatrix[rIdx]?.[cIdx] : undefined;
                const displayVal = interactive ? (userVal ?? '') : correctVal;
                const isCorrect = userVal === correctVal;

                return (
                  <div
                    key={`cell-${rIdx}-${cIdx}`}
                    className={`w-10 h-10 rounded flex flex-col items-center justify-center text-xs font-bold transition-all border ${
                      interactive
                        ? userVal !== undefined
                          ? isCorrect
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-rose-950 border-rose-500 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-800 border-slate-700 text-slate-100'
                    }`}
                  >
                    {interactive ? (
                      <input
                        type="number"
                        min={0}
                        max={11}
                        aria-label={`Matrix cell row ${rIdx + 1} column ${cIdx + 1}`}
                        value={userVal ?? ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (onCellChange) onCellChange(rIdx, cIdx, isNaN(val) ? 0 : val);
                        }}
                        className="w-full h-full text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-400 font-bold"
                      />
                    ) : (
                      <>
                        <span>{displayVal}</span>
                        {showNotes && (
                          <span className="text-[9px] font-normal text-slate-400">
                            {pitchClassToNote(Number(displayVal))}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
