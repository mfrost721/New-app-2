'use client';

import React, { useState, useEffect, useRef } from 'react';
import KeyboardVisualizer from '@/components/KeyboardVisualizer';
import ScoreViewer from '@/components/ScoreViewer';
import { recordPracticeAttemptInStore, loadUserStore } from '@/lib/storage/store';
import { Piano, Check, RotateCcw, AlertCircle } from 'lucide-react';

export default function PianoPage() {
  const [activeTab, setActiveTab] = useState<'technique' | 'harmonization' | 'happyBirthday' | 'sightReading'>('technique');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Expanded Piano Technique Prompts
  const keysList = [
    'C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'B Major', 'F# Major', 'Db Major', 'Ab Major', 'Eb Major', 'Bb Major', 'F Major',
    'A Minor (Harmonic)', 'E Minor (Melodic)', 'B Minor (Natural)', 'F# Minor (Harmonic)', 'C# Minor (Melodic)', 'G# Minor (Harmonic)',
    'D Diminished 7th Resolution', 'G Diminished 7th Resolution'
  ];
  const [currentPromptIdx, setCurrentPromptIdx] = useState<number>(0);

  // Mandatory Self-Certification Checklist
  const [checklist, setChecklist] = useState({
    handsTogether: false,
    standardFingering: false,
    tempoMaintained: false,
    noRestarts: false,
  });

  // Harmonization Input State
  const [harmonizationKey, setHarmonizationKey] = useState<string>('G');
  const [userHarmonizationChords, setUserHarmonizationChords] = useState<string[]>([]);
  const [harmonizationSubmitted, setHarmonizationSubmitted] = useState<boolean>(false);

  // Sight-Reading Timer & State
  const [previewTimer, setPreviewTimer] = useState<number | null>(null);
  const [sightReadingNotes, setSightReadingNotes] = useState<string[]>([]);
  const [sightReadingSubmitted, setSightReadingSubmitted] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const allChecklistComplete = checklist.handsTogether && checklist.standardFingering && checklist.tempoMaintained && checklist.noRestarts;

  const handleTechniqueSubmit = () => {
    if (!allChecklistComplete) return;

    recordPracticeAttemptInStore(loadUserStore(), {
      skillId: 'p1',
      isCorrect: true,
      confidenceRating: 4,
      responseTimeMs: 5000,
      date: new Date().toISOString(),
    });

    setFeedback({ message: `Self-Reported Practice Certified: Completed ${keysList[currentPromptIdx]} @ 100bpm.`, type: 'success' });
  };

  const handleHarmonizationSubmit = () => {
    setHarmonizationSubmitted(true);
    const targetChords = ['I', 'V7', 'V7', 'I'];
    let matches = 0;
    userHarmonizationChords.forEach((c, idx) => {
      if (c === targetChords[idx]) matches++;
    });

    const isCorrect = matches === 4 && userHarmonizationChords.length === 4;

    recordPracticeAttemptInStore(loadUserStore(), {
      skillId: 'p4',
      isCorrect,
      confidenceRating: 3,
      responseTimeMs: 6000,
      errorType: isCorrect ? undefined : `Matched ${matches}/4 harmonization chords in key of ${harmonizationKey}`,
      date: new Date().toISOString(),
    });

    if (isCorrect) {
      setFeedback({ message: `Correct harmonization in ${harmonizationKey} Major!`, type: 'success' });
    } else {
      setFeedback({ message: `Harmonization complete: ${matches}/4 chords correct. Target progression: I - V7 - V7 - I.`, type: 'error' });
    }
  };

  const startPreviewTimer = () => {
    setPreviewTimer(20);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPreviewTimer(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSightReadingSubmit = () => {
    setSightReadingSubmitted(true);
    const targetSequence = ['C4', 'E4', 'G4', 'C5'];
    let matches = 0;
    sightReadingNotes.forEach((n, idx) => {
      if (n === targetSequence[idx]) matches++;
    });

    const isCorrect = matches === 4;

    recordPracticeAttemptInStore(loadUserStore(), {
      skillId: 'p6',
      isCorrect,
      confidenceRating: 3,
      responseTimeMs: 10000,
      errorType: isCorrect ? undefined : `Matched ${matches}/4 sight-reading notes`,
      date: new Date().toISOString(),
    });

    if (isCorrect) {
      setFeedback({ message: 'Sight-Reading Exam Passed! 100% pitch and sequence accuracy.', type: 'success' });
    } else {
      setFeedback({ message: `Sight-Reading score: ${matches}/4 notes matched target sequence.`, type: 'error' });
    }
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
            2-octave scales & arpeggios, self-reported certification, melody harmonization, and sight-reading exam simulator.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('technique'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'technique' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Technique Gauntlet
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('harmonization'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'harmonization' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Harmonization
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('happyBirthday'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'happyBirthday' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Happy Birthday
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('sightReading'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'sightReading' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sight-Reading Exam
          </button>
        </div>
      </div>

      {/* Accessible Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. TECHNIQUE GAUNTLET */}
      {activeTab === 'technique' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Self-Reported Practice Exercise</span>
              <h2 className="text-3xl font-black text-slate-100 mt-1">{keysList[currentPromptIdx]}</h2>
              <p className="text-xs text-slate-400 mt-1">
                2 Octaves • Hands Together • Standard Fingering • Quarter Note = 100 bpm.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPromptIdx((currentPromptIdx + 1) % keysList.length)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Next Key</span>
            </button>
          </div>

          <KeyboardVisualizer startMidi={48} numKeys={37} labelMode="note" />

          {/* Mandatory Stateful Checklist */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase">Required Self-Certification Checklist:</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.handsTogether}
                  onChange={(e) => setChecklist(prev => ({ ...prev, handsTogether: e.target.checked }))}
                  className="rounded accent-amber-500"
                />
                <span>Hands together throughout</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.standardFingering}
                  onChange={(e) => setChecklist(prev => ({ ...prev, standardFingering: e.target.checked }))}
                  className="rounded accent-amber-500"
                />
                <span>Standard fingering maintained</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.tempoMaintained}
                  onChange={(e) => setChecklist(prev => ({ ...prev, tempoMaintained: e.target.checked }))}
                  className="rounded accent-amber-500"
                />
                <span>Maintained tempo = 100 bpm</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.noRestarts}
                  onChange={(e) => setChecklist(prev => ({ ...prev, noRestarts: e.target.checked }))}
                  className="rounded accent-amber-500"
                />
                <span>No restarts / continuous flow</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={!allChecklistComplete}
            onClick={handleTechniqueSubmit}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all disabled:opacity-50"
          >
            Certify Self-Reported Practice Attempt
          </button>
        </div>
      )}

      {/* 2. HARMONIZATION */}
      {activeTab === 'harmonization' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <ScoreViewer title={`Self-Accompaniment Melody (Key: ${harmonizationKey} Major)`} />

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100">Select Roman Numeral Progression (4 Measures):</h3>
              <select
                value={harmonizationKey}
                onChange={(e) => setHarmonizationKey(e.target.value)}
                className="px-3 py-1 bg-slate-900 border border-slate-700 text-xs font-bold text-amber-400 rounded-lg"
              >
                <option value="G">G Major</option>
                <option value="D">D Major</option>
                <option value="F">F Major</option>
              </select>
            </div>

            <div className="flex space-x-2">
              {['I', 'ii', 'IV', 'V', 'V7', 'vi'].map((chord) => (
                <button
                  type="button"
                  key={chord}
                  disabled={harmonizationSubmitted}
                  onClick={() => {
                    if (userHarmonizationChords.length < 4) {
                      setUserHarmonizationChords(prev => [...prev, chord]);
                    }
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold rounded-lg text-xs"
                >
                  {chord}
                </button>
              ))}
              <button
                type="button"
                disabled={harmonizationSubmitted}
                onClick={() => setUserHarmonizationChords([])}
                className="px-3 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold rounded-lg text-xs ml-auto"
              >
                Clear
              </button>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex justify-between items-center">
              <span>Selected Chords: [{userHarmonizationChords.join(' - ') || 'Empty'}]</span>
              <button
                type="button"
                disabled={harmonizationSubmitted || userHarmonizationChords.length < 4}
                onClick={handleHarmonizationSubmit}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50"
              >
                Submit Harmonization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. HAPPY BIRTHDAY */}
      {activeTab === 'happyBirthday' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Happy Birthday Harmonization Project</h2>
            <p className="text-xs text-slate-400">Master required Roman numeral harmonization across F, G, C, and Bb Major keys.</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs text-amber-400 font-bold uppercase">Required Chord Sequence:</span>
            <p className="text-xs text-slate-300 font-mono">m1-2: I | m3-4: V7 | m5-6: V7 | m7-8: I | m9-10: I | m11-12: IV | m13-14: I/V - V7 | m15-16: I</p>
          </div>
        </div>
      )}

      {/* 4. SIGHT-READING EXAM */}
      {activeTab === 'sightReading' && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Level III Method-Book Sight-Reading Exam</h2>
              <p className="text-xs text-slate-400">20-second preview timer. Enter the note sequence on the visual keyboard.</p>
            </div>
            {previewTimer === null ? (
              <button
                type="button"
                onClick={startPreviewTimer}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs font-bold"
              >
                Start 20s Exam Preview
              </button>
            ) : (
              <div className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-mono font-bold text-sm">
                Preview Timer: {previewTimer}s
              </div>
            )}
          </div>

          <ScoreViewer
            title="Unseen Sight-Reading Excerpt"
            notes={[
              { pitch: 'C4', duration: 'quarter' },
              { pitch: 'E4', duration: 'quarter' },
              { pitch: 'G4', duration: 'quarter' },
              { pitch: 'C5', duration: 'quarter' },
            ]}
          />

          <KeyboardVisualizer
            activeMidis={[]}
            onNoteClick={(midi) => {
              const noteMap: Record<number, string> = { 60: 'C4', 64: 'E4', 67: 'G4', 72: 'C5' };
              if (noteMap[midi] && sightReadingNotes.length < 4 && !sightReadingSubmitted) {
                setSightReadingNotes(prev => [...prev, noteMap[midi]]);
              }
            }}
          />

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex justify-between items-center">
            <span>Performed Notes: [{sightReadingNotes.join(', ') || 'Empty'}]</span>
            <button
              type="button"
              disabled={sightReadingSubmitted || sightReadingNotes.length < 4}
              onClick={handleSightReadingSubmit}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50"
            >
              Submit Sight-Reading Performance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
