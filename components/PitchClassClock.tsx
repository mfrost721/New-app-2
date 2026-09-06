'use client';

import React, { useMemo } from 'react';
import { pitchClassToNote } from '@/lib/music/pitchClass';

interface PitchClassClockProps {
  selectedPcs?: number[];
  onTogglePc?: (pc: number) => void;
  showNoteNames?: boolean;
}

const RADIUS = 120;
const CENTER = 150;

// Precalculate fixed SVG coordinates and note names for all 12 pitch classes at module level
// to eliminate redundant Math.cos/Math.sin and pitchClassToNote calls on every render.
const CLOCK_NODES = Array.from({ length: 12 }, (_, pc) => {
  const angle = (pc * 30 - 90) * (Math.PI / 180);
  return {
    pc,
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
    noteName: pitchClassToNote(pc),
  };
});

function PitchClassClock({
  selectedPcs = [],
  onTogglePc,
  showNoteNames = true,
}: PitchClassClockProps) {
  // O(1) selection lookup set memoized per selectedPcs array change
  const selectedPcsSet = useMemo(() => new Set(selectedPcs), [selectedPcs]);

  const handleToggle = (pc: number) => {
    if (onTogglePc) onTogglePc(pc);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
      <svg width={300} height={300} className="select-none">
        {/* Background track circle */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="#334155"
          strokeWidth="3"
          strokeDasharray="4 4"
        />

        {/* Lines connecting selected pitch classes */}
        {selectedPcs.length > 1 &&
          selectedPcs.map((pcA, i) => {
            const nextPc = selectedPcs[(i + 1) % selectedPcs.length];
            const coordA = CLOCK_NODES[pcA % 12];
            const coordB = CLOCK_NODES[nextPc % 12];
            if (!coordA || !coordB) return null;
            return (
              <line
                key={`line-${pcA}-${nextPc}`}
                x1={coordA.x}
                y1={coordA.y}
                x2={coordB.x}
                y2={coordB.y}
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeOpacity="0.8"
              />
            );
          })}

        {/* 12 Pitch Class Nodes */}
        {CLOCK_NODES.map(({ pc, x, y, noteName }) => {
          const isSelected = selectedPcsSet.has(pc);

          return (
            <g
              key={pc}
              role="button"
              tabIndex={0}
              aria-label={`Toggle pitch class ${pc}${showNoteNames ? ` (${noteName})` : ''}`}
              aria-pressed={isSelected}
              onClick={() => handleToggle(pc)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle(pc);
                }
              }}
              className="cursor-pointer transition-transform duration-150 hover:scale-110 origin-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              style={{ transformOrigin: `${x}px ${y}px` }}
            >
              <circle
                cx={x}
                cy={y}
                r={20}
                className={
                  isSelected
                    ? 'fill-amber-500 stroke-amber-300 stroke-2 shadow-lg'
                    : 'fill-slate-800 stroke-slate-600 hover:fill-slate-700 stroke-1'
                }
              />
              <text
                x={x}
                y={y - (showNoteNames ? 3 : 0)}
                textAnchor="middle"
                dominantBaseline="central"
                className={`text-xs font-bold ${isSelected ? 'fill-slate-950' : 'fill-slate-200'}`}
              >
                {pc}
              </text>
              {showNoteNames && (
                <text
                  x={x}
                  y={y + 10}
                  textAnchor="middle"
                  className={`text-[9px] font-medium ${isSelected ? 'fill-slate-950' : 'fill-amber-400'}`}
                >
                  {noteName}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default React.memo(PitchClassClock);
