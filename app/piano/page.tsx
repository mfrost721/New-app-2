'use client';

import React, { useState } from 'react';
import KeyboardVisualizer from '@/components/KeyboardVisualizer';
import ScoreViewer from '@/components/ScoreViewer';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import { Piano, Check, Clock, RotateCcw } from 'lucide-react';

export default function PianoPage() {
  const [activeTab, setActiveTab] = useState<'technique' | 'harmonization' | 'happyBirthday' | 'sightReading'>('technique');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Technique Gauntlet state
  const keysList = ['Eb Major', 'F# Minor (Harmonic)', 'Ab Major', 'C# Minor (Melodic)', 'D Diminished 7th'];
  const [currentPromptIdx, setCurrentPromptIdx] = useState<number>(0);
  const [previewCountdown, setPreviewCountdown] = useState<number | null>(null);

  const startPreviewTimer = () => {
    setPreviewCountdown(20);
    const interval = setInterval(() => {
      setPreviewCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRecordSuccess = (skillId: string) => {
    const store = loadUserStore();
    recordPracticeAttemptInStore(store, {
      skillId,
      isCorrect: true,
      confidenceRating: 5,
      responseTimeMs: 4000,
      date: new Date().toISOString(),
    });
    setFeedback('Attempt Certified! Mastery updated (+6 pts).');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <Piano className="w-6 h-6 text-amber-400" />
            <span>Class Piano IV Proficiency Lab</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            2-octave scales & arpeggios @ 100bpm, melody harmonization, Happy Birthday project, and sight-reading exam simulator.
          </p>
        </div>

        {/* Tab Switcher */}
        <div aria-label="Class piano drill sections" className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('technique')}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'technique' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Technique Gauntlet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('harmonization')}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'harmonization' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Harmonization & Transposition
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('happyBirthday')}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'happyBirthday' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Happy Birthday Project
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sightReading')}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'sightReading' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sight-Reading Simulator
          </button>
        </div>
      </div>

      {feedback && (
        <div role="status" aria-live="polite" className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. TECHNIQUE GAUNTLET */}
      {activeTab === 'technique' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Random Key Technique Prompt</span>
              <h2 className="text-3xl font-black text-slate-100 mt-1">{keysList[currentPromptIdx]}</h2>
              <p className="text-xs text-slate-400 mt-1">
                2 Octaves • Hands Together • Standard Fingering • Quarter Note = 100 bpm.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPromptIdx((currentPromptIdx + 1) % keysList.length)}
              className="px-4 py-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center space-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Next Random Key</span>
            </button>
          </div>

          <KeyboardVisualizer startMidi={48} numKeys={37} labelMode="note" />

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase">Self-Certification Checklist (Exam Rule)</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded accent-amber-500" defaultChecked />
                <span>Hands together throughout</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded accent-amber-500" defaultChecked />
                <span>Standard fingering maintained</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded accent-amber-500" defaultChecked />
                <span>Maintained tempo = 100 bpm</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded accent-amber-500" defaultChecked />
                <span>No restarts / continuous flow</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRecordSuccess('p1')}
            className="w-full py-3 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Certify Scale & Arpeggio Performance
          </button>
        </div>
      )}

      {/* 2. HARMONIZATION & TRANSPOSITION */}
      {activeTab === 'harmonization' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <ScoreViewer title="Self-Accompaniment Melody (Original Key: G Major)" />
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Transposition Command</h3>
            <p className="text-xs text-slate-400">Now transpose the harmonization up a whole step to A Major.</p>
            <button
              type="button"
              onClick={() => handleRecordSuccess('p4')}
              className="px-5 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Certify Transposition Performance
            </button>
          </div>
        </div>
      )}

      {/* 3. HAPPY BIRTHDAY PROJECT */}
      {activeTab === 'happyBirthday' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Happy Birthday Harmonization Project</h2>
            <p className="text-xs text-slate-400">Master required Roman numeral harmonization across F, G, C, and Bb Major keys.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs text-amber-400 font-bold uppercase">Required Structure</span>
              <p className="text-xs text-slate-300 font-mono">I - V7 - V7 - I - I - IV - I/V - V7 - I</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs text-sky-400 font-bold uppercase">Texture Requirements</span>
              <p className="text-xs text-slate-300">RH: Melody | LH: Block / Broken Chords with diminished 7th resolution.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRecordSuccess('p5')}
            className="w-full py-3 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Certify Happy Birthday Practice Attempt
          </button>
        </div>
      )}

      {/* 4. SIGHT-READING SIMULATOR */}
      {activeTab === 'sightReading' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Level III Method-Book Sight-Reading Exam</h2>
              <p className="text-xs text-slate-400">Strict exam conditions: 20-second preview, continuous forced play, no restarts.</p>
            </div>
            {previewCountdown === null ? (
              <button
                type="button"
                onClick={startPreviewTimer}
                className="px-4 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <Clock className="w-4 h-4" />
                <span>Start 20s Exam Preview</span>
              </button>
            ) : (
              <div role="timer" aria-live="polite" className="px-4 py-2.5 min-h-[44px] flex items-center bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-mono font-bold text-sm">
                Preview Timer: {previewCountdown}s
              </div>
            )}
          </div>

          <ScoreViewer title="Unseen Level III Sight-Reading Score Excerpt" />

          <button
            type="button"
            onClick={() => handleRecordSuccess('p6')}
            className="w-full py-3 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Complete Sight-Reading Attempt
          </button>
        </div>
      )}
    </div>
  );
}
