# Bolt's Performance Journal

## 2025-05-18 - Autocorrelation Lag Search Truncation and Noise Screening
**Learning:** Truncating the autocorrelation lag search range in YIN/McLeod pitch detection (`autoCorrelate`) below lag 0 breaks noise rejection tests if the initial valley traversal (`d` loop starting at 0) is skipped or bounded away from 0. Noise buffers rely on comparing peak amplitudes across all lags relative to lag 0's energy drop to avoid false positives.
**Action:** Keep pitch detection autocorrelation lag searching full-range for noise screening, and focus component re-render optimizations on memoizing heavy matrix calculations (`MatrixGrid.tsx`) and pre-computing static SVG coordinates (`PitchClassClock.tsx`).
