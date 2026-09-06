## 2026-08-31 - Accessibility for Interactive Piano Keyboard Components
**Learning:** Interactive audio visualizers like piano keyboard components render individual key buttons that need specific `aria-label` attributes containing complete pitch and octave/MIDI context (e.g. `Piano key C4 (MIDI 60)`), along with `aria-pressed` states and `focus-visible` ring indicators so keyboard and screen reader users can perceive and interact with key states effectively.
**Action:** When building interactive musical components, always assign full pitch/octave metadata in `aria-label`, reflect active state in `aria-pressed`, and ensure custom z-index/ring handling on `focus-visible`.

## 2026-09-06 - Focus-Visible Rings on Score Notes and Navigation ARIA Attributes
**Learning:** Interactive music notation components overlaid on dark background staff lines (like `ScoreViewer`) require explicit `focus-visible:ring-2`, `focus-visible:ring-amber-400`, and `focus-visible:ring-offset-slate-950` so focus indicators remain visible when tabbing through notes. Additionally, SPA sidebar navigation links must declare `aria-current={isActive ? 'page' : undefined}` to inform screen readers of the active page.
**Action:** Always combine `aria-current` on active navigation links with offset-aware `focus-visible` ring styling on custom interactive notation and score elements.
