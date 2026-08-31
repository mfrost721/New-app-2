# Bolt's Journal - Critical Learnings

## 2026-08-31 - Audio Pitch Detection Auto-Correlation Optimization
**Learning:** In real-time Web Audio processing (60 FPS), `Float32Array.prototype.slice` allocates a new ArrayBuffer slice on every frame, causing garbage collection pauses. Replacing `.slice()` with `.subarray()` avoids allocation, and using a local accumulator in inner correlation loops prevents redundant indexed writes to Float32Array.
**Action:** Use `.subarray()` for zero-copy views on Float32Array audio buffers and compute accumulators in scalar local variables.
