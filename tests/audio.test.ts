import { describe, it, expect } from 'vitest';
import { freqToMidi, autoCorrelate } from '../lib/audio/pitchDetection';
import { soundEngine } from '../lib/audio/soundEngine';

describe('Audio Engine Utilities', () => {
  it('detects pitch accurately via autoCorrelate', () => {
    const sampleRate = 44100;
    const targetFreq = 440; // A4
    const bufferSize = 2048;
    const buffer = new Float32Array(bufferSize);

    for (let i = 0; i < bufferSize; i++) {
      buffer[i] = Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
    }

    const result = autoCorrelate(buffer, sampleRate);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.midi).toBe(69);
      expect(result.noteName).toBe('A');
      expect(Math.abs(result.frequency - targetFreq)).toBeLessThan(5);
    }
  });

  it('handles quiet audio buffer gracefully', () => {
    const buffer = new Float32Array(1024);
    expect(autoCorrelate(buffer, 44100)).toBeNull();
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
