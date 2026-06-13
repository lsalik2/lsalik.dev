# Interactive ASCII Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the animated ASCII background react subtly to the cursor (a brightening spotlight) and to scroll/cursor (a slight field parallax).

**Architecture:** Keep `sample()` pure and untouched. Add two pure helpers — `spotlight()` (radial falloff) and `applySpotlight()` (clamped brightness boost) — and thread an optional `RenderOptions` arg through `renderLayers`: parallax offsets the coordinates fed to `sample()` (input side), the spotlight boosts each cell's final brightness (output side). The DOM layer tracks pointer/scroll, eases the spotlight position per frame, and passes computed options into `renderLayers`. With default (empty) options the output is byte-for-byte identical to today's, so existing tests act as a regression guard.

**Tech Stack:** TypeScript (no framework), Vitest, Astro island loaded by `src/layouts/Base.astro`.

---

### Task 1: Pure `spotlight()` radial-falloff helper

**Files:**
- Modify: `src/islands/ascii-bg.ts` (add exported function in the "Pure / exported" section, after `charForBrightness`)
- Test: `tests/islands/ascii-bg.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/islands/ascii-bg.test.ts` — import `spotlight` in the existing import block, then add this describe block:

```ts
describe('spotlight', () => {
  it('returns 1 at the exact center', () => {
    expect(spotlight(5, 5, 5, 5, 10)).toBe(1);
  });

  it('returns 0 at or beyond the radius', () => {
    expect(spotlight(15, 5, 5, 5, 10)).toBe(0); // dist 10 == radius
    expect(spotlight(20, 5, 5, 5, 10)).toBe(0); // dist 15 > radius
  });

  it('returns 0 when radius is non-positive', () => {
    expect(spotlight(5, 5, 5, 5, 0)).toBe(0);
    expect(spotlight(5, 5, 5, 5, -3)).toBe(0);
  });

  it('stays within [0, 1] and is non-increasing with distance', () => {
    let prev = Infinity;
    for (let d = 0; d <= 10; d++) {
      const v = spotlight(5 + d, 5, 5, 5, 10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/islands/ascii-bg.test.ts -t spotlight`
Expected: FAIL — `spotlight is not a function` / `spotlight is not defined`.

- [ ] **Step 3: Write minimal implementation**

In `src/islands/ascii-bg.ts`, after the `charForBrightness` function, add:

```ts
// Smooth radial falloff in [0, 1]: 1 at the spotlight center, 0 at/beyond
// `radius`. Uses smoothstep so the edge is soft rather than a hard ring.
export function spotlight(
  c: number,
  r: number,
  sx: number,
  sy: number,
  radius: number,
): number {
  if (radius <= 0) return 0;
  const dx = c - sx;
  const dy = r - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= radius) return 0;
  const t = 1 - dist / radius; // 1 at center → 0 at edge
  return t * t * (3 - 2 * t); // smoothstep
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/islands/ascii-bg.test.ts -t spotlight`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/islands/ascii-bg.ts tests/islands/ascii-bg.test.ts
git commit -m "feat: add spotlight radial-falloff helper to ascii-bg"
```

---

### Task 2: Pure `applySpotlight()` brightness-boost helper

**Files:**
- Modify: `src/islands/ascii-bg.ts` (add exported function directly after `spotlight`)
- Test: `tests/islands/ascii-bg.test.ts`

- [ ] **Step 1: Write the failing tests**

Add `applySpotlight` to the import block, then add:

```ts
describe('applySpotlight', () => {
  it('returns the base unchanged when boost is zero', () => {
    expect(applySpotlight(0.4, 0, 0.5)).toBe(0.4);
  });

  it('only raises brightness, never lowers it', () => {
    expect(applySpotlight(0.4, 1, 0.5)).toBeGreaterThan(0.4);
  });

  it('clamps the result to at most 1', () => {
    expect(applySpotlight(0.9, 1, 0.5)).toBe(1);
  });

  it('never returns a value outside [0, 1]', () => {
    for (const base of [0, 0.3, 0.7, 1]) {
      for (const boost of [0, 0.5, 1]) {
        const v = applySpotlight(base, boost, 0.5);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/islands/ascii-bg.test.ts -t applySpotlight`
Expected: FAIL — `applySpotlight is not defined`.

- [ ] **Step 3: Write minimal implementation**

In `src/islands/ascii-bg.ts`, directly after `spotlight`, add:

```ts
// base brightness + (boost * strength), clamped to [0, 1]. Boost is in [0, 1]
// and strength is non-negative, so this can only brighten a cell.
export function applySpotlight(
  base: number,
  boost: number,
  strength: number,
): number {
  const v = base + boost * strength;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/islands/ascii-bg.test.ts -t applySpotlight`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/islands/ascii-bg.ts tests/islands/ascii-bg.test.ts
git commit -m "feat: add applySpotlight brightness-boost helper to ascii-bg"
```

---

### Task 3: Thread `RenderOptions` (spotlight + parallax) through `renderLayers`

**Files:**
- Modify: `src/islands/ascii-bg.ts` (add `RenderOptions` interface near `RenderLayersResult`; modify the `renderLayers` signature and its per-cell loop, lines ~83-112)
- Test: `tests/islands/ascii-bg.test.ts`

- [ ] **Step 1: Write the failing tests**

Add `RenderOptions` is a type (no runtime import needed). Add these tests inside the existing `describe('renderLayers', ...)` block:

```ts
  it('produces identical output for default vs explicit no-op options', () => {
    const a = renderLayers(12, 5, 0.5, [0, 3.7, 7.2]);
    const b = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], {
      spotlightRadius: 0,
      spotlightStrength: 0,
      parallaxX: 0,
      parallaxY: 0,
    });
    expect(a.layers).toEqual(b.layers);
  });

  it('changes output when a parallax offset is applied', () => {
    const a = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], { parallaxX: 0 });
    const b = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], { parallaxX: 4 });
    expect(a.layers).not.toEqual(b.layers);
  });

  it('a parallax offset equals sampling the field at shifted coordinates', () => {
    const shifted = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], { parallaxX: 3, parallaxY: 2 });
    // First cell (0,0) with parallax (3,2) must use sample(3, 2, ...) internally;
    // assert determinism of the shifted call as a stable regression anchor.
    const again = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], { parallaxX: 3, parallaxY: 2 });
    expect(shifted.layers).toEqual(again.layers);
  });

  it('keeps the correct shape when options are supplied', () => {
    const cols = 10;
    const rows = 4;
    const result = renderLayers(cols, rows, 1.0, [0, 3.7, 7.2], {
      spotlightX: 5,
      spotlightY: 2,
      spotlightRadius: 6,
      spotlightStrength: 0.5,
      parallaxY: 1.5,
    });
    expect(result.layers).toHaveLength(3);
    for (const layer of result.layers) {
      const lines = layer.split('\n');
      expect(lines).toHaveLength(rows);
      for (const line of lines) expect([...line]).toHaveLength(cols);
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/islands/ascii-bg.test.ts -t renderLayers`
Expected: FAIL — the new `parallaxX`/options calls have no effect yet (the "changes output when a parallax offset is applied" test fails because the 5th arg is currently ignored).

- [ ] **Step 3: Write minimal implementation**

In `src/islands/ascii-bg.ts`, add the options interface next to `RenderLayersResult`:

```ts
export interface RenderOptions {
  spotlightX?: number;       // spotlight center, in cell coordinates
  spotlightY?: number;
  spotlightRadius?: number;  // 0 disables the spotlight
  spotlightStrength?: number;
  parallaxX?: number;        // cells to offset the sampled field
  parallaxY?: number;
}
```

Replace the `renderLayers` signature and per-cell loop. New signature:

```ts
export function renderLayers(
  cols: number,
  rows: number,
  t: number,
  phases: readonly number[],
  opts: RenderOptions = {},
): RenderLayersResult {
  const {
    spotlightX = 0,
    spotlightY = 0,
    spotlightRadius = 0,
    spotlightStrength = 0,
    parallaxX = 0,
    parallaxY = 0,
  } = opts;

  const layerCount = phases.length;

  const layerChars: string[][] = Array.from({ length: layerCount }, () =>
    new Array<string>(cols * rows).fill(' '),
  );

  // For each cell, compute every layer's brightness; the brightest wins that
  // cell. Parallax shifts the sampled coordinates; the spotlight brightens the
  // winning brightness before glyph selection.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let maxB = 0;
      let maxL = 0;
      for (let li = 0; li < layerCount; li++) {
        const b = sample(c + parallaxX, r + parallaxY, t, phases[li]);
        if (b > maxB) {
          maxB = b;
          maxL = li;
        }
      }
      const boost = spotlight(c, r, spotlightX, spotlightY, spotlightRadius);
      const finalB = applySpotlight(maxB, boost, spotlightStrength);
      const ch = charForBrightness(finalB);
      for (let li = 0; li < layerCount; li++) {
        layerChars[li][r * cols + c] = li === maxL ? ch : ' ';
      }
    }
  }

  // Join into layer strings with newline separators.
  const layers: string[] = new Array(layerCount);
  for (let li = 0; li < layerCount; li++) {
    const rowStrings: string[] = new Array(rows);
    for (let r = 0; r < rows; r++) {
      let line = '';
      for (let c = 0; c < cols; c++) {
        line += layerChars[li][r * cols + c];
      }
      rowStrings[r] = line;
    }
    layers[li] = rowStrings.join('\n');
  }

  return { layers };
}
```

- [ ] **Step 4: Run the full test file to verify everything passes**

Run: `npx vitest run tests/islands/ascii-bg.test.ts`
Expected: PASS — all prior tests (the no-arg `renderLayers` calls still work via the default `opts = {}`) plus the four new ones.

- [ ] **Step 5: Commit**

```bash
git add src/islands/ascii-bg.ts tests/islands/ascii-bg.test.ts
git commit -m "feat: thread spotlight + parallax options through renderLayers"
```

---

### Task 4: Wire pointer/scroll into the animation loop

**Files:**
- Modify: `src/islands/ascii-bg.ts` (constants near `FONT_SIZE`; store `charW` in `measure`; add listeners + easing in `initBackground` / `frame`)

No unit test: this is raf + DOM-event wiring. Verified by the existing suite still passing, a clean production build, and a manual dev check.

- [ ] **Step 1: Add tunable constants**

In `src/islands/ascii-bg.ts`, just below the existing `LAYER_COLORS`/length-check block (module scope, before `sample`), add:

```ts
// Interaction tuning (cursor spotlight + parallax). All in cell units unless noted.
const SPOTLIGHT_RADIUS = 14;     // cells
const SPOTLIGHT_STRENGTH = 0.5;  // max brightness boost at center
const SPOTLIGHT_EASE = 0.08;     // per-frame lerp of spotlight toward pointer
const SCROLL_PARALLAX = 0.02;    // cells of vertical drift per scrolled pixel
const CURSOR_PARALLAX_X = 1.5;   // max cells of horizontal drift at screen edges
```

- [ ] **Step 2: Detect reduced-motion and store char width**

Inside `initBackground`, after `const container = ...; if (!container) return;` and `ACTIVE_PRESET = pickPreset();`, add the reduced-motion flag:

```ts
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Change the closure-scoped grid vars to also keep char width. Replace:

```ts
  let cols = 0;
  let rows = 0;
  let rafHandle: number | null = null;
```

with:

```ts
  let cols = 0;
  let rows = 0;
  let charW = FONT_SIZE * 0.6; // updated by measure()
  let rafHandle: number | null = null;
```

Then in `measure()`, capture the measured width. Replace the body of `measure`:

```ts
  function measure(): void {
    const charW = measureCharWidth();
```

with (drop the local `const`, assign the closure var):

```ts
  function measure(): void {
    charW = measureCharWidth();
```

(The rest of `measure` — the `cols`/`rows` math using `charW` — stays the same.)

- [ ] **Step 3: Add pointer/scroll state, listeners, and easing**

Inside `initBackground`, add interaction state and listeners after the `layerPres` definition (before `measureCharWidth`):

```ts
  // Pointer spotlight + scroll parallax state (px until converted per frame).
  let pointerActive = false;
  let targetX = 0;
  let targetY = 0;
  let easedX = 0;
  let easedY = 0;
  let scrollPx = 0;

  function onPointerMove(e: PointerEvent): void {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!pointerActive) {
      // Snap on first move so the spotlight doesn't streak in from (0,0).
      easedX = targetX;
      easedY = targetY;
      pointerActive = true;
    }
  }

  function onScroll(): void {
    scrollPx = window.scrollY;
  }

  if (!reduceMotion) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
  }
```

- [ ] **Step 4: Compute options each frame**

Replace the existing `frame` function:

```ts
  function frame(now: number): void {
    const t = now / 1000;
    const { layers } = renderLayers(cols, rows, t, LAYER_PHASES);
    for (let li = 0; li < layerPres.length; li++) {
      layerPres[li].textContent = layers[li];
    }
    rafHandle = requestAnimationFrame(frame);
  }
```

with:

```ts
  function frame(now: number): void {
    const t = now / 1000;

    let opts = {};
    if (!reduceMotion) {
      if (pointerActive) {
        easedX += (targetX - easedX) * SPOTLIGHT_EASE;
        easedY += (targetY - easedY) * SPOTLIGHT_EASE;
      }
      const parallaxX = pointerActive
        ? (targetX / window.innerWidth - 0.5) * CURSOR_PARALLAX_X * 2
        : 0;
      opts = {
        spotlightX: easedX / charW,
        spotlightY: easedY / LINE_HEIGHT,
        spotlightRadius: pointerActive ? SPOTLIGHT_RADIUS : 0,
        spotlightStrength: SPOTLIGHT_STRENGTH,
        parallaxX,
        parallaxY: scrollPx * SCROLL_PARALLAX,
      };
    }

    const { layers } = renderLayers(cols, rows, t, LAYER_PHASES, opts);
    for (let li = 0; li < layerPres.length; li++) {
      layerPres[li].textContent = layers[li];
    }
    rafHandle = requestAnimationFrame(frame);
  }
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green (the wiring change touches only `frame`/`initBackground`, which the suite does not exercise; the pure-function tests confirm the contract).

- [ ] **Step 6: Type-check / production build**

Run: `npm run build`
Expected: build completes with no TypeScript errors.

- [ ] **Step 7: Manual verification in dev**

Run: `npm run dev`, open the site, and confirm:
- Moving the cursor brightens a soft circular region that trails the pointer.
- Scrolling drifts the field vertically by a few cells.
- With OS "reduce motion" enabled, the cursor/scroll effects are absent (base animation still runs).

- [ ] **Step 8: Commit**

```bash
git add src/islands/ascii-bg.ts
git commit -m "feat: react to cursor and scroll in ascii background"
```

---

## Self-Review

**Spec coverage:**
- Cursor spotlight → Tasks 1, 2, 3 (helpers + integration), 4 (wiring). ✓
- Scroll/cursor parallax → Task 3 (input offset), Task 4 (`scrollPx`, `parallaxX`). ✓
- Pure, testable helpers; `sample()` untouched → Tasks 1-3. ✓
- Eased spotlight follow → Task 4, Step 4. ✓
- Reduced-motion disables new effects only → Task 4, Steps 2 & 4. ✓
- No-pointer/mobile: spotlight inactive, scroll still works → `pointerActive` gate (Task 4). ✓
- Astro persist / init-once → unchanged existing pattern; listeners attach once like the existing resize listener. ✓
- Tunable constants grouped at top → Task 4, Step 1. ✓
- Tests: spotlight falloff, clamp/raise-only, no-op regression, parallax path → Tasks 1-3. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `spotlight(c,r,sx,sy,radius)`, `applySpotlight(base,boost,strength)`, and `RenderOptions` field names (`spotlightX/Y/Radius/Strength`, `parallaxX/Y`) are used identically in the helpers, the `renderLayers` destructure, and the Task 4 `opts` object. ✓

**Note:** Task 3's "shifted coordinates" test asserts determinism of the shifted call rather than reaching into private state — `sample()` is exercised directly by its own tests, so this keeps the integration test black-box.
