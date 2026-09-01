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

let scratchBuf = new Float32Array(2048);
let nsdfBuf = new Float32Array(2048);

function ensureScratchCapacity(size: number): void {
  if (scratchBuf.length < size) {
    scratchBuf = new Float32Array(size);
    nsdfBuf = new Float32Array(size);
  }
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
 * McLeod Pitch Method (MPM) / Normalized Square Difference Function (NSDF)
 * pitch detection algorithm for raw audio buffer.
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

  if (!buffer || buffer.length < 64 || !sampleRate || sampleRate <= 0) {
    return null;
  }

  const SIZE = buffer.length;

  // 1. Calculate Mean and RMS (DC offset removal)
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    sum += val;
    sumSq += val * val;
  }
  const mean = sum / SIZE;
  const rms = Math.sqrt(Math.max(0, sumSq / SIZE - mean * mean));

  // Signal too quiet
  if (rms < minRms) return null;

  // 2. Prepare zero-mean buffer in reusable scratch space
  ensureScratchCapacity(SIZE);
  for (let i = 0; i < SIZE; i++) {
    scratchBuf[i] = buffer[i] - mean;
  }

  // 3. Determine lag bounds
  const minLag = Math.max(1, Math.floor(sampleRate / maxFreq));
  const maxLag = Math.min(SIZE - 2, Math.ceil(sampleRate / minFreq));

  if (maxLag <= minLag || maxLag >= SIZE - 1) {
    return null;
  }

  // 4. Compute Normalized Square Difference Function (NSDF) / Normalized Autocorrelation
  let sumSqZeroMean = 0;
  for (let i = 0; i < SIZE; i++) {
    sumSqZeroMean += scratchBuf[i] * scratchBuf[i];
  }
  if (sumSqZeroMean <= 0) return null;

  let mk = 2 * sumSqZeroMean;
  nsdfBuf[0] = 1.0;

  for (let lag = 1; lag <= maxLag + 1; lag++) {
    let r = 0;
    const limit = SIZE - lag;
    for (let j = 0; j < limit; j++) {
      r += scratchBuf[j] * scratchBuf[j + lag];
    }
    mk -= scratchBuf[lag - 1] * scratchBuf[lag - 1] + scratchBuf[SIZE - lag] * scratchBuf[SIZE - lag];
    if (mk > 0) {
      nsdfBuf[lag] = Math.min(1.0, Math.max(-1.0, (2 * r) / mk));
    } else {
      nsdfBuf[lag] = 0;
    }
  }

  // 5. Find peak candidates after first zero-crossing
  let pos = 0;
  while (pos <= maxLag && nsdfBuf[pos] > 0) {
    pos++;
  }
  while (pos <= maxLag && nsdfBuf[pos] <= 0) {
    pos++;
  }

  if (pos > maxLag) {
    return null;
  }

  const peaks: { lag: number; val: number }[] = [];
  let maxVal = -1;

  for (let i = Math.max(pos, minLag); i <= maxLag; i++) {
    if (nsdfBuf[i] > 0 && nsdfBuf[i] >= nsdfBuf[i - 1] && nsdfBuf[i] >= nsdfBuf[i + 1]) {
      peaks.push({ lag: i, val: nsdfBuf[i] });
      if (nsdfBuf[i] > maxVal) {
        maxVal = nsdfBuf[i];
      }
    }
  }

  if (peaks.length === 0 || maxVal <= 0) {
    return null;
  }

  // Pick first peak exceeding 85% of global max peak (prevents octave errors)
  const threshold = 0.85 * maxVal;
  let selectedPeak = peaks.find(p => p.val >= threshold);
  if (!selectedPeak) {
    selectedPeak = peaks[0];
  }

  const T0_idx = selectedPeak.lag;

  // 6. Parabolic interpolation for sub-sample lag estimate
  const y1 = nsdfBuf[T0_idx - 1];
  const y2 = nsdfBuf[T0_idx];
  const y3 = nsdfBuf[T0_idx + 1];

  let T0 = T0_idx;
  const denominator = 2 * (2 * y2 - y1 - y3);
  if (denominator !== 0) {
    const delta = (y3 - y1) / denominator;
    if (Math.abs(delta) < 1) {
      T0 += delta;
    }
  }

  if (T0 <= 0) return null;

  const freq = sampleRate / T0;
  if (isNaN(freq) || !isFinite(freq) || freq < minFreq || freq > maxFreq) return null;

  const clarity = y2;
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
