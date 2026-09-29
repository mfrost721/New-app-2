import { describe, it, expect, beforeEach } from 'vitest';
import {
  autoCorrelate,
  freqToMidi,
  getSolfegeForPitchClass,
  getScaleDegreeForPitchClass,
  getNoteNameWithOctave,
  evaluateSungPitch,
  calcBoundedLag,
  isPitchInTune,
  isPitchWithinTolerance,
  isPitchConfidenceValid,
  PitchAnalysisResult,
} from '../lib/audio/pitchDetection';
import { soundEngine } from '../lib/audio/soundEngine';
import {
  parseMIDIMessage,
  MIDIController,
  WebMidiAccess,
  WebMidiInput,
} from '../lib/audio/midi';

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

  describe('Pitch Detection Pure Threshold Helpers & Lag Bounding', () => {
    it('calculates lag bounding correctly based on minFreq and buffer size', () => {
      // 44100 / 50 = 882 + 2 = 884
      expect(calcBoundedLag(44100, 50, 2048)).toBe(884);
      // Small buffer size caps lag
      expect(calcBoundedLag(44100, 50, 512)).toBe(512);
      // Fallback for edge cases
      expect(calcBoundedLag(0, 50, 1024)).toBe(1024);
    });

    it('evaluates pitch cents in tune and tolerance thresholds correctly', () => {
      expect(isPitchInTune(10)).toBe(true);
      expect(isPitchInTune(-15)).toBe(true);
      expect(isPitchInTune(16)).toBe(false);

      expect(isPitchWithinTolerance(25)).toBe(true);
      expect(isPitchWithinTolerance(-30)).toBe(true);
      expect(isPitchWithinTolerance(31)).toBe(false);
    });

    it('validates confidence threshold accurately', () => {
      expect(isPitchConfidenceValid(0.8, 0.6)).toBe(true);
      expect(isPitchConfidenceValid(0.59, 0.6)).toBe(false);
      expect(isPitchConfidenceValid(NaN, 0.6)).toBe(false);
    });
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
        confidence: 0.95,
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
        confidence: 0.9,
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
        confidence: 0.9,
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

describe('Web MIDI Message Parsing & Controller Hardening', () => {
  it('parses Note On and Note Off messages correctly', () => {
    // Note On Middle C (velocity 100)
    const noteOn = parseMIDIMessage(new Uint8Array([0x90, 60, 100]));
    expect(noteOn).toEqual({ note: 60, velocity: 100, type: 'noteon' });

    // Note Off Middle C (velocity 0 on 0x90 or 0x80)
    const noteOff1 = parseMIDIMessage(new Uint8Array([0x90, 60, 0]));
    expect(noteOff1).toEqual({ note: 60, velocity: 0, type: 'noteoff' });

    const noteOff2 = parseMIDIMessage(new Uint8Array([0x80, 60, 64]));
    expect(noteOff2).toEqual({ note: 60, velocity: 64, type: 'noteoff' });
  });

  it('ignores real-time system clock (0xF8), active sensing (0xFE), and non-note control change / pitch bend messages', () => {
    expect(parseMIDIMessage(new Uint8Array([0xf8]))).toBeNull(); // MIDI Clock
    expect(parseMIDIMessage(new Uint8Array([0xfe]))).toBeNull(); // Active Sensing
    expect(parseMIDIMessage(new Uint8Array([0xb0, 7, 100]))).toBeNull(); // Control Change
    expect(parseMIDIMessage(new Uint8Array([0xe0, 0, 64]))).toBeNull(); // Pitch Bend
  });

  it('handles device state changes and disconnects without throwing', async () => {
    const mockInput: WebMidiInput = {
      id: 'input-1',
      onmidimessage: null,
    };
    const mockAccess: WebMidiAccess = {
      inputs: {
        values: function* () {
          yield mockInput;
        },
      },
      onstatechange: null,
    };

    const controller = new MIDIController();
    await controller.init(mockAccess);

    let receivedMsg: unknown = null;
    controller.onNote(msg => {
      receivedMsg = msg;
    });

    // Simulate input message
    controller.handleMIDIMessage({ data: new Uint8Array([0x90, 60, 80]) });
    expect(receivedMsg).toEqual({ note: 60, velocity: 80, type: 'noteon' });

    // Simulate state change (device disconnect/reconnect)
    expect(() => {
      if (mockAccess.onstatechange) {
        mockAccess.onstatechange({ port: mockInput });
      }
    }).not.toThrow();

    controller.destroy();
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
