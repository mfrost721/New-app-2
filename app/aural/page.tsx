'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { soundEngine } from '@/lib/audio/soundEngine';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import AuralDrillPanel from '@/components/AuralDrillPanel';
import DictationPanel from '@/components/DictationPanel';
import SightSingingStudio from '@/components/SightSingingStudio';
import { Mic, Check } from 'lucide-react';

function AuralContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'noteInKey' | 'chordsAnd64' | 'dictation' | 'sightSinging'>('noteInKey');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Note-in-key ladder state
  const targetDegree = 4;
  const targetMidi = 64; // E4

  // Deep link handling
  useEffect(() => {
    const skill = searchParams.get('skill');
    const category = searchParams.get('category');

    if (skill) {
      if (skill === 'a1') {
        setActiveTab('noteInKey');
      } else if (['a2', 'a3', 'a4', 'a5'].includes(skill)) {
        setActiveTab('chordsAnd64');
      } else if (['a6', 'a7'].includes(skill)) {
        setActiveTab('dictation');
      } else if (skill === 'a8') {
        setActiveTab('sightSinging');
      }
    } else if (category) {
      if (['noteInKey', 'chordsAnd64', 'dictation', 'sightSinging'].includes(category)) {
        setActiveTab(category as 'noteInKey' | 'chordsAnd64' | 'dictation' | 'sightSinging');
      }
    }
  }, [searchParams]);

  // Cleanup scheduled audio on unmount
  useEffect(() => {
    return () => {
      soundEngine.stopAll();
    };
  }, []);

  const handleRecordSuccess = (skillId: string, customMsg?: string) => {
    const store = loadUserStore();
    recordPracticeAttemptInStore(store, {
      skillId,
      isCorrect: true,
      confidenceRating: 4,
      responseTimeMs: 2500,
      date: new Date().toISOString(),
    });
    setFeedback(customMsg || 'Correct! Mastery updated (+6 pts).');
    setTimeout(() => setFeedback(null), 4000);
  };

  const playCadence = () => {
    soundEngine.stopAll();
    soundEngine.playProgression(
      [
        [60, 64, 67], // C
        [60, 65, 69], // F
        [59, 62, 67], // G
        [60, 64, 67], // C
      ],
      0.6
    );
    soundEngine.playNote(targetMidi, 1.2, 0.6, 2.6);
  };

  const playCadential64Progression = () => {
    soundEngine.stopAll();
    soundEngine.playProgression(
      [
        [60, 64, 67], // I
        [67, 72, 76], // I6/4
        [67, 71, 74, 77], // V7
        [60, 64, 67], // I
      ],
      0.75
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <Mic className="w-6 h-6 text-amber-400" />
            <span>Aural Skills IV & Sight-Singing Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ear training for 7th chords, 6/4 chord functions, secondary dominants, dictation, and real-time sung pitch analysis.
          </p>
        </div>

        {/* Tab Switcher */}
        <div role="tablist" aria-label="Aural skills drill sections" className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'noteInKey'}
            onClick={() => {
              soundEngine.stopAll();
              setActiveTab('noteInKey');
            }}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'noteInKey' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Note-in-Key
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chordsAnd64'}
            onClick={() => {
              soundEngine.stopAll();
              setActiveTab('chordsAnd64');
            }}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'chordsAnd64' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Chords & 6/4 Functions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dictation'}
            onClick={() => {
              soundEngine.stopAll();
              setActiveTab('dictation');
            }}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'dictation' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Melodic Dictation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sightSinging'}
            onClick={() => {
              soundEngine.stopAll();
              setActiveTab('sightSinging');
            }}
            className={`px-3 py-2.5 min-h-[44px] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === 'sightSinging' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sight-Singing Studio
          </button>
        </div>
      </div>

      {feedback && (
        <div role="status" aria-live="polite" className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center space-x-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. NOTE IN KEY LADDER & 2. CHORDS & 6/4 */}
      {(activeTab === 'noteInKey' || activeTab === 'chordsAnd64') && (
        <AuralDrillPanel
          activeTab={activeTab}
          onPlayCadence={playCadence}
          onSelectDegree={(degree, solfege) => {
            soundEngine.playNote(60 + degree, 0.8);
            if (degree === targetDegree) {
              handleRecordSuccess('a1', 'Correct! Target note was Mi.');
            } else {
              setFeedback(`Incorrect. Target note was Mi (3rd scale degree). You picked ${solfege}.`);
            }
          }}
          onPlayCadential64={playCadential64Progression}
          onSelectFunction={(func) => {
            if (func === 'cadential') {
              handleRecordSuccess('a3', 'Correct! Progression features a Cadential 6/4 function.');
            } else {
              setFeedback(`Incorrect. Function played was Cadential 6/4.`);
            }
          }}
        />
      )}

      {/* 3. MELODIC DICTATION */}
      {activeTab === 'dictation' && (
        <DictationPanel
          onPlayMelody={() => {
            soundEngine.stopAll();
            soundEngine.playScale([60, 62, 64, 60], 0.6, 100);
          }}
          onSubmitDictation={() => handleRecordSuccess('a6', 'Melodic dictation submission accepted!')}
        />
      )}

      {/* 4. SIGHT-SINGING STUDIO */}
      {activeTab === 'sightSinging' && (
        <SightSingingStudio
          targetMidi={targetMidi}
          onSuccess={handleRecordSuccess}
          onErrorFeedback={setFeedback}
        />
      )}
    </div>
  );
}

export default function AuralPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Aural Skills IV...</div>}>
      <AuralContent />
    </Suspense>
  );
}
