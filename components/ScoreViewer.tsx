'use client';

import React from 'react';
import { normalizeAccidentals, pitchClassToNote } from '@/lib/music/pitchClass';

export type ScoreNoteDuration = 'q' | 'h' | 'w' | '8' | 'quarter' | 'half' | 'whole' | 'eighth';
export type ScoreNoteAccidental = '#' | 'b' | 'n' | '♯' | '♭' | '♮';

export interface ScoreNote {
  pitch: string | number; // Scientific pitch e.g., 'C4', 'E4', 'F#4' or MIDI number e.g., 60
  duration?: ScoreNoteDuration;
  accidental?: ScoreNoteAccidental;
  annotation?: string;
}

export interface ScoreViewerProps {
  title?: string;
  clef?: 'treble' | 'bass';
  timeSig?: [number, number];
  timeSignature?: [number, number];
  notes?: ScoreNote[];
  annotations?: { measure: number; label: string; color?: string }[];
  onNoteClick?: (index: number) => void;
  className?: string;
}

// Helpers for pitch parsing and staff math
interface ParsedNote {
  pitchLabel: string;
  noteLetter: string;
  octave: number;
  accidentalSymbol?: string;
  diatonicStep: number;
  durationName: 'quarter' | 'half' | 'whole' | 'eighth';
}

const LETTER_STEPS: Record<string, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

function normalizeDurationName(duration?: ScoreNoteDuration): 'quarter' | 'half' | 'whole' | 'eighth' {
  if (!duration) return 'quarter';
  if (duration === 'q' || duration === 'quarter') return 'quarter';
  if (duration === 'h' || duration === 'half') return 'half';
  if (duration === 'w' || duration === 'whole') return 'whole';
  if (duration === '8' || duration === 'eighth') return 'eighth';
  return 'quarter';
}

function parseNote(n: ScoreNote): ParsedNote {
  const durationName = normalizeDurationName(n.duration);
  const pitchStr = typeof n.pitch === 'number' ? '' : String(n.pitch).trim();

  let letter = 'C';
  let octave = 4;
  let accSym = n.accidental ? normalizeAccidentalSymbol(n.accidental) : undefined;
  let pitchLabel = '';

  if (typeof n.pitch === 'number') {
    const midi = n.pitch;
    octave = Math.floor(midi / 12) - 1;
    const pc = ((midi % 12) + 12) % 12;
    const preferFlat = accSym === '♭';
    const noteName = pitchClassToNote(pc, preferFlat);
    letter = noteName[0].toUpperCase();
    pitchLabel = `${noteName}${octave}`;
    if (!accSym && noteName.length > 1) {
      accSym = noteName[1] === '#' ? '♯' : '♭';
    }
  } else {
    const normalized = normalizeAccidentals(pitchStr);
    const rawUpper = normalized.toUpperCase();

    // Check if numeric string
    if (/^[-+]?\d+$/.test(rawUpper)) {
      const midi = parseInt(rawUpper, 10);
      octave = Math.floor(midi / 12) - 1;
      const pc = ((midi % 12) + 12) % 12;
      const noteName = pitchClassToNote(pc);
      letter = noteName[0].toUpperCase();
      pitchLabel = `${noteName}${octave}`;
      if (!accSym && noteName.length > 1) {
        accSym = noteName[1] === '#' ? '♯' : '♭';
      }
    } else {
      // e.g. "C4", "F#4", "Eb3", "C-1"
      const match = rawUpper.match(/^([A-G])([#B♯♭♮]*)([-+]?\d+)$/);
      if (match) {
        letter = match[1];
        const rawAcc = match[2];
        octave = parseInt(match[3], 10);

        let parsedAccSym: '♯' | '♭' | '♮' | undefined;
        if (rawAcc.includes('#') || rawAcc.includes('♯')) parsedAccSym = '♯';
        else if (rawAcc.includes('B') || rawAcc.includes('♭')) parsedAccSym = '♭';
        else if (rawAcc.includes('♮')) parsedAccSym = '♮';

        if (!accSym) accSym = parsedAccSym;

        const displayAccStr = accSym === '♯' ? '#' : accSym === '♭' ? 'b' : accSym === '♮' ? '' : '';
        pitchLabel = `${letter}${displayAccStr}${octave}`;
      } else {
        // Fallback for simple letters or unrecognized strings
        letter = rawUpper[0] && LETTER_STEPS[rawUpper[0]] !== undefined ? rawUpper[0] : 'C';
        pitchLabel = pitchStr || 'C4';
      }
    }
  }

  const letterStep = LETTER_STEPS[letter] ?? 0;
  const diatonicStep = octave * 7 + letterStep;

  return {
    pitchLabel,
    noteLetter: letter,
    octave,
    accidentalSymbol: accSym,
    diatonicStep,
    durationName,
  };
}

function normalizeAccidentalSymbol(acc: ScoreNoteAccidental): '♯' | '♭' | '♮' {
  if (acc === '#' || acc === '♯') return '♯';
  if (acc === 'b' || acc === '♭') return '♭';
  return '♮';
}

/**
 * Calculates Y coordinate on staff:
 * Staff lines are at y = 40, 50, 60, 70, 80 (spacing = 10px).
 * Treble clef: E4 (diatonicStep = 30) is bottom line (y = 80).
 * Bass clef: G2 (diatonicStep = 18) is bottom line (y = 80).
 */
function getStaffY(diatonicStep: number, clef: 'treble' | 'bass'): number {
  const refStep = clef === 'treble' ? 30 : 18; // E4 or G2
  return 80 - (diatonicStep - refStep) * 5;
}

export default function ScoreViewer({
  title = 'Excerpt Analysis',
  clef = 'treble',
  timeSig,
  timeSignature,
  notes = [
    { pitch: 'C4', duration: 'quarter' },
    { pitch: 'E4', duration: 'quarter' },
    { pitch: 'G4', duration: 'quarter' },
    { pitch: 'B4', duration: 'quarter' },
  ],
  annotations = [],
  onNoteClick,
  className = '',
}: ScoreViewerProps) {
  const effectiveTimeSig = timeSig || timeSignature || [4, 4];

  const parsedNotes = notes.map(parseNote);

  const noteDescriptions = parsedNotes.map(n => `${n.pitchLabel} ${n.durationName}`);
  const clefName = clef === 'treble' ? 'Treble' : 'Bass';
  const ariaLabel = `${clefName} staff: ${noteDescriptions.length > 0 ? noteDescriptions.join(', ') : 'empty'}`;

  // Horizontal layout calculation
  const startX = 110;
  const noteSpacing = notes.length > 1 ? Math.min(60, Math.max(35, 360 / notes.length)) : 60;
  const totalSvgWidth = Math.max(480, startX + notes.length * noteSpacing + 40);

  return (
    <div className={`w-full p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl select-none ${className}`}>
      {title && (
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <div className="text-xs text-amber-400 font-mono">
            {clef.toUpperCase()} CLEF | {effectiveTimeSig[0]}/{effectiveTimeSig[1]}
          </div>
        </div>
      )}

      <div className="relative w-full bg-slate-950 rounded-xl p-4 border border-slate-800 flex items-center justify-center overflow-x-auto">
        <svg
          role="img"
          aria-label={ariaLabel}
          viewBox={`0 0 ${totalSvgWidth} 130`}
          className="w-full h-auto max-h-40 min-w-[320px]"
        >
          {/* Staff Lines (5 lines from y=40 to y=80) */}
          <g stroke="currentColor" strokeWidth="1.2" className="text-slate-600">
            <line x1="20" y1="40" x2={totalSvgWidth - 20} y2="40" />
            <line x1="20" y1="50" x2={totalSvgWidth - 20} y2="50" />
            <line x1="20" y1="60" x2={totalSvgWidth - 20} y2="60" />
            <line x1="20" y1="70" x2={totalSvgWidth - 20} y2="70" />
            <line x1="20" y1="80" x2={totalSvgWidth - 20} y2="80" />
            {/* End bar lines */}
            <line x1="20" y1="40" x2="20" y2="80" strokeWidth="2" />
            <line x1={totalSvgWidth - 20} y1="40" x2={totalSvgWidth - 20} y2="80" strokeWidth="2" />
          </g>

          {/* Clef Path */}
          <g className="text-amber-400">
            {clef === 'treble' ? (
              /* Treble Clef Path */
              <path
                d="M 42 78 C 38 78 35 75 35 71 C 35 66 39 63 43 63 C 48 63 51 67 51 71 C 51 77 44 82 36 80 C 31 79 27 72 29 65 C 31 56 40 48 44 38 C 47 31 46 22 42 22 C 39 22 38 25 39 28 C 41 34 38 43 31 53 C 25 62 23 72 26 80 C 29 88 38 93 45 90 C 53 87 56 78 54 70 C 52 61 44 56 36 58 C 33 59 31 61 31 64 C 31 67 34 69 37 68 C 39 67 41 68 41 70 C 41 73 38 75 35 74"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              /* Bass Clef Path */
              <g>
                <path
                  d="M 33 50 C 33 45 38 42 43 42 C 49 42 54 46 54 52 C 54 62 43 72 34 81"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="34" cy="50" r="3.5" fill="currentColor" />
                <circle cx="59" cy="45" r="2.5" fill="currentColor" />
                <circle cx="59" cy="55" r="2.5" fill="currentColor" />
              </g>
            )}
          </g>

          {/* Time Signature Numerals */}
          <g fill="currentColor" className="text-slate-200 font-serif font-bold text-lg text-anchor-middle">
            <text x="75" y="56" textAnchor="middle">{effectiveTimeSig[0]}</text>
            <text x="75" y="76" textAnchor="middle">{effectiveTimeSig[1]}</text>
          </g>

          {/* Notes rendering */}
          {parsedNotes.map((pn, idx) => {
            const x = startX + idx * noteSpacing;
            const y = getStaffY(pn.diatonicStep, clef);
            const rawNote = notes[idx];

            // Stem direction: down if y <= 60 (at or above middle line), else up
            const stemUp = y > 60;
            const isFilled = pn.durationName !== 'half' && pn.durationName !== 'whole';
            const hasStem = pn.durationName !== 'whole';
            const hasFlag = pn.durationName === 'eighth';

            // Ledger lines required if y <= 30 or y >= 90
            const ledgerYList: number[] = [];
            if (y >= 90) {
              for (let ly = 90; ly <= y; ly += 10) ledgerYList.push(ly);
            } else if (y <= 30) {
              for (let ly = 30; ly >= y; ly -= 10) ledgerYList.push(ly);
            }

            const stemX = stemUp ? x + 5.5 : x - 5.5;
            const stemYEnd = stemUp ? y - 30 : y + 30;

            return (
              <g
                key={idx}
                onClick={() => onNoteClick && onNoteClick(idx)}
                className={`group ${onNoteClick ? 'cursor-pointer' : ''}`}
                tabIndex={onNoteClick ? 0 : undefined}
                role={onNoteClick ? 'button' : undefined}
                aria-label={`Note ${pn.pitchLabel}, ${pn.durationName}${rawNote?.annotation ? `, annotation ${rawNote.annotation}` : ''}`}
              >
                {/* Optional Annotation */}
                {rawNote?.annotation && (
                  <g transform={`translate(${x}, ${y - (stemUp ? 42 : 20)})`}>
                    <rect
                      x="-18"
                      y="-12"
                      width="36"
                      height="16"
                      rx="4"
                      className="fill-amber-500 text-slate-950 shadow"
                    />
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      className="fill-slate-950 font-sans text-[10px] font-bold"
                    >
                      {rawNote.annotation}
                    </text>
                  </g>
                )}

                {/* Ledger Lines */}
                {ledgerYList.map((ly, lIdx) => (
                  <line
                    key={lIdx}
                    x1={x - 12}
                    y1={ly}
                    x2={x + 12}
                    y2={ly}
                    stroke="currentColor"
                    strokeWidth="1.2"
                    className="text-slate-500"
                  />
                ))}

                {/* Accidental Glyphs */}
                {pn.accidentalSymbol && (
                  <text
                    x={x - 15}
                    y={y + 4}
                    textAnchor="middle"
                    className="fill-amber-400 font-serif font-bold text-sm group-hover:fill-amber-300 transition-colors"
                  >
                    {pn.accidentalSymbol}
                  </text>
                )}

                {/* Note Head */}
                <ellipse
                  cx={x}
                  cy={y}
                  rx="6"
                  ry="4.5"
                  transform={`rotate(-15, ${x}, ${y})`}
                  fill={isFilled ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={isFilled ? '0' : '1.8'}
                  className="text-amber-400 group-hover:text-amber-300 transition-colors"
                />

                {/* Stem */}
                {hasStem && (
                  <line
                    x1={stemX}
                    y1={y}
                    x2={stemX}
                    y2={stemYEnd}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-amber-400 group-hover:text-amber-300 transition-colors"
                  />
                )}

                {/* Flag for 8th note */}
                {hasFlag && (
                  <path
                    d={
                      stemUp
                        ? `M ${stemX} ${stemYEnd} Q ${stemX + 8} ${stemYEnd + 10} ${stemX + 10} ${stemYEnd + 18}`
                        : `M ${stemX} ${stemYEnd} Q ${stemX + 8} ${stemYEnd - 10} ${stemX + 10} ${stemYEnd - 18}`
                    }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="text-amber-400 group-hover:text-amber-300 transition-colors"
                  />
                )}

                {/* Pitch Label below staff */}
                <text
                  x={x}
                  y="118"
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {pn.pitchLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Annotations overlay */}
        {annotations.length > 0 && (
          <div className="absolute bottom-2 right-4 flex space-x-2">
            {annotations.map((ann, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700"
              >
                m.{ann.measure}: {ann.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
