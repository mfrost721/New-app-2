'use client';

import React from 'react';
import ScoreViewer from '@/components/ScoreViewer';
import { Volume2 } from 'lucide-react';

export interface DictationPanelProps {
  onPlayMelody: () => void;
  onSubmitDictation: () => void;
}

export function DictationPanel({
  onPlayMelody,
  onSubmitDictation,
}: DictationPanelProps) {
  return (
    <div className="space-y-6">
      <ScoreViewer
        title="Melodic Dictation Prompt (4 Measures)"
        notes={[
          { pitch: 'C4', duration: 'quarter' },
          { pitch: 'D4', duration: 'quarter' },
          { pitch: 'E4', duration: 'quarter' },
          { pitch: 'C4', duration: 'quarter' },
        ]}
      />
      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-100">Listen & Transcribe Melody</h3>
          <p className="text-xs text-slate-400">Click below to hear prompt audio (C4 - D4 - E4 - C4).</p>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onPlayMelody}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs flex items-center space-x-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>Play Melody Audio</span>
          </button>
          <button
            type="button"
            onClick={onSubmitDictation}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
          >
            Submit Dictation
          </button>
        </div>
      </div>
    </div>
  );
}

export default DictationPanel;
