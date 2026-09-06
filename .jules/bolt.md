## 2026-09-04 - Precalc SVG Clock Geometry & O(1) Set Lookups
**Learning:** SVG components with fixed circular layouts (like 12-pitch-class clock faces) recompute identical trigonometric coordinates (`Math.cos`/`Math.sin`) and pitch class note string conversions on every render unless hoisted to module constants.
**Action:** Precalculate static geometry arrays and note labels at module scope and use memoized `Set` structures for O(1) membership checks in SVG clock visualizers.

## 2026-09-06 - Piano Keyboard Visualizer Set Lookups & Array Hoisting
**Learning:** Keyboard visualizers re-render frequently during live MIDI and click interactions. Evaluating `.includes()` array membership and allocating temporary pitch-class arrays inside per-key render loops creates $O(K \times M)$ linear operations and frequent GC churn.
**Action:** Hoist static pitch-class boolean lookups (e.g. `IS_BLACK_KEY`) to module constants, memoize key arrays, and use memoized `Set` instances for active/pressed note lookups.
