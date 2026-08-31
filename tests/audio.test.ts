import { describe, it, expect } from 'vitest';
import { freqToMidi, autoCorrelate } from '../lib/audio/pitchDetection';
import { soundEngine } from '../lib/audio/soundEngine';

describe('Audio Engine Utilities', () => {
  it('detects pitch accurately across human vocal range (C3, A4, C6)', () => {
    const sampleRate = 44100;
    const bufferSize = 2048;

    const testCases = [
      { targetFreq: 130.81, expectedMidi: 48, expectedNote: 'C' }, // C3 (Low Male Voice)
      { targetFreq: 440.00, expectedMidi: 69, expectedNote: 'A' }, // A4 (Standard Tuning Pitch)
      { targetFreq: 1046.50, expectedMidi: 84, expectedNote: 'C' }, // C6 (High Female Soprano Range)
    ];

    for (const tc of testCases) {
      const buffer = new Float32Array(bufferSize);
      for (let i = 0; i < bufferSize; i++) {
        buffer[i] = Math.sin((2 * Math.PI * tc.targetFreq * i) / sampleRate);
      }

      const result = autoCorrelate(buffer, sampleRate);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.midi).toBe(tc.expectedMidi);
        expect(result.noteName).toBe(tc.expectedNote);
        expect(Math.abs(result.frequency - tc.targetFreq)).toBeLessThan(5);
      }
    }
  });

  it('handles quiet audio buffer gracefully', () => {
    const buffer = new Float32Array(1024);
    expect(autoCorrelate(buffer, 44100)).toBeNull();
  });

  it('handles noisy and boundary signals gracefully', () => {
    const sampleRate = 44100;
    const bufferSize = 2048;

    // Pure white noise (should produce low clarity or null pitch)
    const noiseBuffer = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      noiseBuffer[i] = (Math.random() * 2 - 1) * 0.1;
    }
    const noiseResult = autoCorrelate(noiseBuffer, sampleRate);
    if (noiseResult) {
      expect(noiseResult.clarity).toBeLessThan(0.8);
    }

    // Out-of-bounds low frequency (< 50 Hz)
    const lowFreqBuffer = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      lowFreqBuffer[i] = Math.sin((2 * Math.PI * 20 * i) / sampleRate);
    }
    expect(autoCorrelate(lowFreqBuffer, sampleRate)).toBeNull();
  });
  it('converts frequency to MIDI note and cents deviation', () => {
    const resA4 = freqToMidi(440);
    expect(resA4.midi).toBe(69);
    expect(resA4.noteName).toBe('A');
    expect(resA4.cents).toBe(0);

    const resC4 = freqToMidi(261.63);
    expect(resC4.midi).toBe(60);
    expect(resC4.noteName).toBe('C');
  });

  it('converts MIDI to frequency in sound engine', () => {
    expect(soundEngine.midiToFreq(69)).toBe(440);
    expect(Math.round(soundEngine.midiToFreq(60) * 100) / 100).toBe(261.63);
  });
});
