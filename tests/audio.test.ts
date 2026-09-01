import { describe, it, expect, beforeEach } from 'vitest';
import {
  autoCorrelate,
  freqToMidi,
  getSolfegeForPitchClass,
  getScaleDegreeForPitchClass,
  getNoteNameWithOctave,
  evaluateSungPitch,
  PitchAnalysisResult,
} from '../lib/audio/pitchDetection';
import { soundEngine } from '../lib/audio/soundEngine';

// Mock Web Audio API for browser environment simulation
class MockAudioNode {
  connect() {}
  disconnect() {}
}

class MockGainNode extends MockAudioNode {
  gain = {
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
  };
}

class MockOscillatorNode extends MockAudioNode {
  frequency = {
    setValueAtTime: () => {},
  };
  type = 'sine';
  onended: (() => void) | null = null;
  start() {}
  stop() {
    if (this.onended) this.onended();
  }
}

class MockAudioContext {
  state = 'suspended';
  currentTime = 0;
  destination = new MockAudioNode();
  resume = async () => {
    this.state = 'running';
  };
  createGain = () => new MockGainNode();
  createOscillator = () => new MockOscillatorNode();
}

if (typeof window !== 'undefined') {
  (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
}

function generateSineBuffer(freq: number, sampleRate = 44100, durationSec = 0.1): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buffer[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return buffer;
}

function generateNoiseBuffer(sampleRate = 44100, durationSec = 0.1): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);
  // Deterministic pseudo-random noise using a simple LCG to avoid flaky tests
  let seed = 42;
  for (let i = 0; i < numSamples; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    buffer[i] = ((seed / 0x80000000) - 1) * 0.5;
  }
  return buffer;
}

describe('Pitch Detection & Theory Conversions Engine', () => {
  it('converts frequency to MIDI note, octave, cents deviation, and solfège', () => {
    const resA4 = freqToMidi(440);
    expect(resA4.midi).toBe(69);
    expect(resA4.pitchClass).toBe(9);
    expect(resA4.octave).toBe(4);
    expect(resA4.noteName).toBe('A');
    expect(resA4.fullName).toBe('A4');
    expect(resA4.cents).toBe(0);
    expect(resA4.solfege).toBe('La');

    const resC4 = freqToMidi(261.63);
    expect(resC4.midi).toBe(60);
    expect(resC4.pitchClass).toBe(0);
    expect(resC4.octave).toBe(4);
    expect(resC4.fullName).toBe('C4');
    expect(resC4.solfege).toBe('Do');

    const resC3 = freqToMidi(130.81);
    expect(resC3.midi).toBe(48);
    expect(resC3.octave).toBe(3);
    expect(resC3.fullName).toBe('C3');

    const resC5 = freqToMidi(523.25);
    expect(resC5.midi).toBe(72);
    expect(resC5.octave).toBe(5);
    expect(resC5.fullName).toBe('C5');
  });

  it('handles flat note preferences and chromatic solfege / scale degrees', () => {
    const resFlat = freqToMidi(311.13, true); // Eb4 / D#4
    expect(resFlat.noteName).toBe('Eb');
    expect(resFlat.fullName).toBe('Eb4');

    expect(getSolfegeForPitchClass(4, 0)).toBe('Mi'); // 3rd degree in C Major
    expect(getSolfegeForPitchClass(3, 0, true)).toBe('Me'); // ♭3 degree
    expect(getScaleDegreeForPitchClass(7, 0)).toBe('5'); // 5th degree
    expect(getScaleDegreeForPitchClass(1, 0, true)).toBe('♭2');
    expect(getNoteNameWithOctave(64, true)).toBe('E4');
  });

  it('safely handles invalid, zero, or edge-case frequencies in freqToMidi', () => {
    const resZero = freqToMidi(0);
    expect(resZero.midi).toBe(0);
    expect(resZero.fullName).toBe('C-1');

    const resNaN = freqToMidi(NaN);
    expect(resNaN.midi).toBe(0);
  });

  it('detects pitch accurately from pure sine wave buffers', () => {
    const sampleRate = 44100;

    // Test 440 Hz (A4)
    const bufA4 = generateSineBuffer(440, sampleRate, 0.1);
    const resA4 = autoCorrelate(bufA4, sampleRate, { clarityThreshold: 0.5 });
    expect(resA4).not.toBeNull();
    if (resA4) {
      expect(Math.abs(resA4.frequency - 440)).toBeLessThan(5);
      expect(resA4.midi).toBe(69);
      expect(resA4.fullName).toBe('A4');
      expect(resA4.clarity).toBeGreaterThan(0.5);
    }

    // Test 261.63 Hz (C4)
    const bufC4 = generateSineBuffer(261.63, sampleRate, 0.1);
    const resC4 = autoCorrelate(bufC4, sampleRate, { clarityThreshold: 0.5 });
    expect(resC4).not.toBeNull();
    if (resC4) {
      expect(Math.abs(resC4.frequency - 261.63)).toBeLessThan(5);
      expect(resC4.midi).toBe(60);
      expect(resC4.fullName).toBe('C4');
    }
  });

  it('rejects silent or unvoiced noise buffers without false positives', () => {
    const sampleRate = 44100;

    // Silence
    expect(autoCorrelate(new Float32Array(0), sampleRate)).toBeNull();
    expect(autoCorrelate(new Float32Array(512), sampleRate)).toBeNull();

    // Noise buffer
    const bufNoise = generateNoiseBuffer(sampleRate, 0.1);
    const resNoise = autoCorrelate(bufNoise, sampleRate, { clarityThreshold: 0.7 });
    expect(resNoise).toBeNull();
  });

  describe('Deterministic Sung Pitch Evaluator', () => {
    it('returns score 0 and helpful feedback on silent or insufficient voice frames', () => {
      const evaluation = evaluateSungPitch([null, null, null], 60);
      expect(evaluation.isCorrect).toBe(false);
      expect(evaluation.totalScore).toBe(0);
      expect(evaluation.pitchScore).toBe(0);
      expect(evaluation.feedback).toContain('No clear vocal pitch detected');
    });

    it('evaluates exact matching pitch correctly', () => {
      const mockResult: PitchAnalysisResult = {
        frequency: 261.6,
        midi: 60,
        pitchClass: 0,
        octave: 4,
        noteName: 'C',
        fullName: 'C4',
        centsDeviation: 2,
        clarity: 0.95,
        solfege: 'Do',
        scaleDegree: '1',
      };

      const frames = [mockResult, mockResult, mockResult, mockResult, mockResult];
      const evaluation = evaluateSungPitch(frames, 60);

      expect(evaluation.isCorrect).toBe(true);
      expect(evaluation.pitchScore).toBe(100);
      expect(evaluation.totalScore).toBeGreaterThan(80);
      expect(evaluation.detectedMidi).toBe(60);
      expect(evaluation.detectedFullName).toBe('C4');
      expect(evaluation.feedback).toContain('Accurate pitch!');
    });

    it('handles octave transposition gracefully when enabled', () => {
      const mockResultC5: PitchAnalysisResult = {
        frequency: 523.25,
        midi: 72, // C5 instead of target 60 C4
        pitchClass: 0,
        octave: 5,
        noteName: 'C',
        fullName: 'C5',
        centsDeviation: 0,
        clarity: 0.9,
        solfege: 'Do',
        scaleDegree: '1',
      };

      const frames = [mockResultC5, mockResultC5, mockResultC5, mockResultC5];
      const evaluation = evaluateSungPitch(frames, 60, { allowOctaveShift: true });

      expect(evaluation.isCorrect).toBe(true);
      expect(evaluation.detectedMidi).toBe(72);
      expect(evaluation.feedback).toContain('transposed octave');
    });

    it('rejects incorrect pitch notes', () => {
      const mockResultD4: PitchAnalysisResult = {
        frequency: 293.66,
        midi: 62, // D4 instead of target 60 C4
        pitchClass: 2,
        octave: 4,
        noteName: 'D',
        fullName: 'D4',
        centsDeviation: 0,
        clarity: 0.9,
        solfege: 'Re',
        scaleDegree: '2',
      };

      const frames = [mockResultD4, mockResultD4, mockResultD4, mockResultD4];
      const evaluation = evaluateSungPitch(frames, 60);

      expect(evaluation.isCorrect).toBe(false);
      expect(evaluation.feedback).toContain('does not match target');
    });
  });
});

describe('Sound Synthesizer Engine', () => {
  beforeEach(() => {
    soundEngine.stopAll();
  });

  it('converts MIDI note to frequency correctly', () => {
    expect(soundEngine.midiToFreq(69)).toBe(440);
    expect(Math.round(soundEngine.midiToFreq(60) * 100) / 100).toBe(261.63);
  });

  it('schedules playback without throwing in browser / mock context', () => {
    expect(() => soundEngine.playNote(60, 1.0)).not.toThrow();
    expect(() => soundEngine.playInterval(60, 64, 1.0, false)).not.toThrow();
    expect(() => soundEngine.playChord([60, 64, 67], 1.5, true)).not.toThrow();
    expect(() => soundEngine.playScale([60, 62, 64, 65, 67, 69, 71, 72], 0.4)).not.toThrow();
    expect(() =>
      soundEngine.playProgression([
        [60, 64, 67],
        [60, 65, 69],
      ])
    ).not.toThrow();
    expect(() =>
      soundEngine.playRhythmPattern([
        { timeOffsetSec: 0, midi: 60 },
        { timeOffsetSec: 0.5, midi: 62 },
      ])
    ).not.toThrow();
  });

  it('cleans up and stops all active audio nodes on stopAll', () => {
    soundEngine.playNote(60, 2.0);
    soundEngine.playNote(64, 2.0);
    expect(() => soundEngine.stopAll()).not.toThrow();
  });
});
