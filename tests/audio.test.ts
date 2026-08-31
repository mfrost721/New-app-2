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

  it('safely handles empty, quiet, or short pitch detection buffers', () => {
    expect(autoCorrelate(new Float32Array(0), 44100)).toBeNull();
    expect(autoCorrelate(new Float32Array(32), 44100)).toBeNull();
    expect(autoCorrelate(new Float32Array(512), 44100)).toBeNull(); // All zeros / quiet
  });
});
