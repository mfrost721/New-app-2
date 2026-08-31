/**
 * Microphone Input Pitch Detection Engine
 * Uses Auto-Correlation algorithm to detect real-time audio pitch & frequency from microphone.
 */

export interface PitchAnalysisResult {
  frequency: number;
  midi: number;
  noteName: string;
  centsDeviation: number;
  clarity: number; // 0 to 1
}

const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function freqToMidi(freq: number): { midi: number; noteName: string; cents: number } {
  const midiExact = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(midiExact);
  const cents = Math.round((midiExact - midi) * 100);
  const noteName = NOTE_NAMES_FLAT[((midi % 12) + 12) % 12];
  return { midi, noteName, cents };
}

/**
 * Standard McLeod / Auto-Correlation pitch detection algorithm for raw audio buffer.
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): PitchAnalysisResult | null {
  const SIZE = buffer.length;
  if (SIZE < 3 || !Number.isFinite(sampleRate) || sampleRate <= 0) return null;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Signal too quiet
  if (rms < 0.01) return null;

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;

  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const buf = buffer.subarray(r1, r2);
  const newSize = buf.length;
  if (newSize < 3) return null;

  const c = new Float32Array(newSize);
  for (let i = 0; i < newSize; i++) {
    let sum = 0;
    for (let j = 0; j < newSize - i; j++) {
      sum += buf[j] * buf[j + i];
    }
    c[i] = sum;
  }

  let d = 0;
  while (d + 1 < newSize && c[d] > c[d + 1]) d++;

  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < newSize; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  if (T0 <= 0 || T0 >= newSize - 1) return null;
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  if (!Number.isFinite(x1) || !Number.isFinite(x2) || !Number.isFinite(x3)) return null;

  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);
  if (!Number.isFinite(T0) || T0 <= 0) return null;

  const freq = sampleRate / T0;
  if (!Number.isFinite(freq) || freq < 50 || freq > 2000) return null;

  const { midi, noteName, cents } = freqToMidi(freq);

  return {
    frequency: Math.round(freq * 10) / 10,
    midi,
    noteName,
    centsDeviation: cents,
    clarity: c[0] > 0 ? Math.min(1, Math.round((maxval / c[0]) * 100) / 100) : 0,
  };
}
