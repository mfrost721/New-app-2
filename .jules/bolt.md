## 2026-09-04 - Precalc SVG Clock Geometry & O(1) Set Lookups
**Learning:** SVG components with fixed circular layouts (like 12-pitch-class clock faces) recompute identical trigonometric coordinates (`Math.cos`/`Math.sin`) and pitch class note string conversions on every render unless hoisted to module constants.
**Action:** Precalculate static geometry arrays and note labels at module scope and use memoized `Set` structures for O(1) membership checks in SVG clock visualizers.
