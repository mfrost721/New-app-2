import { useState, useRef, useEffect, useCallback } from 'react';
import { autoCorrelate, PitchAnalysisResult } from '@/lib/audio/pitchDetection';

export interface UseMicrophonePitchOptions {
  onPitchDetected?: (pitch: PitchAnalysisResult) => void;
  clarityThreshold?: number;
  keyTonicPc?: number;
  mode?: 'interval' | 'animationFrame';
  intervalMs?: number;
}

export function useMicrophonePitch(options: UseMicrophonePitchOptions = {}) {
  const {
    onPitchDetected,
    clarityThreshold = 0.6,
    keyTonicPc = 0,
    mode = 'interval',
    intervalMs = 100,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [pitchResult, setPitchResult] = useState<PitchAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const collectedFramesRef = useRef<(PitchAnalysisResult | null)[]>([]);

  // Keep callback updated without resetting effect
  const onPitchDetectedRef = useRef(onPitchDetected);
  useEffect(() => {
    onPitchDetectedRef.current = onPitchDetected;
  }, [onPitchDetected]);

  const stopListening = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        void audioCtxRef.current.close();
      } catch {
        // Safe catch
      }
      audioCtxRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    stopListening();
    setError(null);
    setPitchResult(null);
    collectedFramesRef.current = [];

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone audio API is not supported in this browser context.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        stream.getTracks().forEach((t) => t.stop());
        setError('Web Audio API is not supported in this browser.');
        return;
      }

      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      const buffer = new Float32Array(analyser.fftSize);

      if (mode === 'animationFrame') {
        const process = () => {
          if (!analyserRef.current || !audioCtxRef.current) return;
          analyserRef.current.getFloatTimeDomainData(buffer);
          const res = autoCorrelate(buffer, audioCtxRef.current.sampleRate, {
            clarityThreshold,
            keyTonicPc,
          });
          collectedFramesRef.current.push(res);
          if (res) {
            setPitchResult(res);
            onPitchDetectedRef.current?.(res);
          }
          animFrameRef.current = requestAnimationFrame(process);
        };
        process();
      } else {
        timerRef.current = setInterval(() => {
          if (!analyserRef.current || !audioCtxRef.current) return;
          analyserRef.current.getFloatTimeDomainData(buffer);
          const res = autoCorrelate(buffer, audioCtxRef.current.sampleRate, {
            clarityThreshold,
            keyTonicPc,
          });
          collectedFramesRef.current.push(res);
          if (res) {
            setPitchResult(res);
            onPitchDetectedRef.current?.(res);
          }
        }, intervalMs);
      }
    } catch (err) {
      stopListening();
      const errObj = err as Error;
      if (errObj.name === 'NotAllowedError' || errObj.name === 'PermissionDeniedError') {
        setError('Microphone access was denied. Please allow microphone permissions to use Sight-Singing Studio.');
      } else if (errObj.name === 'NotFoundError' || errObj.name === 'DevicesNotFoundError') {
        setError('No microphone input device found.');
      } else {
        setError(`Microphone access error: ${errObj.message || 'Unable to open audio stream.'}`);
      }
    }
  }, [stopListening, mode, intervalMs, clarityThreshold, keyTonicPc]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    pitchResult,
    error,
    setError,
    collectedFramesRef,
    startListening,
    stopListening,
  };
}
