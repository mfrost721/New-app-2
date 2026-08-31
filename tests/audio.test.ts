import { describe, it, expect } from 'vitest';
import { autoCorrelate, freqToMidi } from '../lib/audio/pitchDetection';
import { soundEngine } from '../lib/audio/soundEngine';

describe('Audio Engine Utilities', () => {
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

  it('detects A4 from a stable sine wave buffer', () => {
    const sampleRate = 44100;
    const targetFreq = 440;
    const size = 2048;
    const buffer = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      buffer[i] = Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
    }

    const result = autoCorrelate(buffer, sampleRate);
    expect(result).not.toBeNull();
    expect(result?.midi).toBe(69);
    expect(Math.abs((result?.frequency ?? 0) - targetFreq)).toBeLessThan(3);
  });

  it('returns null for short buffers and invalid sample rates', () => {
    expect(autoCorrelate(new Float32Array([0.1, 0.2]), 44100)).toBeNull();
    expect(autoCorrelate(new Float32Array(2048), 0)).toBeNull();
    expect(autoCorrelate(new Float32Array(2048), Number.NaN)).toBeNull();
  });
});
