'use client';

import React from 'react';
import { pitchClassToNote } from '@/lib/music/pitchClass';

interface PitchClassClockProps {
  selectedPcs?: number[];
  onTogglePc?: (pc: number) => void;
  showNoteNames?: boolean;
}

export default function PitchClassClock({
  selectedPcs = [],
  onTogglePc,
  showNoteNames = true,
}: PitchClassClockProps) {
  const radius = 120;
  const center = 150;

  const getCoordinates = (pc: number) => {
    // 0 (C) is at top (12 o'clock), moving clockwise
    const angle = (pc * 30 - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const handleToggle = (pc: number) => {
    if (onTogglePc) onTogglePc(pc);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
      <svg width={300} height={300} aria-label="Interactive pitch class clock" className="select-none max-w-full h-auto">
        {/* Background track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth="3"
          strokeDasharray="4 4"
        />

        {/* Lines connecting selected pitch classes */}
        {selectedPcs.length > 1 &&
          selectedPcs.map((pcA, i) => {
            const nextPc = selectedPcs[(i + 1) % selectedPcs.length];
            const coordA = getCoordinates(pcA);
            const coordB = getCoordinates(nextPc);
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
        {Array.from({ length: 12 }, (_, pc) => {
          const { x, y } = getCoordinates(pc);
          const isSelected = selectedPcs.includes(pc);
          const noteName = pitchClassToNote(pc);

          return (
            <g
              key={pc}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Pitch class ${pc}${showNoteNames ? ` (${noteName})` : ''}`}
              onClick={() => handleToggle(pc)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle(pc);
                }
              }}
              className="cursor-pointer transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 origin-center"
              style={{ transformOrigin: `${x}px ${y}px` }}
            >
              <circle
                cx={x}
                cy={y}
                r={22}
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
