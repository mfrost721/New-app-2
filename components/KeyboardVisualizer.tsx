'use client';

import React, { useState, useEffect } from 'react';
import { pitchClassToNote } from '@/lib/music/pitchClass';
import { soundEngine } from '@/lib/audio/soundEngine';
import { midiController } from '@/lib/audio/midi';

export type KeyboardLabelMode = 'note' | 'pitchClass' | 'solfege' | 'scaleDegree';

interface KeyboardVisualizerProps {
  startMidi?: number; // default 60 (C4)
  numKeys?: number;   // default 25 (2 octaves)
  activeMidis?: number[];
  labelMode?: KeyboardLabelMode;
  onNoteClick?: (midi: number) => void;
  interactive?: boolean;
}

const SOLFEGE_MAP: Record<number, string> = {
  0: 'Do', 1: 'Di', 2: 'Re', 3: 'Ri', 4: 'Mi', 5: 'Fa',
  6: 'Fi', 7: 'Sol', 8: 'Si', 9: 'La', 10: 'Li', 11: 'Ti'
};

const DEGREE_MAP: Record<number, string> = {
  0: '1', 1: '♭2', 2: '2', 3: '♭3', 4: '3', 5: '4',
  6: '♯4', 7: '5', 8: '♭6', 9: '6', 10: '♭7', 11: '7'
};

const WHITE_KEY_OFFSETS: Record<number, number> = {
  0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6,
};

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

const getWhiteKeyIndex = (midi: number) => {
  const octave = Math.floor(midi / 12);
  const pc = ((midi % 12) + 12) % 12;
  return octave * 7 + (WHITE_KEY_OFFSETS[pc] ?? 0);
};

function KeyboardVisualizer({
  startMidi = 60,
  numKeys = 25,
  activeMidis = [],
  labelMode = 'note',
  onNoteClick,
  interactive = true,
}: KeyboardVisualizerProps) {
  const [pressedMidis, setPressedMidis] = useState<number[]>([]);
  const onNoteClickRef = React.useRef(onNoteClick);

  useEffect(() => {
    onNoteClickRef.current = onNoteClick;
  }, [onNoteClick]);

  useEffect(() => {
    void midiController.init();

    // Listen to real MIDI hardware keyboard inputs
    const cleanup = midiController.onNote((msg) => {
      if (msg.type === 'noteon') {
        soundEngine.playNote(msg.note);
        setPressedMidis(prev => [...prev.filter(n => n !== msg.note), msg.note]);
        if (onNoteClickRef.current) onNoteClickRef.current(msg.note);
      } else {
        setPressedMidis(prev => prev.filter(n => n !== msg.note));
      }
    });
    return cleanup;
  }, []);

  const keys = React.useMemo(() => {
    return Array.from({ length: numKeys }, (_, i) => startMidi + i);
  }, [startMidi, numKeys]);

  const getLabel = (midi: number) => {
    const pc = ((midi % 12) + 12) % 12;
    switch (labelMode) {
      case 'note': return pitchClassToNote(pc);
      case 'pitchClass': return `${pc}`;
      case 'solfege': return SOLFEGE_MAP[pc] || '';
      case 'scaleDegree': return DEGREE_MAP[pc] || '';
    }
  };

  const isBlackKey = (midi: number) => {
    const pc = ((midi % 12) + 12) % 12;
    return BLACK_PITCH_CLASSES.has(pc);
  };

  const handleKeyClick = (midi: number) => {
    if (!interactive) return;
    soundEngine.playNote(midi);
    if (onNoteClick) onNoteClick(midi);
  };

  return (
    <div className="w-full overflow-x-auto pb-2 select-none">
      <div className="relative flex min-w-max h-36 bg-slate-900 p-2 rounded-xl shadow-inner border border-slate-800">
        {keys.map((midi) => {
          const isBlack = isBlackKey(midi);
          const isActive = activeMidis.includes(midi) || pressedMidis.includes(midi);

          const noteName = pitchClassToNote(((midi % 12) + 12) % 12);
          const octave = Math.floor(midi / 12) - 1;
          const fullNoteLabel = `${noteName}${octave}`;
          const keyAriaLabel = `Piano key ${fullNoteLabel} (MIDI ${midi})`;

          if (isBlack) {
            const whiteKeyOffset = getWhiteKeyIndex(midi) - getWhiteKeyIndex(startMidi);
            return (
              <button
                key={midi}
                type="button"
                onClick={() => handleKeyClick(midi)}
                aria-label={keyAriaLabel}
                aria-pressed={isActive}
                className={`absolute z-10 w-7 h-20 -ml-3.5 rounded-b-md transition-all shadow-md flex items-end justify-center pb-1 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:z-20 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 scale-95'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-x border-b border-slate-700'
                }`}
                style={{
                  left: `${whiteKeyOffset * 2.25 + 0.5}rem`
                }}
              >
                {getLabel(midi)}
              </button>
            );
          }

          return (
            <button
              key={midi}
              type="button"
              onClick={() => handleKeyClick(midi)}
              aria-label={keyAriaLabel}
              aria-pressed={isActive}
              className={`w-9 h-32 rounded-b-lg border border-slate-300 transition-all flex items-end justify-center pb-2 text-xs font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:z-20 ${
                isActive
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500 scale-95'
                  : 'bg-slate-100 text-slate-800 hover:bg-white active:bg-slate-200'
              }`}
            >
              {getLabel(midi)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(KeyboardVisualizer);
