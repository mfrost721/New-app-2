<<<<<<< HEAD
## 2026-03-03 - Autocorrelation Lag Bounding for Real-Time Pitch Detection
**Learning:** In audio autocorrelation routines (McLeod / NSDF), computing correlation lags up to the full buffer size (e.g. 2048) wastes >30% of CPU cycles per audio frame when minFreq limits the lowest valid detected frequency. Bounding lag to `Math.min(newSize, Math.ceil(sampleRate / minFreq) + 2)` eliminates computing discarded low-frequency correlations without affecting pitch detection accuracy.
**Action:** When working on real-time audio signal processing loops, bound lag calculations to the domain established by minFreq / maxFreq options.
=======
## 2026-09-04 - Precalc SVG Clock Geometry & O(1) Set Lookups
**Learning:** SVG components with fixed circular layouts (like 12-pitch-class clock faces) recompute identical trigonometric coordinates (`Math.cos`/`Math.sin`) and pitch class note string conversions on every render unless hoisted to module constants.
**Action:** Precalculate static geometry arrays and note labels at module scope and use memoized `Set` structures for O(1) membership checks in SVG clock visualizers.
>>>>>>> origin/main
