# v1 Polish Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement every item in `docs/TRACKER.md` — fix the curl SLK logo, refactor the ASCII background animation (no blotches, no stutter, persists across navigations), add three new color palettes, expand the navigation with `about` / `contact` / `sources`, and add intro copy and per-page headings.

**Architecture:** Five independent, shippable chunks landed in order: (1) new palettes → (2) logo redesign → (3) background animation refactor → (4) background persistence → (5) nav + new pages + homepage copy. Each chunk commits independently. TDD where the code is pure (logo packing, noise sampling, palette registry, curl renderers). Manual verification for DOM/browser behaviors.

**Tech Stack:** Astro 6 (server-rendered, Vercel adapter), vanilla TypeScript islands, Vitest, plain CSS with `data-palette` attribute switching.

**Spec:** `docs/superpowers/specs/2026-04-08-v1-polish-design.md`

---

## File Structure

**New files:**
- `src/components/PageHeader.astro`
- `src/data/about.md`
- `src/data/sources.md`
- `src/pages/about.astro`
- `src/pages/sources.astro`
- `src/pages/contact.astro` (replaces `links.astro`)
- `tests/curl/logo.test.ts`
- `tests/curl/render.test.ts`
- `tests/lib/palettes.test.ts`
- `tests/islands/ascii-bg.test.ts`

**Deleted:**
- `src/pages/links.astro`

**Modified:**
- `src/styles/palettes.css`
- `src/lib/palettes.ts`
- `src/curl/logo.ts`
- `src/curl/render.ts`
- `src/islands/ascii-bg.ts`
- `src/layouts/Base.astro`
- `src/components/Nav.astro`
- `src/pages/index.astro`
- `src/pages/projects/index.astro`
- `src/pages/blog/index.astro`
- `src/pages/resume.astro`
- `src/middleware.ts`

---

# Phase 1 — Palettes

### Task 1: Add palette registry entries and labels

**Files:**
- Modify: `src/lib/palettes.ts`

- [ ] **Step 1: Extend the palette list and labels**

Replace the entire contents of `src/lib/palettes.ts` with:

```ts
export const PALETTES = [
  'dark-terminal',
  'amber-crt',
  'green-phosphor',
  'synthwave',
  'paper',
] as const;
export type PaletteName = typeof PALETTES[number];

export function nextPalette(current: PaletteName): PaletteName {
  const index = PALETTES.indexOf(current);
  return PALETTES[(index + 1) % PALETTES.length];
}

export const PALETTE_LABELS: Record<PaletteName, string> = {
  'dark-terminal': 'Dark Terminal',
  'amber-crt': 'Amber CRT',
  'green-phosphor': 'Green Phosphor',
  'synthwave': 'Synthwave',
  'paper': 'Paper',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/palettes.ts
git commit -m "feat(palettes): register green-phosphor, synthwave, paper"
```

### Task 2: Palette registry tests

**Files:**
- Create: `tests/lib/palettes.test.ts`

- [ ] **Step 1: Write the test file**

Create `tests/lib/palettes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PALETTES, PALETTE_LABELS, nextPalette } from '../../src/lib/palettes';

describe('PALETTES', () => {
  it('contains all 5 expected palette ids in stable order', () => {
    expect(PALETTES).toEqual([
      'dark-terminal',
      'amber-crt',
      'green-phosphor',
      'synthwave',
      'paper',
    ]);
  });

  it('has no duplicates', () => {
    expect(new Set(PALETTES).size).toBe(PALETTES.length);
  });
});

describe('PALETTE_LABELS', () => {
  it('has a non-empty label for every palette', () => {
    for (const id of PALETTES) {
      const label = PALETTE_LABELS[id];
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe('nextPalette', () => {
  it('cycles forward through the list and wraps', () => {
    expect(nextPalette('dark-terminal')).toBe('amber-crt');
    expect(nextPalette('amber-crt')).toBe('green-phosphor');
    expect(nextPalette('green-phosphor')).toBe('synthwave');
    expect(nextPalette('synthwave')).toBe('paper');
    expect(nextPalette('paper')).toBe('dark-terminal');
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/lib/palettes.test.ts`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/lib/palettes.test.ts
git commit -m "test(palettes): cover registry, labels, cycle order"
```

### Task 3: Add CSS for the three new palettes

**Files:**
- Modify: `src/styles/palettes.css`

- [ ] **Step 1: Append the three palette blocks**

Open `src/styles/palettes.css` and append after the existing `amber-crt` block:

```css
:root[data-palette="green-phosphor"] {
  --bg: #000800;
  --bg-surface: #001400;
  --fg: #33ff66;
  --fg-muted: #1a9933;
  --accent: #66ff99;
  --accent-bright: #99ffbb;
  --green: #33ff66;
  --amber: #ccff66;
  --border: #003300;
  --cursor: #66ff99;
}

:root[data-palette="synthwave"] {
  --bg: #1a0933;
  --bg-surface: #2b1155;
  --fg: #f9f8ff;
  --fg-muted: #9d7dbe;
  --accent: #ff2a6d;
  --accent-bright: #ff5b8c;
  --green: #05d9e8;
  --amber: #f7b32b;
  --border: #5e3c8a;
  --cursor: #ff2a6d;
}

:root[data-palette="paper"] {
  --bg: #f7f3eb;
  --bg-surface: #ece4d0;
  --fg: #2b2a28;
  --fg-muted: #6b6a66;
  --accent: #1b5e9e;
  --accent-bright: #134a7f;
  --green: #2a6b36;
  --amber: #8a5a00;
  --border: #c9bfa9;
  --cursor: #2b2a28;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/palettes.css
git commit -m "feat(palettes): add green-phosphor, synthwave, paper CSS"
```

### Task 4: Add palette-scoped `--ansi-*` overrides

**Files:**
- Modify: `src/styles/palettes.css`

- [ ] **Step 1: Add an ansi override block to every palette**

The ANSI classes in `src/pages/index.astro` and `src/lib/ansi-to-dom.ts` reference `--ansi-red`, `--ansi-green`, `--ansi-amber`, `--ansi-blue`, `--ansi-cyan` with hardcoded fallbacks. Set the variables per palette so the curl demo's streamed logo and any ansi-rendered text pick up palette-appropriate colors.

Add to each existing and new palette block (6 rules total — the default `:root` and each `[data-palette="..."]`). Paste the palette-specific ansi values at the bottom of each corresponding block in `src/styles/palettes.css`:

Default `:root` and `:root[data-palette="dark-terminal"]`:
```css
  --ansi-red: #e06c75;
  --ansi-green: #98c379;
  --ansi-amber: #e5c07b;
  --ansi-blue: #61afef;
  --ansi-cyan: #56b6c2;
```

`:root[data-palette="amber-crt"]`:
```css
  --ansi-red: #ff6b6b;
  --ansi-green: #b8d65c;
  --ansi-amber: #ffb000;
  --ansi-blue: #ffd27a;
  --ansi-cyan: #ffdb99;
```

`:root[data-palette="green-phosphor"]`:
```css
  --ansi-red: #ff6b6b;
  --ansi-green: #33ff66;
  --ansi-amber: #ccff66;
  --ansi-blue: #66ff99;
  --ansi-cyan: #99ffcc;
```

`:root[data-palette="synthwave"]`:
```css
  --ansi-red: #ff2a6d;
  --ansi-green: #05d9e8;
  --ansi-amber: #f7b32b;
  --ansi-blue: #7a5cff;
  --ansi-cyan: #05d9e8;
```

`:root[data-palette="paper"]`:
```css
  --ansi-red: #b23b3b;
  --ansi-green: #2a6b36;
  --ansi-amber: #8a5a00;
  --ansi-blue: #1b5e9e;
  --ansi-cyan: #0f6c7a;
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/palettes.css
git commit -m "feat(palettes): palette-scoped --ansi-* overrides for curl colors"
```

### Task 5: Manual browser verification of palettes

- [ ] **Step 1: Boot dev server**

Run: `npm run dev`
Expected: Astro dev server is running.

- [ ] **Step 2: Walk through each palette**

Open the site in a browser. Click the palette toggle in the header. Cycle through all 5 palettes: `dark-terminal → amber-crt → green-phosphor → synthwave → paper → dark-terminal`. For each palette, visually confirm:
- Body background and foreground colors change.
- The nav breadcrumb, links, and hover states read correctly (no illegible combinations).
- The existing curl demo box streams text in readable colors.

- [ ] **Step 3: Stop the dev server**

Press `Ctrl+C` in the dev server terminal.

---

# Phase 2 — Logo Redesign

### Task 6: Write the logo unit tests (red)

**Files:**
- Create: `tests/curl/logo.test.ts`

- [ ] **Step 1: Create the failing test file**

Create `tests/curl/logo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderLogo } from '../../src/curl/logo';

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[\d+m/g, '');
}

describe('renderLogo', () => {
  const logo = renderLogo();
  const lines = logo.split('\n');

  it('returns exactly 6 lines', () => {
    expect(lines).toHaveLength(6);
  });

  it('uses only half-block glyphs and spaces in the visible output', () => {
    const allowed = new Set([' ', '▀', '▄', '█']);
    for (const line of lines) {
      const stripped = stripAnsi(line);
      for (const ch of stripped) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it('has balanced ANSI open/reset codes on every line', () => {
    for (const line of lines) {
      const opens = (line.match(/\x1b\[3[1-9]m/g) ?? []).length;
      const resets = (line.match(/\x1b\[(0|39)m/g) ?? []).length;
      expect(resets).toBeGreaterThanOrEqual(opens > 0 ? 1 : 0);
    }
  });

  it('has stable 17-character width on every row after stripping ANSI', () => {
    for (const line of lines) {
      const stripped = stripAnsi(line);
      expect([...stripped].length).toBe(17);
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm the width/lines asserts fail against the current logo**

Run: `npx vitest run tests/curl/logo.test.ts`
Expected: at least one assertion fails (current logo has 7 lines, not 6).

### Task 7: Rewrite `src/curl/logo.ts` with bitmap + pack

**Files:**
- Modify: `src/curl/logo.ts`

- [ ] **Step 1: Replace the file contents**

Replace all of `src/curl/logo.ts` with:

```ts
// SLK logo rendered at 8×17 pixel resolution, packed into 4 text rows using
// half-block glyphs (▀ ▄ █) plus space. Two colored underline rows follow.
//
// Pixel mapping per cell (top, bottom):
//   (0,0) -> ' '   (0,1) -> '▄'   (1,0) -> '▀'   (1,1) -> '█'

const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const AMBER = '\x1b[33m';
const RST = '\x1b[0m';

const WIDTH = 17;

// 8 pixel rows × 17 columns. '#' = on, '.' = off.
// Layout: S (cols 0-4), gap (col 5), L (cols 6-10), gap (col 11), K (cols 12-16).
const BITMAP: readonly string[] = [
  '.####. #.... #...#',
  '#..... #.... #..#.',
  '#..... #.... #.#..',
  '.###.. #.... ##...',
  '....#. #.... ##...',
  '....#. #.... #.#..',
  '#...#. #.... #..#.',
  '.###.. ##### #...#',
];

function pixel(row: number, col: number): boolean {
  return BITMAP[row][col] === '#';
}

function packPair(top: boolean, bot: boolean): string {
  if (top && bot) return '\u2588'; // █
  if (top) return '\u2580'; // ▀
  if (bot) return '\u2584'; // ▄
  return ' ';
}

function renderLetterRows(): string[] {
  // Pack pixel rows in pairs: (0,1), (2,3), (4,5), (6,7) -> 4 text rows.
  const rows: string[] = [];
  for (let textRow = 0; textRow < 4; textRow++) {
    const topRow = textRow * 2;
    const botRow = textRow * 2 + 1;
    let line = '';
    for (let col = 0; col < WIDTH; col++) {
      line += packPair(pixel(topRow, col), pixel(botRow, col));
    }
    rows.push(`${GREEN}${line}${RST}`);
  }
  return rows;
}

function renderUnderline(colorCode: string): string {
  return `${colorCode}${'\u2584'.repeat(WIDTH)}${RST}`;
}

export function renderLogo(): string {
  const letters = renderLetterRows();
  const accentBar = renderUnderline(BLUE);
  const amberBar = renderUnderline(AMBER);
  return [...letters, accentBar, amberBar].join('\n');
}
```

- [ ] **Step 2: Run the logo tests**

Run: `npx vitest run tests/curl/logo.test.ts`
Expected: all tests pass.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: every test passes (existing ansi tests + new logo tests + palette tests).

- [ ] **Step 4: Commit**

```bash
git add src/curl/logo.ts tests/curl/logo.test.ts
git commit -m "fix(logo): redesign SLK with 8px bitmap and half-block pairing"
```

### Task 8: Manual logo verification

- [ ] **Step 1: Boot dev server**

Run: `npm run dev`

- [ ] **Step 2: Inspect the curl response**

In a second terminal run: `curl -s http://localhost:4321/`
Expected: the first 6 lines show the new SLK logo with continuous letterforms and two colored underline bars, no visible gaps.

- [ ] **Step 3: Inspect the homepage curl demo in a browser**

Open the site in a browser. Watch the curl demo stream. Confirm the logo appears with the same shape and the colors reflect the active palette.

- [ ] **Step 4: Stop the dev server**

Press `Ctrl+C`.

---

# Phase 3 — Background Animation Refactor

### Task 9: Write pure-function tests for the new background

**Files:**
- Create: `tests/islands/ascii-bg.test.ts`

- [ ] **Step 1: Create the test file**

Create `tests/islands/ascii-bg.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  sample,
  charForBrightness,
  renderLayers,
  RAMP,
} from '../../src/islands/ascii-bg';

describe('sample', () => {
  it('returns values within [0, 1] across a grid of inputs', () => {
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 20; y++) {
        for (const t of [0, 1.5, 7.3]) {
          for (const phase of [0, 3.7, 7.2]) {
            const v = sample(x, y, t, phase);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('is deterministic for fixed inputs', () => {
    const a = sample(4, 5, 1.25, 3.7);
    const b = sample(4, 5, 1.25, 3.7);
    expect(a).toBe(b);
  });
});

describe('charForBrightness', () => {
  it('maps 0 to the first ramp glyph', () => {
    expect(charForBrightness(0)).toBe(RAMP[0]);
  });

  it('maps values just under 1 to the last ramp glyph', () => {
    expect(charForBrightness(0.9999)).toBe(RAMP[RAMP.length - 1]);
  });

  it('clamps values above 1 to the last ramp glyph', () => {
    expect(charForBrightness(10)).toBe(RAMP[RAMP.length - 1]);
  });

  it('clamps values below 0 to the first ramp glyph', () => {
    expect(charForBrightness(-5)).toBe(RAMP[0]);
  });
});

describe('renderLayers', () => {
  it('returns one string per phase, each cols*rows + separator newlines', () => {
    const cols = 12;
    const rows = 5;
    const result = renderLayers(cols, rows, 0.5, [0, 3.7, 7.2]);
    expect(result.layers).toHaveLength(3);
    for (const layer of result.layers) {
      const linesInLayer = layer.split('\n');
      expect(linesInLayer).toHaveLength(rows);
      for (const line of linesInLayer) {
        expect([...line]).toHaveLength(cols);
      }
    }
  });

  it('is deterministic for the same inputs', () => {
    const a = renderLayers(10, 4, 1.0, [0, 3.7, 7.2]);
    const b = renderLayers(10, 4, 1.0, [0, 3.7, 7.2]);
    expect(a.layers).toEqual(b.layers);
  });

  it('differs when t changes', () => {
    const a = renderLayers(10, 4, 1.0, [0, 3.7, 7.2]);
    const b = renderLayers(10, 4, 2.0, [0, 3.7, 7.2]);
    expect(a.layers).not.toEqual(b.layers);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/islands/ascii-bg.test.ts`
Expected: FAIL because the new exports don't exist yet.

### Task 10: Rewrite `src/islands/ascii-bg.ts` with the noise field

**Files:**
- Modify: `src/islands/ascii-bg.ts`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/islands/ascii-bg.ts` with:

```ts
// ASCII Animated Background — per-cell flow field (sums of sines).
// Three decorrelated layers; per cell, the brightest layer wins.

export const RAMP = ' -_:,;^+/|\\?0oOQ#%@';

const NOISE_X = 0.08;
const NOISE_Y = 0.11;
const NOISE_XY = 0.06;
const NOISE_XMY = 0.09;
const TIME_X = 0.6;
const TIME_Y = 0.4;
const TIME_XY = 0.5;
const TIME_XMY = 0.3;

const LAYER_PHASES: readonly number[] = [0, 3.7, 7.2];
const LAYER_COLORS: readonly string[] = [
  'var(--fg)',
  'var(--fg-muted)',
  'var(--accent)',
];

// ─── Pure / exported ─────────────────────────────────────────────────────────

export function sample(x: number, y: number, t: number, phase: number): number {
  const s1 = Math.sin(x * NOISE_X + t * TIME_X + phase);
  const s2 = Math.sin(y * NOISE_Y - t * TIME_Y + phase * 1.3);
  const s3 = Math.sin((x + y) * NOISE_XY + t * TIME_XY);
  const s4 = Math.sin((x - y) * NOISE_XMY - t * TIME_XMY + phase * 0.7);
  return (s1 + s2 + s3 + s4) * 0.25 + 0.5;
}

export function charForBrightness(b: number): string {
  if (b <= 0) return RAMP[0];
  if (b >= 1) return RAMP[RAMP.length - 1];
  const idx = Math.min(RAMP.length - 1, Math.floor(b * RAMP.length));
  return RAMP[idx];
}

export interface RenderLayersResult {
  layers: string[]; // one string per phase; each is `rows` lines joined by '\n'
}

export function renderLayers(
  cols: number,
  rows: number,
  t: number,
  phases: readonly number[],
): RenderLayersResult {
  const layerCount = phases.length;
  // For each cell, compute every layer's brightness; the brightest wins that cell.
  const cellBrightness: number[] = new Array(layerCount);

  const layerChars: string[][] = Array.from({ length: layerCount }, () =>
    new Array<string>(cols * rows).fill(' '),
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let maxB = 0;
      let maxL = 0;
      for (let li = 0; li < layerCount; li++) {
        const b = sample(c, r, t, phases[li]);
        cellBrightness[li] = b;
        if (b > maxB) {
          maxB = b;
          maxL = li;
        }
      }
      const ch = charForBrightness(maxB);
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

// ─── DOM / animation wiring ─────────────────────────────────────────────────

let started = false;

function initBackground(): void {
  const container = document.getElementById('ascii-bg');
  if (!container) return;

  const FONT_SIZE = 14;
  const LINE_HEIGHT = 16;

  let cols = 0;
  let rows = 0;

  // Pre-build one <pre> per layer; reuse across frames.
  const layerPres: HTMLPreElement[] = LAYER_COLORS.map((color) => {
    const pre = document.createElement('pre');
    pre.style.cssText = [
      'position:absolute',
      'inset:0',
      'margin:0',
      'white-space:pre',
      'font-family:monospace',
      `font-size:${FONT_SIZE}px`,
      `line-height:${LINE_HEIGHT}px`,
      `color:${color}`,
      'pointer-events:none',
    ].join(';');
    return pre;
  });

  function measure(): void {
    const charW = FONT_SIZE * 0.6;
    cols = Math.max(1, Math.ceil(window.innerWidth / charW));
    rows = Math.max(1, Math.ceil(window.innerHeight / LINE_HEIGHT));
  }

  function buildDOM(): void {
    container.textContent = '';
    for (const pre of layerPres) {
      container.appendChild(pre);
    }
  }

  function frame(now: number): void {
    const t = now / 1000;
    const { layers } = renderLayers(cols, rows, t, LAYER_PHASES);
    for (let li = 0; li < layerPres.length; li++) {
      layerPres[li].textContent = layers[li];
    }
    requestAnimationFrame(frame);
  }

  function start(): void {
    measure();
    buildDOM();
    requestAnimationFrame(frame);
  }

  function handleResize(): void {
    measure();
  }

  window.addEventListener('resize', handleResize);
  start();
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', () => {
    if (started) return;
    started = true;
    initBackground();
  });
}
```

- [ ] **Step 2: Run the pure-function tests**

Run: `npx vitest run tests/islands/ascii-bg.test.ts`
Expected: all tests pass.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: every test passes.

- [ ] **Step 4: Commit**

```bash
git add src/islands/ascii-bg.ts tests/islands/ascii-bg.test.ts
git commit -m "refactor(ascii-bg): replace particles with per-cell flow field"
```

### Task 11: Manual background verification

- [ ] **Step 1: Boot dev server**

Run: `npm run dev`

- [ ] **Step 2: Observe the animation**

Open the site. Watch the background for 30+ seconds. Confirm:
- Every region of the viewport has moving characters (no large dark blotches).
- Motion is continuous with no visible stutters.
- Three color layers are visible (fg, fg-muted, accent).

- [ ] **Step 3: Resize the window**

Resize the browser window wider and narrower. Confirm the grid reflows to fill the new viewport (on next frame) without errors.

- [ ] **Step 4: Stop the dev server**

Press `Ctrl+C`.

---

# Phase 4 — Background Persistence

### Task 12: Add `transition:persist` and verify idempotent init

**Files:**
- Modify: `src/layouts/Base.astro`

- [ ] **Step 1: Add `transition:persist` to the ascii-bg container**

Open `src/layouts/Base.astro`. Change the background container line from:

```astro
  <div id="ascii-bg" aria-hidden="true"></div>
```

To:

```astro
  <div id="ascii-bg" transition:persist="ascii-bg" aria-hidden="true"></div>
```

- [ ] **Step 2: Confirm the init guard is already in place**

The rewritten `src/islands/ascii-bg.ts` from Task 10 already uses a module-scoped `started` flag and guards on `astro:page-load`. No additional change needed here.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "fix(ascii-bg): persist animation across client-side navigations"
```

### Task 13: Manual persistence verification

- [ ] **Step 1: Boot dev server**

Run: `npm run dev`

- [ ] **Step 2: Navigate between pages**

Open the site. Watch the background for a moment. Click through `projects`, `blog`, `resume`, `links`, and back to home. Confirm:
- The animation keeps running continuously with no visible restart on each navigation.
- The pattern does not "teleport" or reset its time origin between pages.

- [ ] **Step 3: Full reload**

Press `Cmd+R` / `Ctrl+R`. Confirm the animation restarts cleanly (this is expected on full reload).

- [ ] **Step 4: Stop the dev server**

Press `Ctrl+C`.

---

# Phase 5 — Nav, New Pages, Homepage Copy

### Task 14: Create the shared `PageHeader` component

**Files:**
- Create: `src/components/PageHeader.astro`

- [ ] **Step 1: Write the component**

Create `src/components/PageHeader.astro`:

```astro
---
interface Props {
  heading: string;
  description: string;
}
const { heading, description } = Astro.props;
---
<header class="page-header-block">
  <h1 class="page-heading">{heading}</h1>
  <p class="page-description">{description}</p>
</header>

<style>
  .page-header-block {
    margin: 0 0 1.5rem;
  }

  .page-heading {
    color: var(--accent);
    margin: 0 0 0.35rem;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .page-description {
    color: var(--fg-muted);
    margin: 0;
    font-size: 0.9rem;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PageHeader.astro
git commit -m "feat(components): add PageHeader with heading and description"
```

### Task 15: Apply `PageHeader` to `/projects`, `/blog`, `/resume`

**Files:**
- Modify: `src/pages/projects/index.astro`
- Modify: `src/pages/blog/index.astro`
- Modify: `src/pages/resume.astro`

- [ ] **Step 1: Update the projects index**

In `src/pages/projects/index.astro`, at the top of the frontmatter add the import:

```ts
import PageHeader from '../../components/PageHeader.astro';
```

Replace:

```astro
<Page title="Projects" path="/projects">
  <h1 class="page-heading">~/projects</h1>
```

With:

```astro
<Page title="Projects" path="/projects">
  <PageHeader heading="~/projects" description="ls -la ~/projects — things I've built, public and otherwise." />
```

Delete the now-unused `.page-heading` rule from the `<style>` block at the bottom of the file (the one that sets `color: var(--accent); margin: 0 0 1.5rem; font-size: 1.2rem;`).

- [ ] **Step 2: Update the blog index**

In `src/pages/blog/index.astro`, at the top of the frontmatter add:

```ts
import PageHeader from '../../components/PageHeader.astro';
```

Replace:

```astro
<Page title="Blog" path="/blog">
  <h1 class="page-heading">~/blog</h1>
```

With:

```astro
<Page title="Blog" path="/blog">
  <PageHeader heading="~/blog" description="cd ~/blog — essays, notes, and the occasional rant." />
```

Delete the now-unused `.page-heading` rule from the `<style>` block at the bottom.

- [ ] **Step 3: Update the resume page**

In `src/pages/resume.astro`, at the top of the frontmatter add:

```ts
import PageHeader from '../components/PageHeader.astro';
```

Right after `<Page title="Resume" path="/resume">` and before `<TerminalFrame ...>`, insert:

```astro
  <PageHeader heading="~/resume" description="less ~/resume — CV. download the PDF if you need a paper copy." />
```

- [ ] **Step 4: Boot dev server and visually verify**

Run: `npm run dev`
Expected: `/projects`, `/blog`, and `/resume` each render the `~/heading` with description, followed by their existing content. No visual regressions.

- [ ] **Step 5: Stop the dev server and commit**

Press `Ctrl+C`, then:

```bash
git add src/pages/projects/index.astro src/pages/blog/index.astro src/pages/resume.astro
git commit -m "feat(pages): use PageHeader on projects, blog, resume"
```

### Task 16: Rename `/links` → `/contact` with `PageHeader`

**Files:**
- Create: `src/pages/contact.astro`
- Delete: `src/pages/links.astro`

- [ ] **Step 1: Create `src/pages/contact.astro`**

Create `src/pages/contact.astro`:

```astro
---
import Page from '../layouts/Page.astro';
import PageHeader from '../components/PageHeader.astro';

const links = [
  { label: 'GitHub', url: 'https://github.com/lsalik2' },
];
---
<Page title="Contact" path="/contact">
  <PageHeader heading="~/contact" description="cat ~/contact — how to reach me, socials included." />
  <div class="links-list">
    {links.map(link => (
      <a href={link.url} class="link-entry" target="_blank" rel="noopener noreferrer">
        <span class="link-arrow">→</span>
        <span class="link-url">{link.url.replace('https://', '')}</span>
        <span class="link-label">{link.label}</span>
      </a>
    ))}
  </div>
</Page>

<style>
  .links-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .link-entry {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: inherit;
    padding: 0.4rem 0;
    transition: opacity 0.15s;
  }

  .link-entry:hover {
    opacity: 0.8;
  }

  .link-arrow {
    color: var(--green);
    flex-shrink: 0;
  }

  .link-url {
    color: var(--accent);
  }

  .link-label {
    color: var(--fg-muted);
    font-size: 0.85rem;
  }
</style>
```

- [ ] **Step 2: Delete the old links page**

Run: `rm src/pages/links.astro`

- [ ] **Step 3: Commit**

```bash
git add src/pages/contact.astro src/pages/links.astro
git commit -m "feat(pages): rename /links to /contact with PageHeader"
```

### Task 17: Add `/about` page and placeholder data

**Files:**
- Create: `src/data/about.md`
- Create: `src/pages/about.astro`

- [ ] **Step 1: Write the placeholder markdown**

Create `src/data/about.md`:

```markdown
# whoami

Hi, I'm SLK. This is my corner of the internet.

I build things — mostly software, mostly in the open. If it shows up on this site, it's because it was worth writing down.

## interests

- operating systems, terminals, old text UIs
- small, owned infrastructure
- anything that runs offline

## elsewhere

See `~/contact` for ways to reach me.
```

- [ ] **Step 2: Write the Astro page**

Create `src/pages/about.astro`:

```astro
---
import Page from '../layouts/Page.astro';
import PageHeader from '../components/PageHeader.astro';

const aboutModule = await import('../data/about.md');
const AboutContent = aboutModule.default;
---
<Page title="About" path="/about">
  <PageHeader heading="~/about" description="cat about.md — who I am, what I build, what I'm into." />
  <div class="about-content">
    <AboutContent />
  </div>
</Page>

<style>
  .about-content :global(h1) {
    color: var(--accent);
    font-size: 1.1rem;
    margin: 0 0 0.75rem;
  }

  .about-content :global(h2) {
    color: var(--accent);
    font-size: 0.95rem;
    margin: 1.25rem 0 0.4rem;
  }

  .about-content :global(h2)::before {
    content: '## ';
  }

  .about-content :global(p) {
    margin: 0 0 0.6rem;
  }

  .about-content :global(ul) {
    list-style: none;
    padding: 0;
    margin: 0 0 0.6rem;
  }

  .about-content :global(ul li)::before {
    content: '- ';
    color: var(--fg-muted);
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/data/about.md src/pages/about.astro
git commit -m "feat(pages): add /about with placeholder bio"
```

### Task 18: Add `/sources` page and placeholder data

**Files:**
- Create: `src/data/sources.md`
- Create: `src/pages/sources.astro`

- [ ] **Step 1: Write the placeholder markdown**

Create `src/data/sources.md`:

```markdown
# sources

Things that inspired this site, and where its own code lives.

## inspirations

- [ysap.sh](https://ysap.sh) — terminal-first personal site with full curl support. Biggest direct influence.
- [pretext](https://github.com/chenglou/pretext) — variable-weight ASCII art. The background animation owes it a debt.

## source

- Site source: [github.com/lsalik2/lsalik.dev](https://github.com/lsalik2/lsalik.dev)
```

- [ ] **Step 2: Write the Astro page**

Create `src/pages/sources.astro`:

```astro
---
import Page from '../layouts/Page.astro';
import PageHeader from '../components/PageHeader.astro';

const sourcesModule = await import('../data/sources.md');
const SourcesContent = sourcesModule.default;
---
<Page title="Sources" path="/sources">
  <PageHeader heading="~/sources" description="cat ~/sources — sites that inspired this one, plus the site's own source." />
  <div class="sources-content">
    <SourcesContent />
  </div>
</Page>

<style>
  .sources-content :global(h1) {
    color: var(--accent);
    font-size: 1.1rem;
    margin: 0 0 0.75rem;
  }

  .sources-content :global(h2) {
    color: var(--accent);
    font-size: 0.95rem;
    margin: 1.25rem 0 0.4rem;
  }

  .sources-content :global(h2)::before {
    content: '## ';
  }

  .sources-content :global(p) {
    margin: 0 0 0.6rem;
  }

  .sources-content :global(ul) {
    list-style: none;
    padding: 0;
    margin: 0 0 0.6rem;
  }

  .sources-content :global(ul li)::before {
    content: '- ';
    color: var(--fg-muted);
  }

  .sources-content :global(a) {
    color: var(--accent);
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/data/sources.md src/pages/sources.astro
git commit -m "feat(pages): add /sources with inspirations and source link"
```

### Task 19: Update the nav with the 6-entry list

**Files:**
- Modify: `src/components/Nav.astro`

- [ ] **Step 1: Update the navLinks array**

In `src/components/Nav.astro`, replace:

```ts
const navLinks = [
  { href: '/projects', label: 'projects' },
  { href: '/blog', label: 'blog' },
  { href: '/resume', label: 'resume' },
  { href: '/links', label: 'links' },
];
```

With:

```ts
const navLinks = [
  { href: '/about', label: 'about' },
  { href: '/projects', label: 'projects' },
  { href: '/blog', label: 'blog' },
  { href: '/resume', label: 'resume' },
  { href: '/contact', label: 'contact' },
  { href: '/sources', label: 'sources' },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Nav.astro
git commit -m "feat(nav): add about/contact/sources, rename links to contact"
```

### Task 20: Update the homepage hero copy

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace the hero section**

In `src/pages/index.astro`, find the existing hero block:

```astro
  <section class="hero">
    <h1 class="hero-title">lsalik.dev</h1>
    <p class="hero-desc">A terminal-inspired personal website.</p>
  </section>
```

Replace with:

```astro
  <section class="hero">
    <h1 class="hero-title">lsalik.dev</h1>
    <p class="hero-desc">A terminal-inspired personal website.</p>
    <p class="hero-line"><span class="hero-prompt">$</span> whoami — a corner of the internet for my notes, projects, and writing.</p>
    <p class="hero-line"><span class="hero-prompt">$</span> tip — you can also <code>curl lsalik.dev</code> from any terminal and read the site in plaintext.</p>
  </section>
```

- [ ] **Step 2: Add matching styles**

In the same file, in the `<style>` block, add under the existing `.hero-desc` rule:

```css
  .hero-line {
    color: var(--fg-muted);
    margin: 0.35rem 0 0;
    font-size: 0.9rem;
  }

  .hero-prompt {
    color: var(--green);
    margin-right: 0.25rem;
  }

  .hero-line code {
    font-family: inherit;
    color: var(--accent);
    background: none;
    padding: 0;
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): add intro and curl tip under the hero tagline"
```

### Task 21: Write `render.ts` tests (red)

**Files:**
- Create: `tests/curl/render.test.ts`

- [ ] **Step 1: Create the failing test file**

Create `tests/curl/render.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  renderHome,
  renderContact,
  renderAbout,
  renderSources,
} from '../../src/curl/render';

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[\d+m/g, '');
}

describe('renderHome', () => {
  it('lists all 6 nav paths in the curl output', () => {
    const out = stripAnsi(renderHome());
    expect(out).toContain('curl lsalik.dev/about');
    expect(out).toContain('curl lsalik.dev/projects');
    expect(out).toContain('curl lsalik.dev/blog');
    expect(out).toContain('curl lsalik.dev/resume');
    expect(out).toContain('curl lsalik.dev/contact');
    expect(out).toContain('curl lsalik.dev/sources');
  });

  it('does not still advertise the old /links path', () => {
    const out = stripAnsi(renderHome());
    expect(out).not.toContain('curl lsalik.dev/links');
  });
});

describe('renderContact', () => {
  it('emits the ~/contact heading', () => {
    const out = stripAnsi(renderContact([{ label: 'GitHub', url: 'https://github.com/lsalik2' }]));
    expect(out).toContain('~/contact');
    expect(out).toContain('https://github.com/lsalik2');
  });
});

describe('renderAbout', () => {
  it('emits the ~/about heading and body text', () => {
    const out = stripAnsi(renderAbout('hi there'));
    expect(out).toContain('~/about');
    expect(out).toContain('hi there');
  });
});

describe('renderSources', () => {
  it('emits the ~/sources heading and body text', () => {
    const out = stripAnsi(renderSources('the body'));
    expect(out).toContain('~/sources');
    expect(out).toContain('the body');
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/curl/render.test.ts`
Expected: FAIL. `renderContact`, `renderAbout`, `renderSources` don't exist; `renderHome` still lists `/links`.

### Task 22: Update `src/curl/render.ts`

**Files:**
- Modify: `src/curl/render.ts`

- [ ] **Step 1: Update `renderHome` nav list**

In `src/curl/render.ts`, replace the `nav` array inside `renderHome` with all 6 paths. Replace:

```ts
  const nav = [
    dim('navigate:'),
    `  curl lsalik.dev/blog`,
    `  curl lsalik.dev/projects`,
    `  curl lsalik.dev/resume`,
    `  curl lsalik.dev/links`,
  ].join('\n');
```

With:

```ts
  const nav = [
    dim('navigate:'),
    `  curl lsalik.dev/about`,
    `  curl lsalik.dev/projects`,
    `  curl lsalik.dev/blog`,
    `  curl lsalik.dev/resume`,
    `  curl lsalik.dev/contact`,
    `  curl lsalik.dev/sources`,
  ].join('\n');
```

- [ ] **Step 2: Rename `renderLinks` to `renderContact`**

Rename the export at the bottom of the file from `renderLinks` to `renderContact` (signature unchanged). Replace:

```ts
export function renderLinks(links: { label: string; url: string }[]): string {
  const header = bold('~/links');
  const linkLines = links.map(link => `  ${link.label}  ${link.url}`);
  return [header, '', ...linkLines].join('\n');
}
```

With:

```ts
export function renderContact(links: { label: string; url: string }[]): string {
  const header = bold('~/contact');
  const linkLines = links.map(link => `  ${link.label}  ${link.url}`);
  return [header, '', ...linkLines].join('\n');
}
```

- [ ] **Step 3: Add `renderAbout` and `renderSources`**

Append to the end of `src/curl/render.ts`:

```ts
export function renderAbout(content: string): string {
  const header = bold('~/about');
  return [header, '', content].join('\n');
}

export function renderSources(content: string): string {
  const header = bold('~/sources');
  return [header, '', content].join('\n');
}
```

- [ ] **Step 4: Run the render tests**

Run: `npx vitest run tests/curl/render.test.ts`
Expected: all pass.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: all tests pass across every file.

- [ ] **Step 6: Commit**

```bash
git add src/curl/render.ts tests/curl/render.test.ts
git commit -m "feat(render): rename renderLinks, add renderAbout/Sources, update nav"
```

### Task 23: Update middleware with new routes and redirect

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add raw markdown imports at the top of the file**

At the top of `src/middleware.ts`, below the existing imports, add:

```ts
// Raw markdown bodies for the about and sources pages. Vite's ?raw query
// gives us the file's text content directly, which is what the curl renderers
// want (no Astro markdown component rendering for the terminal output).
import aboutRaw from './data/about.md?raw';
import sourcesRaw from './data/sources.md?raw';
```

Update the existing `render` import line. Replace:

```ts
import { renderHome, renderBlogIndex, renderBlogPost, renderProjectsIndex, renderResume, renderLinks } from './curl/render';
```

With:

```ts
import {
  renderHome,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderResume,
  renderContact,
  renderAbout,
  renderSources,
} from './curl/render';
```

- [ ] **Step 2: Move URL parsing to the top and add the `/links` → `/contact` 308 redirect**

The existing middleware computes `const { pathname } = new URL(request.url)` inside the terminal-client branch. Hoist it above the terminal check so the redirect can use it, then remove the later duplicate declaration. Replace:

```ts
export const onRequest = defineMiddleware(async ({ request }, next) => {
  const ua = request.headers.get('user-agent');

  if (!isTerminalClient(ua)) {
    return next();
  }

  const { pathname } = new URL(request.url);
```

With:

```ts
export const onRequest = defineMiddleware(async ({ request }, next) => {
  const ua = request.headers.get('user-agent');
  const { pathname } = new URL(request.url);

  // /links → /contact redirect (applies to both browser and curl traffic).
  if (pathname === '/links' || pathname === '/links/') {
    return new Response(null, {
      status: 308,
      headers: { Location: '/contact' },
    });
  }

  if (!isTerminalClient(ua)) {
    return next();
  }
```

- [ ] **Step 3: Replace the `/links` curl handler with a `/contact` handler**

Find:

```ts
  if (pathname === '/links' || pathname === '/links/') {
    return textResponse(renderLinks([
      { label: 'GitHub', url: 'https://github.com/lsalik2' },
    ]));
  }
```

Replace with:

```ts
  if (pathname === '/contact' || pathname === '/contact/') {
    return textResponse(renderContact([
      { label: 'GitHub', url: 'https://github.com/lsalik2' },
    ]));
  }
```

- [ ] **Step 4: Add the `/about` and `/sources` handlers**

Right after the `/contact` handler block from step 3, add:

```ts
  if (pathname === '/about' || pathname === '/about/') {
    return textResponse(renderAbout(aboutRaw));
  }

  if (pathname === '/sources' || pathname === '/sources/') {
    return textResponse(renderSources(sourcesRaw));
  }
```

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(middleware): /about, /sources, /contact rename, /links 308"
```

### Task 24: End-to-end manual verification

- [ ] **Step 1: Boot dev server**

Run: `npm run dev`

- [ ] **Step 2: Browser walkthrough**

Open the site and exercise every page in a browser:
- Home: intro tagline, two new `$` lines, curl demo streams new logo, background animates.
- Click through nav: `about`, `projects`, `blog`, `resume`, `contact`, `sources`. Every page shows its `~/heading` and description.
- Background persists across all navigations without restarting.
- Cycle all 5 palettes and confirm each page reads correctly in each palette.
- Navigate to `/links` in the URL bar. Confirm the browser ends up on `/contact`.

- [ ] **Step 3: Curl walkthrough**

In a second terminal run the following, inspecting output each time:

```bash
curl -s http://localhost:4321/
curl -s http://localhost:4321/about
curl -s http://localhost:4321/projects
curl -s http://localhost:4321/blog
curl -s http://localhost:4321/resume
curl -s http://localhost:4321/contact
curl -s http://localhost:4321/sources
curl -s -i http://localhost:4321/links
```

Expected:
- Home shows the new logo (no gaps), the 6-path nav list, and the tagline.
- Every other page shows its `~/heading` and content.
- `/links` returns `HTTP/1.1 308` with `Location: /contact`.

- [ ] **Step 4: Run the full test suite one more time**

Run: `npm run test`
Expected: all tests green.

- [ ] **Step 5: Stop the dev server**

Press `Ctrl+C`.

- [ ] **Step 6: Clear the TRACKER and commit**

Edit `docs/TRACKER.md` to remove every bug and feature item that shipped (i.e. empty the BUGS and FEATURES sections, keep the file structure). Then:

```bash
git add docs/TRACKER.md
git commit -m "docs(tracker): clear shipped v1 polish items"
```

---

## Done When

- All 24 tasks complete with green tests.
- Every bullet in `docs/TRACKER.md`'s pre-change state is addressed.
- `npm run test` green.
- Manual verification steps in Task 24 all pass.
