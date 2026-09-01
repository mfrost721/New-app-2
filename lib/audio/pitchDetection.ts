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

let scratchZeroMean = new Float32Array(2048);
let scratchCorrelation = new Float32Array(2048);
let scratchEnergy = new Float32Array(2048);

function getScratchBuffers(size: number): {
  zeroMean: Float32Array;
  correlation: Float32Array;
  energy: Float32Array;
} {
  if (scratchZeroMean.length < size) {
    scratchZeroMean = new Float32Array(size);
    scratchCorrelation = new Float32Array(size);
    scratchEnergy = new Float32Array(size);
  } else {
    scratchZeroMean.fill(0, 0, size);
    scratchCorrelation.fill(0, 0, size);
    scratchEnergy.fill(0, 0, size);
  }
  return {
    zeroMean: scratchZeroMean,
    correlation: scratchCorrelation,
    energy: scratchEnergy,
  };
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

  // 1. Calculate RMS and mean (DC offset)
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    sum += val;
    sumSq += val * val;
  }
  const mean = sum / SIZE;
  const rms = Math.sqrt(Math.max(0, (sumSq / SIZE) - (mean * mean)));

  // Signal too quiet
  if (rms < minRms) return null;

  // 2. Prepare zero-mean buffer and scratch space
  const { zeroMean, correlation, energy } = getScratchBuffers(SIZE);
  for (let i = 0; i < SIZE; i++) {
    zeroMean[i] = buffer[i] - mean;
  }

  // 3. Lag bounds search based on target frequency limits
  // lag = sampleRate / freq => maxLag corresponds to minFreq, minLag corresponds to maxFreq
  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq));
  const maxLag = Math.min(SIZE - 2, Math.ceil(sampleRate / minFreq));

  if (minLag >= maxLag || maxLag >= SIZE - 1) return null;

  // 4. Compute Autocorrelation and Normalized Square Difference Function (NSDF) energy term
  // energy[0] = sum_{j=0}^{SIZE-1} x[j]^2
  // energy[k] = sum_{j=0}^{SIZE-1-k} (x[j]^2 + x[j+k]^2)
  let sumSqZeroMean = 0;
  for (let j = 0; j < SIZE; j++) {
    const val = zeroMean[j];
    sumSqZeroMean += val * val;
  }

  if (sumSqZeroMean <= 0) return null;

  // Cumulative energy calculation for NSDF normalization:
  // m(k) = sum_{j=0}^{SIZE-1-k} x[j]^2 + x[j+k]^2
  let headSum = sumSqZeroMean;
  let tailSum = sumSqZeroMean;

  energy[0] = 2 * sumSqZeroMean;

  for (let k = 1; k <= maxLag + 1; k++) {
    headSum -= zeroMean[SIZE - k] * zeroMean[SIZE - k];
    tailSum -= zeroMean[k - 1] * zeroMean[k - 1];
    energy[k] = headSum + tailSum;
  }

  // Autocorrelation r(k) = sum_{j=0}^{SIZE-1-k} x[j] * x[j+k]
  correlation[0] = sumSqZeroMean;
  const startLag = Math.max(1, minLag - 1);

  for (let k = startLag; k <= maxLag + 1; k++) {
    let acc = 0;
    const limit = SIZE - k;
    for (let j = 0; j < limit; j++) {
      acc += zeroMean[j] * zeroMean[j + k];
    }
    correlation[k] = acc;
  }

  // 5. NSDF term: R(k) = 2 * r(k) / m(k)
  // Store normalized correlation in correlation array
  const nsdf = correlation; // reuse correlation buffer for NSDF values
  const m0 = energy[0];
  nsdf[0] = m0 > 0 ? (2 * correlation[0]) / m0 : 0;

  for (let k = startLag; k <= maxLag + 1; k++) {
    const mK = energy[k];
    nsdf[k] = mK > 0 ? (2 * correlation[k]) / mK : 0;
  }

  // 6. Find local key peaks in NSDF (McLeod Pitch Method)
  // Peak searching: find positively valued local maxima in range minLag..maxLag
  const peaks: { lag: number; nsdfVal: number }[] = [];
  let maxNsdfVal = -1;

  for (let k = minLag; k <= maxLag; k++) {
    if (nsdf[k] > 0 && nsdf[k] >= nsdf[k - 1] && nsdf[k] >= nsdf[k + 1]) {
      if (nsdf[k] > maxNsdfVal) {
        maxNsdfVal = nsdf[k];
      }
      peaks.push({ lag: k, nsdfVal: nsdf[k] });
    }
  }

  if (peaks.length === 0 || maxNsdfVal <= 0) {
    return null;
  }

  // 7. Octave selection thresholding: pick first peak whose NSDF is within 85% of max peak
  const peakThreshold = 0.85 * maxNsdfVal;
  let selectedPeak = peaks[0];

  for (let i = 0; i < peaks.length; i++) {
    if (peaks[i].nsdfVal >= peakThreshold) {
      selectedPeak = peaks[i];
      break;
    }
  }

  const k = selectedPeak.lag;

  // 8. Parabolic interpolation for sub-sample accuracy around selected lag k
  const y1 = nsdf[k - 1];
  const y2 = nsdf[k];
  const y3 = nsdf[k + 1];

  let delta = 0;
  const denom = (2 * y2 - y1 - y3);
  if (denom !== 0) {
    delta = (y3 - y1) / (2 * denom);
  }

  const refinedLag = k + delta;
  if (!refinedLag || refinedLag <= 0) return null;

  const freq = sampleRate / refinedLag;
  if (isNaN(freq) || !isFinite(freq) || freq < minFreq || freq > maxFreq) return null;

  // Clarity is the peak NSDF value (range 0 to 1)
  const interpolatedPeakVal = y2 + 0.5 * delta * (y3 - y1);
  const clarity = Math.min(1, Math.max(0, interpolatedPeakVal));
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
