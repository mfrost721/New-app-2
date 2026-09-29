'use client';

import React, { useRef } from 'react';
import KeyboardVisualizer from '@/components/KeyboardVisualizer';
import ScoreViewer from '@/components/ScoreViewer';
import SelfRubricPanel, { SelfRubricPanelProps } from './SelfRubricPanel';
import { useMicrophonePitch } from '@/hooks/useMicrophonePitch';
import { PianoExercise } from '@/lib/music/pianoCurriculum';
import { PlayedNoteEvent, DirectGradingResult } from '@/lib/music/pianoGrading';
import { SkillItem } from '@/lib/adaptive/mastery';
import { soundEngine } from '@/lib/audio/soundEngine';
import { Clock, RotateCcw, Award, AlertTriangle, Mic, MicOff } from 'lucide-react';

export interface MidiPerformancePanelProps {
  currentExercise: PianoExercise;
  playedEvents: PlayedNoteEvent[];
  directResult: DirectGradingResult | null;
  onNoteClick: (midi: number) => void;
  onClearBuffer: () => void;
  previewCountdown: number | null;
  onStartPreviewTimer: () => void;
  onCommitDirectAttempt: (score: number, isPassed: boolean, method: string) => void;
  rubricProps: SelfRubricPanelProps;
  skillItem: SkillItem | undefined;
  pianoStreak: number;
}

export function MidiPerformancePanel({
  currentExercise,
  playedEvents,
  directResult,
  onNoteClick,
  onClearBuffer,
  previewCountdown,
  onStartPreviewTimer,
  onCommitDirectAttempt,
  rubricProps,
  skillItem,
  pianoStreak,
}: MidiPerformancePanelProps) {
  const lastDetectedMidiRef = useRef(-1);

  const { isListening, error: micError, startListening, stopListening } = useMicrophonePitch({
    mode: 'animationFrame',
    clarityThreshold: 0.85,
    onPitchDetected: (pitch) => {
      if (pitch.clarity > 0.85 && pitch.midi !== lastDetectedMidiRef.current) {
        lastDetectedMidiRef.current = pitch.midi;
        soundEngine.playNote(pitch.midi);
        onNoteClick(pitch.midi);
      }
    },
  });

  const toggleMic = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const exerciseScoreNotes = (currentExercise.targetNotes || []).slice(0, 12).map((midi) => ({
    pitch: midi,
    duration: 'quarter' as const,
  }));

  const exerciseClef = currentExercise.targetNotes && currentExercise.targetNotes.length > 0 && Math.min(...currentExercise.targetNotes) < 60
    ? 'bass'
    : 'treble';

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
      {/* Header Info */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {currentExercise.level}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {currentExercise.keySignature}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 mt-2">{currentExercise.title}</h2>
          <p className="text-xs text-slate-400 mt-1">{currentExercise.instructions}</p>
        </div>

        {/* Input Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMic}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 border transition-all ${
              isListening
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isListening ? 'Stop Mic' : 'Audio Mic Mode'}</span>
          </button>

          <button
            onClick={onClearBuffer}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
            title="Reset Note Stream Buffer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {micError && (
        <div className="text-xs text-rose-400 font-bold p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
          {micError}
        </div>
      )}

      {/* Drill Instructions & Fingering Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">Target Fingering & BPM</span>
          <p className="text-xs text-slate-200 font-mono">{currentExercise.standardFingering || 'Standard 1-2-3-1-2-3-4-5'}</p>
          <p className="text-[11px] text-slate-400 mt-1">Target Tempo: <strong className="text-slate-200">{currentExercise.targetTempoBpm} BPM</strong></p>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-sky-400 tracking-wider">Pedagogy Explanation</span>
          <p className="text-xs text-slate-300 leading-relaxed">{currentExercise.explanation}</p>
        </div>
      </div>

      {/* Notation Score Preview */}
      {currentExercise.targetNotes && currentExercise.targetNotes.length > 0 && (
        <ScoreViewer
          title={`Score Representation: ${currentExercise.title}`}
          notes={exerciseScoreNotes}
          clef={exerciseClef}
        />
      )}

      {/* Sight Reading Simulator Preview Timer */}
      {currentExercise.category === 'sight_reading_rhythm' && (
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-slate-200">20-Second Observation Preview</span>
            <p className="text-[11px] text-slate-400">Observe score prior to strict non-stop performance execution.</p>
          </div>
          {previewCountdown === null ? (
            <button
              onClick={onStartPreviewTimer}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1"
            >
              <Clock className="w-4 h-4 mr-1" />
              <span>Start 20s Preview</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-mono font-bold text-sm">
              Timer: {previewCountdown}s
            </div>
          )}
        </div>
      )}

      {/* Interactive Keyboard Stream Visualizer */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Interactive Piano Keyboard (MIDI Input / Touch / Click)</span>
          <span className="font-mono text-amber-400">
            Played Notes Buffer: {playedEvents.length} / {currentExercise.targetNotes.length}
          </span>
        </div>
        <KeyboardVisualizer
          startMidi={48}
          numKeys={37}
          activeMidis={playedEvents.map(e => e.midi)}
          onNoteClick={onNoteClick}
          labelMode="note"
        />
      </div>

      {/* Real-time MIDI Autograding Results Panel */}
      {directResult && (
        <div className={`p-5 rounded-xl border space-y-4 ${
          directResult.passed ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200' : 'bg-rose-500/10 border-rose-500/40 text-slate-200'
        }`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {directResult.passed ? (
                <Award className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              )}
              <div>
                <h3 className="text-base font-black text-slate-100">
                  Automated Sequence Evaluation: {directResult.score}%
                </h3>
                <p className="text-xs text-slate-400">
                  Input Method: {directResult.inputMethod} • Status: {directResult.passed ? 'PASSED (Mastery Standard)' : 'NEEDS PRACTICE'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onCommitDirectAttempt(directResult.score, directResult.passed, directResult.inputMethod)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all"
            >
              Commit Attempt to Progress
            </button>
          </div>

          {/* Diagnostic Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Correct Notes</span>
              <span className="text-emerald-400 font-bold">{directResult.correctCount} / {directResult.totalTargetNotes}</span>
            </div>
            <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Wrong Notes</span>
              <span className="text-rose-400 font-bold">{directResult.wrongNotes.length}</span>
            </div>
            <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Missed Notes</span>
              <span className="text-amber-400 font-bold">{directResult.missedNotes.length}</span>
            </div>
            <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Timing Hesitations</span>
              <span className="text-sky-400 font-bold">{directResult.timingErrors.length}</span>
            </div>
          </div>

          {/* Feedback Messages */}
          <div className="p-3 bg-slate-950 rounded-lg text-xs space-y-1">
            <span className="font-bold text-amber-400 block uppercase text-[10px]">Diagnostic Performance Feedback:</span>
            {directResult.feedbackMessages.map((msg, idx) => (
              <p key={idx} className="text-slate-300">• {msg}</p>
            ))}
          </div>
        </div>
      )}

      {/* Transparent Rubric Certification Panel */}
      <SelfRubricPanel {...rubricProps} />

      {/* Student Mastery & Attempt Statistics */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center text-xs text-slate-300 gap-4">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Current Skill Status</span>
          <span className="font-bold text-slate-100">{currentExercise.title}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Total Attempts</span>
          <span className="font-mono font-bold">{skillItem ? skillItem.totalAttempts : 0}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Mastery Level</span>
          <span className="font-mono font-bold text-emerald-400">{skillItem ? skillItem.mastery : 0}%</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Piano Streak</span>
          <span className="font-mono font-bold text-amber-400">{pianoStreak} Days</span>
        </div>
      </div>
    </div>
  );
}

export default MidiPerformancePanel;
