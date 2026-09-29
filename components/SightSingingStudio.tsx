'use client';

import React, { useState, useEffect, useRef } from 'react';
import ScoreViewer from '@/components/ScoreViewer';
import { useMicrophonePitch } from '@/hooks/useMicrophonePitch';
import {
  evaluateSungPitch,
  PitchEvaluationResult,
  getNoteNameWithOctave,
} from '@/lib/audio/pitchDetection';
import { soundEngine } from '@/lib/audio/soundEngine';
import { Mic, Volume2, Square } from 'lucide-react';

export interface SightSingingStudioProps {
  targetMidi: number;
  onSuccess: (skillId: string, msg: string) => void;
  onErrorFeedback: (msg: string) => void;
}

export function SightSingingStudio({
  targetMidi,
  onSuccess,
  onErrorFeedback,
}: SightSingingStudioProps) {
  const [singingScore, setSingingScore] = useState<PitchEvaluationResult | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isListening,
    pitchResult,
    error: micError,
    collectedFramesRef,
    startListening,
    stopListening,
  } = useMicrophonePitch({
    mode: 'interval',
    intervalMs: 100,
    clarityThreshold: 0.6,
    keyTonicPc: 0,
  });

  const handleStopAndEvaluate = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    const frames = [...collectedFramesRef.current];
    stopListening();

    const evaluation = evaluateSungPitch(frames, targetMidi, {
      toleranceCents: 50,
      clarityThreshold: 0.6,
      minValidFrames: 3,
      allowOctaveShift: true,
    });

    setSingingScore(evaluation);

    if (evaluation.isCorrect) {
      onSuccess('a8', `Sight-singing evaluation passed! Grade: ${evaluation.totalScore}%`);
    } else {
      onErrorFeedback(evaluation.feedback);
    }
  };

  const handleStartRecording = async () => {
    setSingingScore(null);
    await startListening();
    recordingTimeoutRef.current = setTimeout(() => {
      handleStopAndEvaluate();
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Live Microphone Sight-Singing Studio</h2>
          <p className="text-xs text-slate-400">
            Target Note: <span className="text-amber-400 font-bold">{getNoteNameWithOctave(targetMidi)} (Mi)</span>. Real-time pitch autocorrelation, cents deviation, and accuracy scoring.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => soundEngine.playNote(targetMidi, 1.5)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs flex items-center space-x-1.5"
          >
            <Volume2 className="w-4 h-4" />
            <span>Play Reference Target Note</span>
          </button>
          {!isListening ? (
            <button
              type="button"
              onClick={handleStartRecording}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all"
            >
              <Mic className="w-4 h-4" />
              <span>Start Recording (5s)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopAndEvaluate}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center space-x-2 animate-pulse"
            >
              <Square className="w-4 h-4" />
              <span>Stop & Evaluate</span>
            </button>
          )}
        </div>
      </div>

      <ScoreViewer
        title={`Target Sight-Singing Excerpt (Target Note ${getNoteNameWithOctave(targetMidi)})`}
        notes={[{ pitch: targetMidi, duration: 'quarter' }]}
        clef={targetMidi < 60 ? 'bass' : 'treble'}
      />

      {/* Mic Error */}
      {micError && (
        <div className="text-xs text-rose-400 font-bold p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
          {micError}
        </div>
      )}

      {/* Real-time detected Pitch Display */}
      {pitchResult ? (
        <div role="status" aria-live="polite" className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">DETECTED PITCH</span>
            <span className="text-amber-400 font-bold text-base">{pitchResult.fullName}</span>
            <span className="text-slate-500 text-[10px] ml-1">({pitchResult.frequency} Hz)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">SOLFÈGE / DEGREE</span>
            <span className="text-slate-100 font-bold text-sm">
              {pitchResult.solfege} ({pitchResult.scaleDegree})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">CENTS DEVIATION</span>
            <span
              className={
                Math.abs(pitchResult.centsDeviation) <= 15
                  ? 'text-emerald-400 font-bold text-sm'
                  : Math.abs(pitchResult.centsDeviation) <= 35
                  ? 'text-amber-400 font-bold text-sm'
                  : 'text-rose-400 font-bold text-sm'
              }
            >
              {pitchResult.centsDeviation > 0 ? `+${pitchResult.centsDeviation}` : pitchResult.centsDeviation} cents
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">CLARITY / CONFIDENCE</span>
            <span className="text-sky-400 font-bold text-sm">{Math.round(pitchResult.clarity * 100)}%</span>
          </div>
        </div>
      ) : (
        isListening && (
          <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 text-amber-400 text-xs text-center font-mono animate-pulse">
            Listening for vocal pitch... Please sing target note into microphone.
          </div>
        )
      )}

      {singingScore && (
        <div className="p-5 bg-slate-950 rounded-xl border border-amber-500/30 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Pitch Accuracy</div>
              <div className="text-2xl font-black text-amber-400">{singingScore.pitchScore}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Rhythm & Stability</div>
              <div className="text-2xl font-black text-sky-400">{singingScore.rhythmScore}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Overall Grade</div>
              <div className="text-2xl font-black text-emerald-400">{singingScore.totalScore}%</div>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 text-center font-mono">
            {singingScore.feedback}
          </div>
        </div>
      )}
    </div>
  );
}

export default SightSingingStudio;
