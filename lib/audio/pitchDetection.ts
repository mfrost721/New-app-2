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

let scratchBuffer = new Float32Array(2048);

function getScratchBuffer(size: number): Float32Array {
  if (scratchBuffer.length < size) {
    scratchBuffer = new Float32Array(size);
  } else {
    scratchBuffer.fill(0, 0, size);
  }
  return scratchBuffer;
}

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
  if (!buffer || buffer.length === 0 || !sampleRate || sampleRate <= 0) {
    return null;
  }

  const SIZE = buffer.length;
  if (SIZE < 64) return null;

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

  for (let i = 0; i < Math.floor(SIZE / 2); i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < Math.floor(SIZE / 2); i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const buf = r2 > r1 ? buffer.subarray(r1, r2) : buffer;
  const newSize = buf.length;
  if (newSize < 32) return null;

  const c = getScratchBuffer(newSize);
  for (let i = 0; i < newSize; i++) {
    for (let j = 0; j < newSize - i; j++) {
      c[i] += buf[j] * buf[j + i];
    }
  }

  if (newSize < 3) return null;

  let d = 0;
  while (d < newSize - 1 && c[d] > c[d + 1]) {
    d++;
  }

  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < newSize; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  if (maxpos <= 0 || maxpos >= newSize - 1 || maxval <= 0) {
    return null;
  }

  let T0 = maxpos;
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];

  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a !== 0) {
    T0 = T0 - b / (2 * a);
  }

  if (!T0 || T0 <= 0) return null;

  const freq = sampleRate / T0;
  if (isNaN(freq) || !isFinite(freq) || freq < 50 || freq > 2000) return null;

  const { midi, noteName, cents } = freqToMidi(freq);

  const clarity = c[0] > 0 ? Math.min(1, Math.max(0, Math.round((maxval / c[0]) * 100) / 100)) : 0;

  return {
    frequency: Math.round(freq * 10) / 10,
    midi,
    noteName,
    centsDeviation: cents,
    clarity,
  };
}
