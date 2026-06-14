---
title: "An ASCII background that follows your cursor"
date: 2026-06-13
tags: [meta, webdev]
description: "The flow-field background now lights up under the pointer and drifts as you scroll, layered onto the existing animation without touching its pure core."
draft: false
---

The animated ASCII background has been on the site since the beginning: three decorrelated layers of sines, sampled per cell, with the brightest layer winning each character. It looked alive but ignored you completely. As of today it reacts — a soft spotlight brightens the glyphs under the cursor, and the whole field drifts a few cells as you scroll. That clears the "ASCII background reacting subtly to cursor/scroll" line I'd had sitting on the roadmap for a while.

The whole thing lives in `src/islands/ascii-bg.ts`, and the constraint I set going in was: don't touch `sample()`. That function is the pure heart of the background — `(x, y, t, phase) → brightness` — and it has tests pinning it down. Everything new had to layer *around* it, not inside it.

# Two effects, two ends of the pipeline

The render loop is `renderLayers(cols, rows, t, phases)`: for each cell it samples every layer, keeps the brightest, and maps that brightness to a glyph via `charForBrightness`. The two interactions hook into opposite ends of that loop.

**Parallax goes in at the input.** Scrolling (and a tiny bit of horizontal cursor lean) produces an offset that's simply added to the coordinates fed to `sample()`:

```ts
const b = sample(c + parallaxX, r + parallaxY, t, phases[li]);
```

Shift the sampling coordinates and the entire field slides. Because `#ascii-bg` is `position: fixed` and the parallax is driven by `window.scrollY`, the layer stays put on screen while the pattern underneath it drifts — which is exactly the parallax feel I wanted.

**The spotlight goes on at the output.** After the brightest layer is chosen for a cell, a radial boost is added to that brightness and then clamped before glyph selection. Two pure helpers do the work:

```ts
spotlight(c, r, sx, sy, radius)   // smoothstep falloff, 1 at center → 0 at edge
applySpotlight(base, boost, strength)  // base + boost*strength, clamped to [0,1]
```

The boost can only ever *raise* a cell's brightness, never lower it, so the cursor gently pushes nearby glyphs toward the dense end of the ramp (`#%@`) and the field looks lit rather than dented. Both helpers are stateless and got their own unit tests — the smoothstep is 1 at the center, 0 at the radius, and monotonic in between.

`renderLayers` grew one optional `RenderOptions` argument carrying the spotlight center, radius, strength, and parallax offsets. With the argument absent it defaults to a no-op, so the existing render path and its tests produce byte-for-byte identical output. That property is itself a test: default options must equal the old four-argument call.

# Easing, so it trails instead of snaps

A spotlight nailed to the raw pointer position feels twitchy. Each frame the active center eases toward the target instead:

```ts
easedX += (targetX - easedX) * SPOTLIGHT_EASE;
```

`SPOTLIGHT_EASE` is `0.08`, so the light lags the cursor by a few frames and glides to a stop — the difference between "a cursor" and "a thing chasing the cursor." On the first `pointermove` the eased position snaps straight to the target so the spotlight doesn't streak in from the top-left corner on page load.

All the feel lives in five named constants at the top of the file — radius, strength, ease, scroll parallax, cursor parallax — which made tuning a one-line edit. And I did tune it: the first pass had the spotlight at strength `0.5` over a 14-cell radius, which read as a dense hot blob rather than a glow. Dropping it to `0.3` over 16 cells turned it into something you notice without quite catching it doing anything.

# Reduced motion, touch, and not overreaching

If `prefers-reduced-motion: reduce` is set, the pointer and scroll listeners are never attached and `renderLayers` is called with no options — both new effects vanish. I deliberately scoped that to the *new* behavior only: the base animation predates this change and doesn't honor reduced-motion, and quietly altering that was out of scope for a cursor feature. On touch devices there's no `pointermove`, so the spotlight simply never activates while scroll parallax keeps working. No device detection, no special cases — the absence of the event is the feature.

# Wrap-up

It's a small thing, and that's the point — the background is supposed to sit at 19% opacity behind the content and never demand attention. But "static loop" and "responds to you" are different enough in feel that it was worth the pure-helper plumbing to get there without disturbing the animation that was already working. One roadmap item down; the GitHub stats writeup is next.
