# Interactive ASCII Background — Design

**Date:** 2026-06-13
**Status:** Approved (design), pending implementation
**Component:** `src/islands/ascii-bg.ts`

## Goal

Make the animated ASCII background react subtly to the user's pointer and
scroll, fulfilling the "ASCII background reacting subtly to cursor/scroll"
item from the README's Future Plans. Two effects:

1. **Cursor spotlight** — glyphs near the pointer brighten (drift toward the
   dense end of the ramp, `#%@`), as if the cursor lights up that region.
2. **Scroll/cursor parallax** — the field drifts a few cells as the user
   scrolls, plus a *very* slight horizontal drift tied to cursor X.

Both are intentionally understated. All tuning lives in named constants.

## Architecture

Keep `sample(x, y, t, phase)` pure and unchanged — it remains the base flow
field. The two new effects are layered on without touching it:

- **Parallax** is applied at the *input* to `sample()`: the coordinates fed in
  are offset by a scroll/cursor-derived delta.
- **Spotlight** is applied at the *output*, as a post-process inside
  `renderLayers`: after the base brightness for a cell is computed, a radial
  boost is added and the result clamped to `[0, 1]` before glyph selection.

This keeps both effects trivially unit-testable as pure functions and avoids
coupling the field function to DOM/event state.

### New pure helpers (exported, testable)

```
// Radial falloff in [0,1]: 1 at the spotlight center, 0 at/after RADIUS.
// Smooth (not linear) falloff for a soft edge.
spotlight(c, r, sx, sy, radius): number

// base brightness + spotlight boost, clamped to [0,1].
applySpotlight(base, boost, strength): number
```

`renderLayers` gains optional parameters for spotlight center + parallax
offset. When the spotlight is inactive (no pointer) or reduced-motion is on,
callers pass values that make both helpers no-ops, so existing behavior and
existing tests are preserved (defaults must keep the current output identical).

### Tunable constants (top of file)

| Constant | Default | Meaning |
|---|---|---|
| `SPOTLIGHT_RADIUS` | ~14 cells | spotlight reach |
| `SPOTLIGHT_STRENGTH` | ~0.5 | max brightness boost at center |
| `SPOTLIGHT_EASE` | 0.08 | per-frame lerp toward pointer target |
| `SCROLL_PARALLAX` | ~0.02 cells/px | vertical drift per scrolled pixel |
| `CURSOR_PARALLAX_X` | very small | horizontal drift per cursor-X fraction |

## Data flow (per frame)

1. `pointermove` updates target `(mouseX, mouseY)` in px (passive listener).
2. `scroll` updates `scrollY` (passive listener).
3. In `frame(now)`:
   - Ease the active spotlight position toward the target:
     `pos += (target - pos) * SPOTLIGHT_EASE`.
   - Convert eased px position → cell coords via measured `charW` / `LINE_HEIGHT`.
   - Compute parallax offset from `scrollY` (and cursor X).
   - Call `renderLayers(cols, rows, t, phases, { spotlight, parallax })`.
4. `renderLayers` offsets sample inputs by parallax and post-processes each
   cell's brightness with the spotlight boost.

## Accessibility & edge cases

- **Reduced motion:** if `matchMedia('(prefers-reduced-motion: reduce)')`
  matches, both new interactions are disabled (no spotlight, no parallax).
  The existing base animation's behavior is left unchanged — this spec does
  not alter whether the base loop respects reduced motion (it currently does
  not); changing that is out of scope.
- **No pointer (touch/mobile):** spotlight never activates (no `pointermove`);
  scroll parallax still works.
- **Astro navigation:** `#ascii-bg` uses `transition:persist`, so init runs
  once. New listeners attach once; spotlight target initializes to a neutral
  off-screen / inactive state so no jump occurs before first pointer move.
- **Resize:** parallax/spotlight use the same measured metrics as the grid, so
  they stay aligned through the existing `measure()` path.

## Testing

Extend `tests/islands/ascii-bg.test.ts` (pure-function tests only, no DOM):

- `spotlight()`: returns ~1 at center, 0 at/beyond `radius`, monotonically
  non-increasing with distance, always within `[0, 1]`.
- `applySpotlight()`: never returns outside `[0, 1]`; boost only raises (never
  lowers) brightness; zero boost returns base unchanged.
- `renderLayers` with no-op spotlight/parallax args produces output identical
  to the current signature (regression guard).
- `renderLayers` with a parallax offset equals calling the field at shifted
  coordinates.

## Out of scope

- Particle/physics systems, ripple effects, repel/displacement.
- Changing the base animation's reduced-motion behavior.
- Mobile-specific touch gestures beyond the existing scroll parallax.
