/**
 * Microphone Input Pitch Detection Engine & Music Theory Calculations
 * Uses Auto-Correlation with parabolic interpolation, confidence/voicing thresholds,
 * octave handling, cents deviation, and solfège/scale-degree conversions.
 */

export interface PitchAnalysisResult {
  frequency: number;
  midi: number;
  pitchClass: number;
  octave: number;
  noteName: string;
  fullName: string;
  centsDeviation: number;
  clarity: number; // 0 to 1
  solfege: string;
  scaleDegree: string;
}

export interface ExtendedPitchInfo {
  midi: number;
  pitchClass: number;
  octave: number;
  noteName: string;
  fullName: string;
  cents: number;
  solfege: string;
  scaleDegree: string;
}

export interface PitchDetectionOptions {
  clarityThreshold?: number; // 0 to 1, default 0.6
  minRms?: number;           // default 0.01
  minFreq?: number;          // default 50
  maxFreq?: number;          // default 2000
  preferFlat?: boolean;
  keyTonicPc?: number;       // 0-11, default 0 (C)
}

export interface PitchEvaluationOptions {
  toleranceCents?: number;    // default 50 cents
  clarityThreshold?: number;  // default 0.6
  minValidFrames?: number;    // default 3
  allowOctaveShift?: boolean; // default true
}

export interface PitchEvaluationResult {
  isCorrect: boolean;
  pitchScore: number;  // 0 to 100
  rhythmScore: number; // 0 to 100
  totalScore: number;  // 0 to 100
  averageCents: number;
  detectedMidi: number | null;
  detectedFullName: string | null;
  feedback: string;
}

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const SOLFEGE_SHARP = ['Do', 'Di', 'Re', 'Ri', 'Mi', 'Fa', 'Fi', 'Sol', 'Si', 'La', 'Li', 'Ti'];
const SOLFEGE_FLAT = ['Do', 'Ra', 'Re', 'Me', 'Mi', 'Fa', 'Se', 'Sol', 'Le', 'La', 'Te', 'Ti'];

const SCALE_DEGREES_SHARP = ['1', '♯1', '2', '♯2', '3', '4', '♯4', '5', '♯5', '6', '♯6', '7'];
const SCALE_DEGREES_FLAT = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];

let scratchBuffer = new Float32Array(2048);

function getScratchBuffer(size: number): Float32Array {
  if (scratchBuffer.length < size) {
    scratchBuffer = new Float32Array(size);
  } else {
    scratchBuffer.fill(0, 0, size);
  }
  return scratchBuffer;
}

/**
 * Returns solfège syllable for a pitch class relative to a tonic key.
 */
export function getSolfegeForPitchClass(pitchClass: number, keyTonicPc = 0, preferFlat = false): string {
  const relPc = ((pitchClass - keyTonicPc) % 12 + 12) % 12;
  return preferFlat ? SOLFEGE_FLAT[relPc] : SOLFEGE_SHARP[relPc];
}

/**
 * Returns scale degree label for a pitch class relative to a tonic key.
 */
export function getScaleDegreeForPitchClass(pitchClass: number, keyTonicPc = 0, preferFlat = false): string {
  const relPc = ((pitchClass - keyTonicPc) % 12 + 12) % 12;
  return preferFlat ? SCALE_DEGREES_FLAT[relPc] : SCALE_DEGREES_SHARP[relPc];
}

/**
 * Formats note name with octave (e.g. C4, F#3, Eb5).
 */
export function getNoteNameWithOctave(midi: number, preferFlat = false): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const noteName = preferFlat ? NOTE_NAMES_FLAT[pitchClass] : NOTE_NAMES_SHARP[pitchClass];
  return `${noteName}${octave}`;
}

/**
 * Converts frequency in Hz to MIDI note number, cents deviation, note name, and solfège.
 */
export function freqToMidi(freq: number, preferFlat = false, keyTonicPc = 0): ExtendedPitchInfo {
  if (!freq || freq <= 0 || isNaN(freq) || !isFinite(freq)) {
    return {
      midi: 0,
      pitchClass: 0,
      octave: -1,
      noteName: 'C',
      fullName: 'C-1',
      cents: 0,
      solfege: 'Do',
      scaleDegree: '1',
    };
  }

  const midiExact = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(midiExact);
  const cents = Math.round((midiExact - midi) * 100);
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const noteName = preferFlat ? NOTE_NAMES_FLAT[pitchClass] : NOTE_NAMES_SHARP[pitchClass];
  const fullName = `${noteName}${octave}`;
  const solfege = getSolfegeForPitchClass(pitchClass, keyTonicPc, preferFlat);
  const scaleDegree = getScaleDegreeForPitchClass(pitchClass, keyTonicPc, preferFlat);

  return {
    midi,
    pitchClass,
    octave,
    noteName,
    fullName,
    cents,
    solfege,
    scaleDegree,
  };
}

/**
 * Standard McLeod / Auto-Correlation pitch detection algorithm for raw audio buffer.
 */
export function autoCorrelate(
  buffer: Float32Array,
  sampleRate: number,
  options: PitchDetectionOptions = {}
): PitchAnalysisResult | null {
  const clarityThreshold = options.clarityThreshold ?? 0.6;
  const minRms = options.minRms ?? 0.01;
  const minFreq = options.minFreq ?? 50;
  const maxFreq = options.maxFreq ?? 2000;
  const preferFlat = options.preferFlat ?? false;
  const keyTonicPc = options.keyTonicPc ?? 0;

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
  if (rms < minRms) return null;

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
  if (isNaN(freq) || !isFinite(freq) || freq < minFreq || freq > maxFreq) return null;

  const clarity = c[0] > 0 ? Math.min(1, Math.max(0, maxval / c[0])) : 0;
  if (clarity < clarityThreshold) return null;

  const info = freqToMidi(freq, preferFlat, keyTonicPc);

  return {
    frequency: Math.round(freq * 10) / 10,
    midi: info.midi,
    pitchClass: info.pitchClass,
    octave: info.octave,
    noteName: info.noteName,
    fullName: info.fullName,
    centsDeviation: info.cents,
    clarity: Math.round(clarity * 100) / 100,
    solfege: info.solfege,
    scaleDegree: info.scaleDegree,
  };
}

/**
 * Deterministic Sung Pitch Evaluator.
 * Evaluates an array of pitch frames against target pitch(es).
 * Prevents false positives when signal is silent, noisy, or outside target range.
 */
export function evaluateSungPitch(
  pitchResults: (PitchAnalysisResult | null)[],
  target: number | number[],
  options: PitchEvaluationOptions = {}
): PitchEvaluationResult {
  const toleranceCents = options.toleranceCents ?? 50;
  const clarityThreshold = options.clarityThreshold ?? 0.6;
  const minValidFrames = options.minValidFrames ?? 3;
  const allowOctaveShift = options.allowOctaveShift ?? true;

  const validFrames = pitchResults.filter(
    (res): res is PitchAnalysisResult => res !== null && res.clarity >= clarityThreshold
  );

  if (validFrames.length < minValidFrames) {
    return {
      isCorrect: false,
      pitchScore: 0,
      rhythmScore: 0,
      totalScore: 0,
      averageCents: 0,
      detectedMidi: null,
      detectedFullName: null,
      feedback: 'No clear vocal pitch detected. Please sing clearly into the microphone.',
    };
  }

  // Find most frequent detected MIDI pitch (mode)
  const midiCounts: Record<number, number> = {};
  validFrames.forEach(f => {
    midiCounts[f.midi] = (midiCounts[f.midi] || 0) + 1;
  });

  let modeMidi = validFrames[0].midi;
  let maxCount = 0;
  for (const [mStr, cnt] of Object.entries(midiCounts)) {
    const cntNum = cnt as number;
    if (cntNum > maxCount) {
      maxCount = cntNum;
      modeMidi = parseInt(mStr, 10);
    }
  }

  const matchingFrames = validFrames.filter(f => f.midi === modeMidi);
  const avgCents = Math.round(
    matchingFrames.reduce((acc, f) => acc + f.centsDeviation, 0) / matchingFrames.length
  );
  const detectedFullName = getNoteNameWithOctave(modeMidi);

  // Single target MIDI evaluation
  if (typeof target === 'number') {
    const targetMidi = target;
    const targetFullName = getNoteNameWithOctave(targetMidi);
    const semitoneDiff = Math.abs(modeMidi - targetMidi);
    const isOctaveTransposed = allowOctaveShift && semitoneDiff % 12 === 0 && semitoneDiff > 0;
    const isExactMidiMatch = modeMidi === targetMidi;

    if (!isExactMidiMatch && !isOctaveTransposed) {
      return {
        isCorrect: false,
        pitchScore: Math.max(0, 100 - semitoneDiff * 15),
        rhythmScore: 60,
        totalScore: Math.round(Math.max(0, 100 - semitoneDiff * 15) * 0.7),
        averageCents: avgCents,
        detectedMidi: modeMidi,
        detectedFullName,
        feedback: `Sung pitch ${detectedFullName} does not match target ${targetFullName}.`,
      };
    }

    const absCents = Math.abs(avgCents);
    let pitchScore = 100;
    if (absCents > 15 && absCents <= 35) {
      pitchScore = 88;
    } else if (absCents > 35 && absCents <= toleranceCents) {
      pitchScore = 75;
    } else if (absCents > toleranceCents) {
      pitchScore = 50;
    }

    if (isOctaveTransposed) {
      pitchScore = Math.round(pitchScore * 0.85); // minor octave penalty
    }

    const rhythmScore = pitchResults.length > 0
      ? Math.min(100, Math.round((validFrames.length / pitchResults.length) * 120))
      : 0;
    const totalScore = Math.round(pitchScore * 0.7 + rhythmScore * 0.3);
    const isCorrect = absCents <= toleranceCents && (isExactMidiMatch || isOctaveTransposed);

    const feedback = isCorrect
      ? isOctaveTransposed
        ? `Correct pitch class ${detectedFullName} (transposed octave, ${avgCents > 0 ? '+' : ''}${avgCents} cents).`
        : `Accurate pitch! ${detectedFullName} (${avgCents > 0 ? '+' : ''}${avgCents} cents).`
      : `Pitch deviation too wide (${avgCents > 0 ? '+' : ''}${avgCents} cents).`;

    return {
      isCorrect,
      pitchScore,
      rhythmScore,
      totalScore,
      averageCents: avgCents,
      detectedMidi: modeMidi,
      detectedFullName,
      feedback,
    };
  }

  // Multi-note target sequence evaluation
  const targetMidis = target;
  let matchedCount = 0;
  targetMidis.forEach(tMidi => {
    const pitchClassMatch = validFrames.some(
      f => f.midi === tMidi || (allowOctaveShift && Math.abs(f.midi - tMidi) % 12 === 0)
    );
    if (pitchClassMatch) matchedCount++;
  });

  const accuracyRatio = targetMidis.length > 0 ? matchedCount / targetMidis.length : 0;
  const pitchScore = Math.round(accuracyRatio * 100);
  const rhythmScore = pitchResults.length > 0
    ? Math.min(100, Math.round((validFrames.length / pitchResults.length) * 100))
    : 0;
  const totalScore = Math.round(pitchScore * 0.7 + rhythmScore * 0.3);
  const isCorrect = accuracyRatio >= 0.75;

  return {
    isCorrect,
    pitchScore,
    rhythmScore,
    totalScore,
    averageCents: avgCents,
    detectedMidi: modeMidi,
    detectedFullName,
    feedback: isCorrect
      ? `Sequence sung accurately (${matchedCount}/${targetMidis.length} target notes detected).`
      : `Incomplete phrase detection (${matchedCount}/${targetMidis.length} target notes matched).`,
  };
}
