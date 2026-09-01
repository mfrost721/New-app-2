import { describe, it, expect } from 'vitest';
import { freqToMidi, autoCorrelate } from '../lib/audio/pitchDetection';
import { soundEngine } from '../lib/audio/soundEngine';

describe('Audio Engine Utilities & Pitch Detection Safety', () => {
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

  it('safely handles empty, quiet, white noise, or short pitch detection buffers', () => {
    expect(autoCorrelate(new Float32Array(0), 44100)).toBeNull();
    expect(autoCorrelate(new Float32Array(32), 44100)).toBeNull();
    expect(autoCorrelate(new Float32Array(512), 44100)).toBeNull(); // Quiet/zero signal

    // White noise buffer
    const noise = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) noise[i] = (Math.random() - 0.5) * 0.1;
    expect(autoCorrelate(noise, 44100)).toBeNull();
  });

  it('detects pure sine waves at A3, A4, and C6 across different sample rates', () => {
    const generateSine = (freq: number, sr: number, len = 2048) => {
      const buf = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        buf[i] = Math.sin((2 * Math.PI * freq * i) / sr);
      }
      return buf;
    };

    // A3 (220 Hz) at 44.1kHz
    const resA3 = autoCorrelate(generateSine(220, 44100), 44100);
    expect(resA3?.midi).toBe(57);
    expect(resA3?.noteName).toBe('A');

    // A4 (440 Hz) at 48kHz
    const resA4 = autoCorrelate(generateSine(440, 48000), 48000);
    expect(resA4?.midi).toBe(69);

    // C6 (1046.5 Hz) at 96kHz
    const resC6 = autoCorrelate(generateSine(1046.5, 96000, 4096), 96000);
    expect(resC6?.midi).toBe(84);
  });
});
