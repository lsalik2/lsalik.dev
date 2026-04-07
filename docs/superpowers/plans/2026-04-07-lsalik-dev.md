# lsalik.dev Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark, monospace-forward personal website that feels like a living terminal session, with an ASCII animated background, curl-friendly rendering, blog, projects, and resume pages.

**Architecture:** Single Astro project with vanilla TypeScript islands for interactivity. Edge middleware detects terminal user agents and serves plain text with ANSI codes. Content Collections with local Markdown for blog/projects. CSS custom properties drive a switchable palette system.

**Tech Stack:** Astro 5, TypeScript, Vercel (free tier, edge middleware), Vitest, CSS custom properties, Loskeley Mono font

---

## File Map

### Created Files

```
src/
├── components/
│   ├── Nav.astro                  # Shell prompt breadcrumb + nav links
│   ├── PaletteToggle.astro        # Palette cycling button
│   ├── TerminalFrame.astro        # Reusable terminal-frame box with title bar
│   └── BlogCard.astro             # Terminal-frame blog preview card
├── content/
│   ├── blog/
│   │   └── hello-world.md         # Seed blog post for development
│   ├── projects/
│   │   └── lsalik-dev.md          # Seed project entry for development
│   └── config.ts                  # Content Collection schemas (blog + projects)
├── data/
│   └── resume.md                  # Resume content
├── islands/
│   ├── ascii-bg.ts                # Pretext-inspired ASCII background animation
│   ├── curl-demo.ts               # Typing animation simulating `curl lsalik.dev`
│   └── palette-toggle.ts          # Client-side palette cycling logic
├── layouts/
│   ├── Base.astro                 # HTML shell, fonts, View Transitions, ASCII bg mount
│   └── Page.astro                 # Content wrapper with Nav + content area
├── middleware.ts                   # Edge middleware: curl/wget User-Agent detection
├── pages/
│   ├── index.astro                # Homepage
│   ├── blog/
│   │   ├── index.astro            # Blog index
│   │   └── [...slug].astro        # Individual blog post
│   ├── projects/
│   │   ├── index.astro            # Projects index
│   │   └── [...slug].astro        # Individual project detail
│   ├── resume.astro               # Resume page
│   └── links.astro                # Social/contact links
├── styles/
│   ├── global.css                 # Base resets, typography, layout utilities
│   ├── palettes.css               # Color palette token sets
│   └── print.css                  # @media print for resume
├── curl/
│   ├── logo.ts                    # ASCII logo with ANSI color escape codes
│   ├── render.ts                  # Plain-text page renderers
│   └── ansi.ts                    # ANSI escape code helpers
└── lib/
    ├── palettes.ts                # Palette name registry (shared between toggle + island)
    └── ansi-to-dom.ts             # Safe ANSI-to-DOM converter (no innerHTML)

tests/
├── curl/
│   ├── logo.test.ts               # Logo output structure tests
│   ├── render.test.ts             # Curl renderer tests
│   └── ansi.test.ts               # ANSI helper tests
├── islands/
│   └── ascii-bg.test.ts           # Particle simulation + field math tests
└── content/
    └── schema.test.ts             # Content Collection schema validation tests

public/
├── fonts/
│   └── LoskeleyMono-Regular.woff2 # Self-hosted font
└── resume.pdf                      # Pre-generated PDF (placeholder initially)

astro.config.mjs                    # Astro config with Vercel adapter
tsconfig.json                       # TypeScript config
package.json                        # Dependencies
vitest.config.ts                    # Vitest config
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/pages/index.astro`

- [ ] **Step 1: Initialize Astro project**

```bash
cd /home/salik/projects/lsalik.dev
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict
```

If the scaffolder asks about overwriting existing files (docs/, resources/), decline or use `--dry-run` first. If it doesn't support non-destructive init, create the files manually instead.

- [ ] **Step 2: Install core dependencies**

```bash
npm install @astrojs/vercel
npm install -D vitest
```

- [ ] **Step 3: Configure Astro for Vercel with hybrid rendering**

Replace `astro.config.mjs` with:

```js
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    edgeMiddleware: true,
  }),
});
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create a minimal homepage to verify the setup**

Write `src/pages/index.astro`:

```astro
---
---
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>lsalik.dev</title>
</head>
<body>
  <p>lsalik.dev</p>
</body>
</html>
```

- [ ] **Step 6: Verify the dev server starts**

```bash
npx astro dev
```

Expected: Server starts on `localhost:4321`, page renders "lsalik.dev".

- [ ] **Step 7: Verify the build succeeds**

```bash
npx astro build
```

Expected: Build completes with no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts src/pages/index.astro
git commit -m "feat: scaffold Astro project with Vercel adapter and Vitest"
```

---

## Task 2: CSS System — Global Styles and Palettes

**Files:**
- Create: `src/styles/global.css`, `src/styles/palettes.css`

- [ ] **Step 1: Create palette definitions**

Write `src/styles/palettes.css`:

```css
:root,
:root[data-palette="dark-terminal"] {
  --bg: #0d1117;
  --bg-surface: #161b22;
  --fg: #c9d1d9;
  --fg-muted: #8b949e;
  --accent: #58a6ff;
  --accent-bright: #79c0ff;
  --green: #3fb950;
  --amber: #d29922;
  --border: #30363d;
  --cursor: #58a6ff;
}

:root[data-palette="amber-crt"] {
  --bg: #0a0a00;
  --bg-surface: #0f0f00;
  --fg: #ffb000;
  --fg-muted: #b07800;
  --accent: #ff6600;
  --accent-bright: #ff8833;
  --green: #33ff00;
  --amber: #ffb000;
  --border: #332800;
  --cursor: #ffb000;
}
```

- [ ] **Step 2: Create global styles**

Write `src/styles/global.css`:

```css
@import './palettes.css';

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: "Loskeley Mono", "JetBrains Mono", "Fira Code", monospace;
  font-size: 16px;
  line-height: 1.6;
  background-color: var(--bg);
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  color: var(--accent-bright);
}

::selection {
  background-color: var(--accent);
  color: var(--bg);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css src/styles/palettes.css
git commit -m "feat: add CSS palette system and global styles"
```

---

## Task 3: Font Loading

**Files:**
- Create: `public/fonts/LoskeleyMono-Regular.woff2`

- [ ] **Step 1: Download Loskeley Mono font**

```bash
mkdir -p public/fonts
curl -L -o /tmp/loskeley-mono.zip "https://github.com/ahatem/IoskeleyMono/releases/download/v2.0.0-beta.1/IoskeleyMono-v2.0.0-beta.1.zip"
unzip /tmp/loskeley-mono.zip -d /tmp/loskeley-mono
```

Find the `.woff2` or `.ttf` file in the extracted archive and copy it to `public/fonts/`. If only `.ttf` is available, use it directly — browsers handle it fine. Rename to `LoskeleyMono-Regular.woff2` (or `.ttf` if that's what's available).

- [ ] **Step 2: Add @font-face to global.css**

Add to the top of `src/styles/global.css`, before the `@import`:

```css
@font-face {
  font-family: "Loskeley Mono";
  src: url("/fonts/LoskeleyMono-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

Adjust the `src` URL and `format()` to match the actual file you downloaded (`.ttf` → `format("truetype")`).

- [ ] **Step 3: Verify font loads in dev server**

```bash
npx astro dev
```

Open browser dev tools → Network tab → confirm the font file loads. Text should render in Loskeley Mono.

- [ ] **Step 4: Commit**

```bash
git add public/fonts/ src/styles/global.css
git commit -m "feat: add self-hosted Loskeley Mono font"
```

---

## Task 4: Base Layout

**Files:**
- Create: `src/layouts/Base.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create Base layout**

Write `src/layouts/Base.astro`:

```astro
---
import { ViewTransitions } from 'astro:transitions';

interface Props {
  title: string;
}

const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content={Astro.generator} />
  <title>{title} — lsalik.dev</title>
  <ViewTransitions />
  <link rel="stylesheet" href="/src/styles/global.css" />
</head>
<body>
  <div id="ascii-bg" aria-hidden="true"></div>
  <div class="content-layer">
    <slot />
  </div>
  <script src="../islands/ascii-bg.ts" defer></script>
</body>
</html>

<style is:global>
  #ascii-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    opacity: 0.15;
  }

  .content-layer {
    position: relative;
    z-index: 1;
    min-height: 100vh;
  }
</style>
```

- [ ] **Step 2: Create a placeholder ASCII background island**

Write `src/islands/ascii-bg.ts`:

```ts
// Placeholder — full implementation in Task 8
const container = document.getElementById('ascii-bg');
if (container) {
  container.textContent = '';
}
```

- [ ] **Step 3: Update homepage to use Base layout**

Replace `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Home">
  <main>
    <p>lsalik.dev</p>
  </main>
</Base>
```

- [ ] **Step 4: Verify layout renders correctly**

```bash
npx astro dev
```

Expected: Page renders with dark background, correct font, no errors in console.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Base.astro src/islands/ascii-bg.ts src/pages/index.astro
git commit -m "feat: add Base layout with View Transitions and ASCII bg mount point"
```

---

## Task 5: Navigation Component

**Files:**
- Create: `src/components/Nav.astro`

- [ ] **Step 1: Create the Nav component**

Write `src/components/Nav.astro`:

```astro
---
interface Props {
  path: string;
}

const { path } = Astro.props;

const segments = path === '/' ? [] : path.split('/').filter(Boolean);

const navLinks = [
  { href: '/projects', label: 'ls projects/' },
  { href: '/blog', label: 'cat blog/' },
  { href: '/resume', label: 'cat resume' },
  { href: '/links', label: 'cat links' },
];
---
<nav class="nav">
  <div class="breadcrumb">
    <span class="prompt-user">guest@lsalik</span><span class="prompt-sep">:</span><a href="/" class="prompt-path">~</a>{segments.map((seg, i) => {
      const href = '/' + segments.slice(0, i + 1).join('/');
      return <><span class="prompt-sep">/</span><a href={href} class="prompt-path">{seg}</a></>;
    })}<span class="prompt-dollar">$</span><span class="cursor" aria-hidden="true"></span>
  </div>
  <div class="nav-links">
    {navLinks.map(link => (
      <a
        href={link.href}
        class:list={['nav-link', { active: path.startsWith(link.href) }]}
      >
        {link.label}
      </a>
    ))}
  </div>
</nav>

<style>
  .nav {
    padding: 1.5rem 0 1rem;
  }

  .breadcrumb {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .prompt-user {
    color: var(--green);
  }

  .prompt-sep {
    color: var(--fg-muted);
  }

  .prompt-path {
    color: var(--fg);
    text-decoration: none;
  }

  .prompt-path:hover {
    color: var(--accent-bright);
  }

  .prompt-dollar {
    color: var(--green);
    margin-left: 0.25ch;
  }

  .cursor {
    display: inline-block;
    width: 0.6ch;
    height: 1.1em;
    background-color: var(--cursor);
    margin-left: 0.25ch;
    vertical-align: text-bottom;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .nav-links {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5ch;
  }

  .nav-link {
    color: var(--fg-muted);
    text-decoration: none;
  }

  .nav-link:hover {
    color: var(--accent-bright);
  }

  .nav-link.active {
    color: var(--accent);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Nav.astro
git commit -m "feat: add shell prompt breadcrumb navigation component"
```

---

## Task 6: Page Layout and Palette Toggle

**Files:**
- Create: `src/layouts/Page.astro`, `src/components/PaletteToggle.astro`, `src/islands/palette-toggle.ts`, `src/lib/palettes.ts`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create palette registry**

Write `src/lib/palettes.ts`:

```ts
export const PALETTES = ['dark-terminal', 'amber-crt'] as const;
export type PaletteName = typeof PALETTES[number];

export function nextPalette(current: PaletteName): PaletteName {
  const index = PALETTES.indexOf(current);
  return PALETTES[(index + 1) % PALETTES.length];
}

export const PALETTE_LABELS: Record<PaletteName, string> = {
  'dark-terminal': 'Dark Terminal',
  'amber-crt': 'Amber CRT',
};
```

- [ ] **Step 2: Create palette toggle client-side island**

Write `src/islands/palette-toggle.ts`:

```ts
import { PALETTES, nextPalette, type PaletteName } from '../lib/palettes';

let current: PaletteName = 'dark-terminal';

function applyPalette(name: PaletteName): void {
  document.documentElement.dataset.palette = name;
  current = name;
  const label = document.getElementById('palette-label');
  if (label) {
    label.textContent = name;
  }
}

document.addEventListener('astro:page-load', () => {
  const btn = document.getElementById('palette-toggle-btn');
  if (!btn) return;

  // Reapply current palette after View Transition navigation
  applyPalette(current);

  btn.addEventListener('click', () => {
    applyPalette(nextPalette(current));
  });
});
```

- [ ] **Step 3: Create PaletteToggle Astro component**

Write `src/components/PaletteToggle.astro`:

```astro
---
---
<button id="palette-toggle-btn" class="palette-toggle" type="button" aria-label="Switch color palette">
  <span class="palette-icon">[theme:</span>
  <span id="palette-label">dark-terminal</span><span class="palette-icon">]</span>
</button>

<style>
  .palette-toggle {
    background: none;
    border: 1px solid var(--border);
    color: var(--fg-muted);
    font-family: inherit;
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .palette-toggle:hover {
    color: var(--accent-bright);
    border-color: var(--accent);
  }

  .palette-icon {
    color: var(--fg-muted);
  }
</style>
```

- [ ] **Step 4: Create Page layout**

Write `src/layouts/Page.astro`:

```astro
---
import Base from './Base.astro';
import Nav from '../components/Nav.astro';
import PaletteToggle from '../components/PaletteToggle.astro';

interface Props {
  title: string;
  path: string;
}

const { title, path } = Astro.props;
---
<Base title={title}>
  <div class="page-container">
    <header class="page-header">
      <Nav path={path} />
      <PaletteToggle />
    </header>
    <main class="page-main">
      <slot />
    </main>
  </div>
  <script src="../islands/palette-toggle.ts"></script>
</Base>

<style>
  .page-container {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .page-main {
    padding: 1rem 0 3rem;
    background-color: color-mix(in srgb, var(--bg) 85%, transparent);
    border-radius: 4px;
    padding: 1.5rem;
  }
</style>
```

- [ ] **Step 5: Update homepage to use Page layout**

Replace `src/pages/index.astro`:

```astro
---
import Page from '../layouts/Page.astro';
---
<Page title="Home" path="/">
  <p>lsalik.dev</p>
</Page>
```

- [ ] **Step 6: Verify palette toggle works**

```bash
npx astro dev
```

Expected: Page renders with dark terminal palette. Clicking the toggle switches to amber CRT (background, text, accent colors all change). Palette name label updates.

- [ ] **Step 7: Commit**

```bash
git add src/lib/palettes.ts src/islands/palette-toggle.ts src/components/PaletteToggle.astro src/layouts/Page.astro src/pages/index.astro
git commit -m "feat: add Page layout with palette toggle"
```

---

## Task 7: Terminal Frame Component

**Files:**
- Create: `src/components/TerminalFrame.astro`

- [ ] **Step 1: Create TerminalFrame component**

Write `src/components/TerminalFrame.astro`:

```astro
---
interface Props {
  title: string;
}

const { title } = Astro.props;
---
<div class="terminal-frame">
  <div class="terminal-titlebar">
    <span class="terminal-title">── {title} ──</span>
  </div>
  <div class="terminal-body">
    <slot />
  </div>
</div>

<style>
  .terminal-frame {
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }

  .terminal-titlebar {
    border-bottom: 1px solid var(--border);
    padding: 0.5rem 1rem;
    background-color: var(--bg-surface);
    color: var(--fg-muted);
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .terminal-body {
    padding: 1rem;
    background-color: var(--bg);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TerminalFrame.astro
git commit -m "feat: add reusable TerminalFrame component"
```

---

## Task 8: ASCII Animated Background

**Files:**
- Create: `src/islands/ascii-bg.ts`, `tests/islands/ascii-bg.test.ts`

- [ ] **Step 1: Write tests for the particle simulation math**

Write `tests/islands/ascii-bg.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

import {
  createBrightnessField,
  splatStamp,
  createFieldStamp,
  brightnessToChar,
  stepParticles,
  type Particle,
} from '../src/islands/ascii-bg';

describe('brightnessToChar', () => {
  const RAMP = ' .`-_:,;^=+/|)\\!?0oOQ#%@';

  it('returns space for zero brightness', () => {
    expect(brightnessToChar(0)).toBe(' ');
  });

  it('returns densest char for max brightness', () => {
    expect(brightnessToChar(1)).toBe('@');
  });

  it('returns a mid-range char for 0.5', () => {
    const ch = brightnessToChar(0.5);
    const idx = RAMP.indexOf(ch);
    expect(idx).toBeGreaterThan(5);
    expect(idx).toBeLessThan(RAMP.length - 1);
  });
});

describe('createFieldStamp', () => {
  it('creates a stamp with correct dimensions', () => {
    const stamp = createFieldStamp(10, 2, 2);
    expect(stamp.radiusX).toBeGreaterThan(0);
    expect(stamp.radiusY).toBeGreaterThan(0);
    expect(stamp.values.length).toBe(stamp.sizeX * stamp.sizeY);
  });

  it('has peak value at center', () => {
    const stamp = createFieldStamp(10, 2, 2);
    const centerIdx = stamp.radiusY * stamp.sizeX + stamp.radiusX;
    const centerVal = stamp.values[centerIdx];
    expect(centerVal).toBeGreaterThan(0);
    for (let i = 0; i < stamp.values.length; i++) {
      expect(centerVal).toBeGreaterThanOrEqual(stamp.values[i]);
    }
  });
});

describe('createBrightnessField', () => {
  it('creates a Float32Array of correct size', () => {
    const field = createBrightnessField(10, 8);
    expect(field).toBeInstanceOf(Float32Array);
    expect(field.length).toBe(10 * 8);
  });
});

describe('splatStamp', () => {
  it('writes stamp values into the field', () => {
    const field = createBrightnessField(20, 20);
    const stamp = createFieldStamp(5, 1, 1);
    splatStamp(field, 20, 20, 10, 10, stamp);
    let hasNonZero = false;
    for (let i = 0; i < field.length; i++) {
      if (field[i] > 0) { hasNonZero = true; break; }
    }
    expect(hasNonZero).toBe(true);
  });

  it('clamps values to 1', () => {
    const field = createBrightnessField(20, 20);
    const stamp = createFieldStamp(5, 1, 1);
    for (let i = 0; i < 100; i++) {
      splatStamp(field, 20, 20, 10, 10, stamp);
    }
    for (let i = 0; i < field.length; i++) {
      expect(field[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('stepParticles', () => {
  it('updates particle positions', () => {
    const particles: Particle[] = [
      { x: 100, y: 100, vx: 0, vy: 0 },
    ];
    const attractor1 = { x: 50, y: 50 };
    const attractor2 = { x: 150, y: 150 };
    stepParticles(particles, attractor1, attractor2, 200, 150);
    expect(particles[0].x).not.toBe(100);
    expect(particles[0].y).not.toBe(100);
  });

  it('wraps particles that go out of bounds', () => {
    const particles: Particle[] = [
      { x: -100, y: -100, vx: -5, vy: -5 },
    ];
    stepParticles(particles, { x: 0, y: 0 }, { x: 200, y: 150 }, 200, 150);
    expect(particles[0].x).toBeGreaterThan(-50);
    expect(particles[0].y).toBeGreaterThan(-50);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/islands/ascii-bg.test.ts
```

Expected: FAIL — module not found / functions not exported.

- [ ] **Step 3: Implement the ASCII background module**

Write `src/islands/ascii-bg.ts`:

```ts
// --- Pure, testable functions ---

const MONO_RAMP = ' .`-_:,;^=+/|)\\!?0oOQ#%@';
const FIELD_OVERSAMPLE = 2;
const FIELD_DECAY = 0.82;
const ATTRACTOR_FORCE_1 = 0.22;
const ATTRACTOR_FORCE_2 = 0.05;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface FieldStamp {
  radiusX: number;
  radiusY: number;
  sizeX: number;
  sizeY: number;
  values: Float32Array;
}

export function brightnessToChar(brightness: number): string {
  const clamped = Math.max(0, Math.min(1, brightness));
  const idx = Math.min(MONO_RAMP.length - 1, (clamped * MONO_RAMP.length) | 0);
  return MONO_RAMP[idx];
}

export function createBrightnessField(cols: number, rows: number): Float32Array {
  return new Float32Array(cols * rows);
}

function spriteAlphaAt(normalizedDistance: number): number {
  if (normalizedDistance >= 1) return 0;
  if (normalizedDistance <= 0.35) return 0.45 + (0.15 - 0.45) * (normalizedDistance / 0.35);
  return 0.15 * (1 - (normalizedDistance - 0.35) / 0.65);
}

export function createFieldStamp(radiusPx: number, scaleX: number, scaleY: number): FieldStamp {
  const fieldRadiusX = radiusPx * scaleX;
  const fieldRadiusY = radiusPx * scaleY;
  const radiusX = Math.ceil(fieldRadiusX);
  const radiusY = Math.ceil(fieldRadiusY);
  const sizeX = radiusX * 2 + 1;
  const sizeY = radiusY * 2 + 1;
  const values = new Float32Array(sizeX * sizeY);
  for (let y = -radiusY; y <= radiusY; y++) {
    for (let x = -radiusX; x <= radiusX; x++) {
      const normalizedDistance = Math.sqrt(
        (x / fieldRadiusX) ** 2 + (y / fieldRadiusY) ** 2
      );
      values[(y + radiusY) * sizeX + (x + radiusX)] = spriteAlphaAt(normalizedDistance);
    }
  }
  return { radiusX, radiusY, sizeX, sizeY, values };
}

export function splatStamp(
  field: Float32Array,
  fieldCols: number,
  fieldRows: number,
  centerX: number,
  centerY: number,
  stamp: FieldStamp,
): void {
  const gridCX = Math.round(centerX);
  const gridCY = Math.round(centerY);
  for (let y = -stamp.radiusY; y <= stamp.radiusY; y++) {
    const gy = gridCY + y;
    if (gy < 0 || gy >= fieldRows) continue;
    const fieldRowOff = gy * fieldCols;
    const stampRowOff = (y + stamp.radiusY) * stamp.sizeX;
    for (let x = -stamp.radiusX; x <= stamp.radiusX; x++) {
      const gx = gridCX + x;
      if (gx < 0 || gx >= fieldCols) continue;
      const sv = stamp.values[stampRowOff + (x + stamp.radiusX)];
      if (sv === 0) continue;
      const fi = fieldRowOff + gx;
      field[fi] = Math.min(1, field[fi] + sv);
    }
  }
}

export function stepParticles(
  particles: Particle[],
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  canvasW: number,
  canvasH: number,
): void {
  const spriteR = 14;
  for (const p of particles) {
    const d1x = a1.x - p.x;
    const d1y = a1.y - p.y;
    const d2x = a2.x - p.x;
    const d2y = a2.y - p.y;
    const dist1 = d1x * d1x + d1y * d1y;
    const dist2 = d2x * d2x + d2y * d2y;
    const ax = dist1 < dist2 ? d1x : d2x;
    const ay = dist1 < dist2 ? d1y : d2y;
    const dist = Math.sqrt(Math.min(dist1, dist2)) + 1;
    const force = dist1 < dist2 ? ATTRACTOR_FORCE_1 : ATTRACTOR_FORCE_2;
    p.vx += (ax / dist) * force;
    p.vy += (ay / dist) * force;
    p.vx += (Math.random() - 0.5) * 0.25;
    p.vy += (Math.random() - 0.5) * 0.25;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -spriteR) p.x += canvasW + spriteR * 2;
    if (p.x > canvasW + spriteR) p.x -= canvasW + spriteR * 2;
    if (p.y < -spriteR) p.y += canvasH + spriteR * 2;
    if (p.y > canvasH + spriteR) p.y -= canvasH + spriteR * 2;
  }
}

// --- DOM/animation side (only runs in browser) ---

function initBackground(): void {
  const container = document.getElementById('ascii-bg');
  if (!container) return;

  const PARTICLE_N = 120;
  const SPRITE_R = 14;
  const ATTRACTOR_R = 12;
  const LARGE_ATTRACTOR_R = 30;
  const FONT_SIZE = 14;
  const LINE_HEIGHT = 16;

  function measure(): { cols: number; rows: number; canvasW: number; canvasH: number } {
    const charW = FONT_SIZE * 0.6; // approximate monospace char width
    const cols = Math.floor(window.innerWidth / charW);
    const rows = Math.floor(window.innerHeight / LINE_HEIGHT);
    return { cols, rows, canvasW: cols, canvasH: rows };
  }

  let { cols, rows, canvasW, canvasH } = measure();
  let fieldCols = cols * FIELD_OVERSAMPLE;
  let fieldRows = rows * FIELD_OVERSAMPLE;
  let field = createBrightnessField(fieldCols, fieldRows);

  const scaleX = fieldCols / canvasW;
  const scaleY = fieldRows / canvasH;
  const particleStamp = createFieldStamp(SPRITE_R, scaleX, scaleY);
  const largeAttractorStamp = createFieldStamp(LARGE_ATTRACTOR_R, scaleX, scaleY);
  const smallAttractorStamp = createFieldStamp(ATTRACTOR_R, scaleX, scaleY);

  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_N; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 40 + 20;
    particles.push({
      x: canvasW / 2 + Math.cos(angle) * r,
      y: canvasH / 2 + Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
    });
  }

  // Create row elements
  const rowEls: HTMLDivElement[] = [];
  function buildRows(): void {
    container.textContent = '';
    rowEls.length = 0;
    for (let r = 0; r < rows; r++) {
      const row = document.createElement('div');
      row.style.whiteSpace = 'pre';
      row.style.height = `${LINE_HEIGHT}px`;
      row.style.lineHeight = `${LINE_HEIGHT}px`;
      row.style.fontSize = `${FONT_SIZE}px`;
      row.style.fontFamily = '"Loskeley Mono", "JetBrains Mono", "Fira Code", monospace';
      row.style.color = 'var(--fg-muted)';
      container.appendChild(row);
      rowEls.push(row);
    }
  }
  buildRows();

  // Handle resize
  window.addEventListener('resize', () => {
    const m = measure();
    cols = m.cols;
    rows = m.rows;
    canvasW = m.canvasW;
    canvasH = m.canvasH;
    fieldCols = cols * FIELD_OVERSAMPLE;
    fieldRows = rows * FIELD_OVERSAMPLE;
    field = createBrightnessField(fieldCols, fieldRows);
    buildRows();
  });

  function render(now: number): void {
    const a1x = Math.cos(now * 0.0007) * canvasW * 0.25 + canvasW / 2;
    const a1y = Math.sin(now * 0.0011) * canvasH * 0.3 + canvasH / 2;
    const a2x = Math.cos(now * 0.0013 + Math.PI) * canvasW * 0.2 + canvasW / 2;
    const a2y = Math.sin(now * 0.0009 + Math.PI) * canvasH * 0.25 + canvasH / 2;

    stepParticles(particles, { x: a1x, y: a1y }, { x: a2x, y: a2y }, canvasW, canvasH);

    // Decay field
    for (let i = 0; i < field.length; i++) {
      field[i] *= FIELD_DECAY;
    }

    // Splat particles and attractors into field
    for (const p of particles) {
      splatStamp(field, fieldCols, fieldRows, p.x * scaleX, p.y * scaleY, particleStamp);
    }
    splatStamp(field, fieldCols, fieldRows, a1x * scaleX, a1y * scaleY, largeAttractorStamp);
    splatStamp(field, fieldCols, fieldRows, a2x * scaleX, a2y * scaleY, smallAttractorStamp);

    // Render field to text rows using textContent (safe, no innerHTML)
    for (let r = 0; r < rows && r < rowEls.length; r++) {
      let line = '';
      const fieldRowStart = r * FIELD_OVERSAMPLE * fieldCols;
      for (let c = 0; c < cols; c++) {
        const fieldColStart = c * FIELD_OVERSAMPLE;
        let brightness = 0;
        for (let sy = 0; sy < FIELD_OVERSAMPLE; sy++) {
          const sampleRowOff = fieldRowStart + sy * fieldCols + fieldColStart;
          for (let sx = 0; sx < FIELD_OVERSAMPLE; sx++) {
            brightness += field[sampleRowOff + sx];
          }
        }
        brightness /= FIELD_OVERSAMPLE * FIELD_OVERSAMPLE;
        line += brightnessToChar(brightness);
      }
      rowEls[r].textContent = line;
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

// Only run in browser
if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initBackground);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/islands/ascii-bg.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Verify animation in browser**

```bash
npx astro dev
```

Expected: Faint ASCII characters animate behind the page content, forming shifting organic shapes driven by particle attractors.

- [ ] **Step 6: Commit**

```bash
git add src/islands/ascii-bg.ts tests/islands/ascii-bg.test.ts
git commit -m "feat: implement ASCII animated background island with particle simulation"
```

---

## Task 9: Content Collections — Blog and Projects Schemas

**Files:**
- Create: `src/content/config.ts`, `src/content/blog/hello-world.md`, `src/content/projects/lsalik-dev.md`, `tests/content/schema.test.ts`

- [ ] **Step 1: Write schema validation tests**

Write `tests/content/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mirror the schemas here for unit testing.
// The canonical schemas live in src/content/config.ts.

const blogSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()),
  description: z.string(),
  draft: z.boolean().default(false),
});

const projectSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  stack: z.array(z.string()),
  status: z.string(),
  url: z.string().url().optional(),
  repo: z.string().url(),
  description: z.string(),
  permissions: z.string().default('drwxr-xr-x'),
});

describe('blog schema', () => {
  it('validates a complete blog entry', () => {
    const result = blogSchema.safeParse({
      title: 'Test Post',
      date: '2026-04-01',
      tags: ['test', 'dev'],
      description: 'A test blog post.',
      draft: false,
    });
    expect(result.success).toBe(true);
  });

  it('defaults draft to false', () => {
    const result = blogSchema.safeParse({
      title: 'Test',
      date: '2026-04-01',
      tags: [],
      description: 'Test.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.draft).toBe(false);
    }
  });

  it('rejects missing title', () => {
    const result = blogSchema.safeParse({
      date: '2026-04-01',
      tags: [],
      description: 'Test.',
    });
    expect(result.success).toBe(false);
  });
});

describe('project schema', () => {
  it('validates a complete project entry', () => {
    const result = projectSchema.safeParse({
      title: 'lsalik.dev',
      date: '2026-03-15',
      stack: ['Astro', 'TypeScript', 'Vercel'],
      status: 'Alpha',
      url: 'https://lsalik.dev',
      repo: 'https://github.com/lsalik2/lsalik.dev',
      description: 'Terminal-inspired personal website.',
      permissions: 'drwxr-xr-x',
    });
    expect(result.success).toBe(true);
  });

  it('allows optional url', () => {
    const result = projectSchema.safeParse({
      title: 'slkards',
      date: '2026-01-20',
      stack: ['Python'],
      status: 'Live',
      repo: 'https://github.com/lsalik2/slkards',
      description: 'Discord-based TCG bot.',
    });
    expect(result.success).toBe(true);
  });

  it('defaults permissions to drwxr-xr-x', () => {
    const result = projectSchema.safeParse({
      title: 'Test',
      date: '2026-01-01',
      stack: [],
      status: 'Live',
      repo: 'https://github.com/test/test',
      description: 'Test.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permissions).toBe('drwxr-xr-x');
    }
  });
});
```

- [ ] **Step 2: Install zod and run tests to verify they fail**

```bash
npm install zod
npx vitest run tests/content/schema.test.ts
```

Expected: Tests should pass since zod is available and the schemas are self-contained. If they fail, check the zod import path.

- [ ] **Step 3: Create Content Collection config**

Write `src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    description: z.string(),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    stack: z.array(z.string()),
    status: z.string(),
    url: z.string().url().optional(),
    repo: z.string().url(),
    description: z.string(),
    permissions: z.string().default('drwxr-xr-x'),
  }),
});

export const collections = { blog, projects };
```

- [ ] **Step 4: Create seed blog post**

Write `src/content/blog/hello-world.md`:

```markdown
---
title: "Hello, World"
date: 2026-04-07
tags: [meta, webdev]
description: "First post on lsalik.dev. Built with Astro, obsessed with terminals."
draft: false
---

Welcome to lsalik.dev — a terminal-themed personal website.

This is the first blog post. More to come.
```

- [ ] **Step 5: Create seed project entry**

Write `src/content/projects/lsalik-dev.md`:

```markdown
---
title: "lsalik.dev"
date: 2026-04-07
stack: [Astro, TypeScript, Vercel]
status: "Alpha"
url: "https://lsalik.dev"
repo: "https://github.com/lsalik2/lsalik.dev"
description: "Terminal-inspired personal website."
permissions: "drwxr-xr-x"
---

A dark, monospace-forward personal website that feels like peering into a living terminal session. Features an ASCII animated background, curl-friendly rendering, and a blog system styled as terminal frames.
```

- [ ] **Step 6: Verify Astro build recognizes content collections**

```bash
npx astro build
```

Expected: Build succeeds with content collections recognized.

- [ ] **Step 7: Commit**

```bash
git add src/content/ tests/content/schema.test.ts package.json package-lock.json
git commit -m "feat: add Content Collections with blog and project schemas and seed content"
```

---

## Task 10: Blog Pages

**Files:**
- Create: `src/components/BlogCard.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`

- [ ] **Step 1: Create BlogCard component**

Write `src/components/BlogCard.astro`:

```astro
---
interface Props {
  title: string;
  date: Date;
  tags: string[];
  description: string;
  slug: string;
}

const { title, date, tags, description, slug } = Astro.props;
const dateStr = date.toISOString().split('T')[0];
const tagStr = tags.join(', ');
---
<a href={`/blog/${slug}`} class="blog-card-link">
  <div class="blog-card">
    <div class="blog-card-titlebar">
      ── cat ~/blog/{slug}.md ──
    </div>
    <div class="blog-card-body">
      <h2 class="blog-card-title"># {title}</h2>
      <p class="blog-card-meta">{dateStr} · {tagStr}</p>
      <p class="blog-card-desc">{description}</p>
    </div>
  </div>
</a>

<style>
  .blog-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .blog-card {
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 1.5rem;
    transition: border-color 0.15s;
  }

  .blog-card-link:hover .blog-card {
    border-color: var(--accent);
  }

  .blog-card-titlebar {
    border-bottom: 1px solid var(--border);
    padding: 0.5rem 1rem;
    background-color: var(--bg-surface);
    color: var(--fg-muted);
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .blog-card-body {
    padding: 1rem;
  }

  .blog-card-title {
    font-size: 1rem;
    font-weight: 400;
    color: var(--fg);
    margin-bottom: 0.25rem;
  }

  .blog-card-meta {
    font-size: 0.85rem;
    color: var(--fg-muted);
    margin-bottom: 0.5rem;
  }

  .blog-card-desc {
    color: var(--fg);
    font-size: 0.9rem;
  }
</style>
```

- [ ] **Step 2: Create blog index page**

Write `src/pages/blog/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Page from '../../layouts/Page.astro';
import BlogCard from '../../components/BlogCard.astro';

const posts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---
<Page title="Blog" path="/blog">
  {posts.map(post => (
    <BlogCard
      title={post.data.title}
      date={post.data.date}
      tags={post.data.tags}
      description={post.data.description}
      slug={post.slug}
    />
  ))}
  {posts.length === 0 && <p>No posts yet.</p>}
</Page>
```

- [ ] **Step 3: Create individual blog post page**

Write `src/pages/blog/[...slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import Page from '../../layouts/Page.astro';
import TerminalFrame from '../../components/TerminalFrame.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
const dateStr = post.data.date.toISOString().split('T')[0];
---
<Page title={post.data.title} path={`/blog/${post.slug}`}>
  <TerminalFrame title={`cat ~/blog/${post.slug}.md`}>
    <p class="post-meta">{dateStr} · {post.data.tags.join(', ')}</p>
    <div class="post-content">
      <Content />
    </div>
  </TerminalFrame>
</Page>

<style>
  .post-meta {
    color: var(--fg-muted);
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .post-content :global(h1),
  .post-content :global(h2),
  .post-content :global(h3) {
    color: var(--accent);
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    font-weight: 400;
  }

  .post-content :global(h1)::before { content: '# '; color: var(--fg-muted); }
  .post-content :global(h2)::before { content: '## '; color: var(--fg-muted); }
  .post-content :global(h3)::before { content: '### '; color: var(--fg-muted); }

  .post-content :global(p) {
    margin-bottom: 1rem;
  }

  .post-content :global(code) {
    background-color: var(--bg-surface);
    padding: 0.15rem 0.35rem;
    border-radius: 2px;
    font-size: 0.9em;
  }

  .post-content :global(pre) {
    background-color: var(--bg-surface);
    border: 1px solid var(--border);
    padding: 1rem;
    overflow-x: auto;
    margin-bottom: 1rem;
    border-radius: 4px;
  }

  .post-content :global(pre code) {
    background: none;
    padding: 0;
  }
</style>
```

- [ ] **Step 4: Verify blog pages render**

```bash
npx astro dev
```

Visit `/blog` — should show the hello-world card in terminal-frame style. Click it — should show the full post.

- [ ] **Step 5: Commit**

```bash
git add src/components/BlogCard.astro src/pages/blog/
git commit -m "feat: add blog index and post pages with terminal-frame styling"
```

---

## Task 11: Projects Pages

**Files:**
- Create: `src/pages/projects/index.astro`, `src/pages/projects/[...slug].astro`

- [ ] **Step 1: Create projects index page**

Write `src/pages/projects/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Page from '../../layouts/Page.astro';

const projects = (await getCollection('projects'))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---
<Page title="Projects" path="/projects">
  <div class="project-list">
    {projects.map(project => {
      const dateStr = project.data.date.toISOString().split('T')[0];
      return (
        <a href={`/projects/${project.slug}`} class="project-entry">
          <div class="project-header">
            <span class="perms">{project.data.permissions}</span>
            <span class="user">slk</span>
            <span class="date">{dateStr}</span>
            <span class="name">{project.data.title}/</span>
          </div>
          <div class="project-details">
            <p class="project-desc">{project.data.description}</p>
            <p class="project-stack">Stack: {project.data.stack.join(' · ')}</p>
            <p class="project-status">Status: {project.data.status}</p>
            {project.data.repo && (
              <p class="project-link">→ {project.data.repo.replace('https://', '')}</p>
            )}
          </div>
        </a>
      );
    })}
  </div>
</Page>

<style>
  .project-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .project-entry {
    text-decoration: none;
    color: inherit;
    display: block;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    transition: border-color 0.15s;
  }

  .project-entry:hover {
    border-color: var(--accent);
  }

  .project-header {
    display: flex;
    gap: 2ch;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .perms { color: var(--fg-muted); }
  .user { color: var(--green); }
  .date { color: var(--fg-muted); }
  .name { color: var(--accent); }

  .project-details {
    padding-left: 2ch;
  }

  .project-desc { color: var(--fg); margin-bottom: 0.25rem; }
  .project-stack { color: var(--fg-muted); font-size: 0.9rem; }
  .project-status { color: var(--amber); font-size: 0.9rem; }
  .project-link { color: var(--accent); font-size: 0.9rem; }
</style>
```

- [ ] **Step 2: Create individual project detail page**

Write `src/pages/projects/[...slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import Page from '../../layouts/Page.astro';
import TerminalFrame from '../../components/TerminalFrame.astro';

export async function getStaticPaths() {
  const projects = await getCollection('projects');
  return projects.map(project => ({
    params: { slug: project.slug },
    props: { project },
  }));
}

const { project } = Astro.props;
const { Content } = await project.render();
const dateStr = project.data.date.toISOString().split('T')[0];
---
<Page title={project.data.title} path={`/projects/${project.slug}`}>
  <TerminalFrame title={`cat ~/projects/${project.slug}/README.md`}>
    <div class="project-meta">
      <p><span class="meta-label">Status:</span> <span class="meta-status">{project.data.status}</span></p>
      <p><span class="meta-label">Stack:</span> {project.data.stack.join(' · ')}</p>
      <p><span class="meta-label">Updated:</span> {dateStr}</p>
      {project.data.url && (
        <p><span class="meta-label">URL:</span> <a href={project.data.url}>{project.data.url.replace('https://', '')}</a></p>
      )}
      <p><span class="meta-label">Repo:</span> <a href={project.data.repo}>{project.data.repo.replace('https://', '')}</a></p>
    </div>
    <hr class="divider" />
    <div class="project-content">
      <Content />
    </div>
  </TerminalFrame>
</Page>

<style>
  .project-meta p {
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
  }

  .meta-label {
    color: var(--fg-muted);
  }

  .meta-status {
    color: var(--amber);
  }

  .divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1rem 0;
  }

  .project-content :global(h1),
  .project-content :global(h2),
  .project-content :global(h3) {
    color: var(--accent);
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    font-weight: 400;
  }

  .project-content :global(p) {
    margin-bottom: 1rem;
  }
</style>
```

- [ ] **Step 3: Verify projects pages render**

```bash
npx astro dev
```

Visit `/projects` — should show `ls -la` style listing. Click the entry — should show project detail.

- [ ] **Step 4: Commit**

```bash
git add src/pages/projects/
git commit -m "feat: add projects index and detail pages with ls -la styling"
```

---

## Task 12: ANSI Helpers and Curl Logo

**Files:**
- Create: `src/curl/ansi.ts`, `src/curl/logo.ts`, `tests/curl/ansi.test.ts`, `tests/curl/logo.test.ts`

- [ ] **Step 1: Write ANSI helper tests**

Write `tests/curl/ansi.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bold, green, blue, amber, reset, dim, underline } from '../src/curl/ansi';

describe('ANSI helpers', () => {
  it('wraps text in bold', () => {
    expect(bold('hello')).toBe('\x1b[1mhello\x1b[22m');
  });

  it('wraps text in green', () => {
    expect(green('hi')).toBe('\x1b[32mhi\x1b[39m');
  });

  it('wraps text in blue', () => {
    expect(blue('link')).toBe('\x1b[34mlink\x1b[39m');
  });

  it('wraps text in amber (yellow)', () => {
    expect(amber('warn')).toBe('\x1b[33mwarn\x1b[39m');
  });

  it('wraps text in dim', () => {
    expect(dim('muted')).toBe('\x1b[2mmuted\x1b[22m');
  });

  it('wraps text in underline', () => {
    expect(underline('underlined')).toBe('\x1b[4munderlined\x1b[24m');
  });

  it('returns reset sequence', () => {
    expect(reset()).toBe('\x1b[0m');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/curl/ansi.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ANSI helpers**

Write `src/curl/ansi.ts`:

```ts
export function bold(text: string): string {
  return `\x1b[1m${text}\x1b[22m`;
}

export function dim(text: string): string {
  return `\x1b[2m${text}\x1b[22m`;
}

export function underline(text: string): string {
  return `\x1b[4m${text}\x1b[24m`;
}

export function green(text: string): string {
  return `\x1b[32m${text}\x1b[39m`;
}

export function blue(text: string): string {
  return `\x1b[34m${text}\x1b[39m`;
}

export function amber(text: string): string {
  return `\x1b[33m${text}\x1b[39m`;
}

export function red(text: string): string {
  return `\x1b[31m${text}\x1b[39m`;
}

export function cyan(text: string): string {
  return `\x1b[36m${text}\x1b[39m`;
}

export function reset(): string {
  return '\x1b[0m';
}
```

- [ ] **Step 4: Run ANSI tests to verify they pass**

```bash
npx vitest run tests/curl/ansi.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Write logo tests**

Write `tests/curl/logo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderLogo } from '../src/curl/logo';

describe('renderLogo', () => {
  it('returns a non-empty string', () => {
    const logo = renderLogo();
    expect(logo.length).toBeGreaterThan(0);
  });

  it('contains ANSI escape codes', () => {
    const logo = renderLogo();
    expect(logo).toContain('\x1b[');
  });

  it('contains the underline separator lines', () => {
    const logo = renderLogo();
    const lines = logo.split('\n');
    // At least 6 lines for the logo text + underlines
    expect(lines.length).toBeGreaterThanOrEqual(6);
  });
});
```

- [ ] **Step 6: Run logo tests to verify they fail**

```bash
npx vitest run tests/curl/logo.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement the logo**

Write `src/curl/logo.ts`:

```ts
import { green, blue, amber, cyan, red } from './ansi';

const LOGO_LINES = [
  'AA  AA  AAAA     AAA   AAAAA ',
  'CC  CC CC  BB  ACB BCA CC  CC',
  ' BCCB   BBBBCA CCAAACC CCAACB',
  '  CC   BCAAACB CC   CC CC    ',
];

// Map letters to color functions
const COLOR_MAP: Record<string, (text: string) => string> = {
  A: green,
  B: blue,
  C: amber,
};

function colorizeLogo(lines: string[]): string[] {
  return lines.map(line => {
    let result = '';
    for (const ch of line) {
      const colorFn = COLOR_MAP[ch];
      if (colorFn) {
        result += colorFn(ch);
      } else if (ch === ' ') {
        result += ' ';
      } else {
        result += ch;
      }
    }
    return result;
  });
}

export function renderLogo(): string {
  const colored = colorizeLogo(LOGO_LINES);
  const separator1 = red('D'.repeat(29));
  const separator2 = cyan('E'.repeat(29));
  return [...colored, separator1, separator2].join('\n');
}
```

Note: The letter-to-color mapping follows the spec in FEATURES.md where A, B, C, D, E represent different colored segments. Adjust the actual logo characters to match your desired name rendering.

- [ ] **Step 8: Run logo tests to verify they pass**

```bash
npx vitest run tests/curl/logo.test.ts
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/curl/ansi.ts src/curl/logo.ts tests/curl/ansi.test.ts tests/curl/logo.test.ts
git commit -m "feat: add ANSI helpers and ASCII logo for curl rendering"
```

---

## Task 13: Curl Renderers

**Files:**
- Create: `src/curl/render.ts`, `tests/curl/render.test.ts`

- [ ] **Step 1: Write curl renderer tests**

Write `tests/curl/render.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderHome, renderBlogIndex, renderBlogPost, renderProjectsIndex } from '../src/curl/render';

describe('renderHome', () => {
  it('includes the logo', () => {
    const output = renderHome();
    expect(output).toContain('\x1b['); // ANSI codes from logo
  });

  it('includes navigation hints', () => {
    const output = renderHome();
    expect(output).toContain('curl lsalik.dev/blog');
    expect(output).toContain('curl lsalik.dev/projects');
  });

  it('includes site description', () => {
    const output = renderHome();
    expect(output).toContain('lsalik.dev');
  });
});

describe('renderBlogIndex', () => {
  it('lists posts with titles and dates', () => {
    const posts = [
      { slug: 'hello-world', title: 'Hello, World', date: new Date('2026-04-07'), tags: ['meta'], description: 'First post.' },
    ];
    const output = renderBlogIndex(posts);
    expect(output).toContain('Hello, World');
    expect(output).toContain('2026-04-07');
  });

  it('handles empty post list', () => {
    const output = renderBlogIndex([]);
    expect(output).toContain('No posts');
  });
});

describe('renderBlogPost', () => {
  it('includes the post title and content', () => {
    const output = renderBlogPost({
      title: 'Hello, World',
      date: new Date('2026-04-07'),
      tags: ['meta'],
      content: 'Welcome to lsalik.dev.',
    });
    expect(output).toContain('Hello, World');
    expect(output).toContain('Welcome to lsalik.dev.');
  });
});

describe('renderProjectsIndex', () => {
  it('lists projects in ls -la style', () => {
    const projects = [
      {
        slug: 'lsalik-dev',
        title: 'lsalik.dev',
        date: new Date('2026-03-15'),
        stack: ['Astro'],
        status: 'Alpha',
        description: 'Terminal-inspired site.',
        permissions: 'drwxr-xr-x',
        repo: 'https://github.com/lsalik2/lsalik.dev',
      },
    ];
    const output = renderProjectsIndex(projects);
    expect(output).toContain('drwxr-xr-x');
    expect(output).toContain('lsalik.dev');
    expect(output).toContain('Alpha');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/curl/render.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement curl renderers**

Write `src/curl/render.ts`:

```ts
import { bold, dim, green, blue, amber, cyan, reset } from './ansi';
import { renderLogo } from './logo';

export function renderHome(): string {
  const lines: string[] = [];
  lines.push(renderLogo());
  lines.push('');
  lines.push(bold('lsalik.dev'));
  lines.push(dim('A terminal-inspired personal website.'));
  lines.push('');
  lines.push(dim('─── Navigation ───'));
  lines.push(`  ${green('curl')} lsalik.dev/blog        ${dim('# Blog posts')}`);
  lines.push(`  ${green('curl')} lsalik.dev/projects     ${dim('# Projects')}`);
  lines.push(`  ${green('curl')} lsalik.dev/resume       ${dim('# Resume')}`);
  lines.push(`  ${green('curl')} lsalik.dev/links        ${dim('# Links & contact')}`);
  lines.push('');
  lines.push(dim('Source: https://github.com/lsalik2/lsalik.dev'));
  lines.push(reset());
  return lines.join('\n');
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  date: Date;
  tags: string[];
  description: string;
}

export function renderBlogIndex(posts: BlogPostSummary[]): string {
  const lines: string[] = [];
  lines.push(bold('~/blog'));
  lines.push('');
  if (posts.length === 0) {
    lines.push(dim('No posts yet.'));
  } else {
    for (const post of posts) {
      const dateStr = post.date.toISOString().split('T')[0];
      lines.push(`  ${dim(dateStr)}  ${bold(post.title)}`);
      lines.push(`  ${dim(post.tags.join(', '))}`);
      lines.push(`  ${post.description}`);
      lines.push('');
    }
  }
  lines.push(reset());
  return lines.join('\n');
}

export interface BlogPostFull {
  title: string;
  date: Date;
  tags: string[];
  content: string;
}

export function renderBlogPost(post: BlogPostFull): string {
  const dateStr = post.date.toISOString().split('T')[0];
  const lines: string[] = [];
  lines.push(bold(`# ${post.title}`));
  lines.push(dim(`${dateStr} · ${post.tags.join(', ')}`));
  lines.push('');
  lines.push(post.content);
  lines.push(reset());
  return lines.join('\n');
}

export interface ProjectSummary {
  slug: string;
  title: string;
  date: Date;
  stack: string[];
  status: string;
  description: string;
  permissions: string;
  repo: string;
  url?: string;
}

export function renderProjectsIndex(projects: ProjectSummary[]): string {
  const lines: string[] = [];
  lines.push(bold('~/projects'));
  lines.push('');
  for (const p of projects) {
    const dateStr = p.date.toISOString().split('T')[0];
    lines.push(`${dim(p.permissions)}  ${green('slk')}  ${dim(dateStr)}  ${blue(p.title + '/')}`);
    lines.push(`  ${p.description}`);
    lines.push(`  ${dim('Stack:')} ${p.stack.join(' · ')}`);
    lines.push(`  ${dim('Status:')} ${amber(p.status)}`);
    lines.push(`  ${cyan('→')} ${p.repo.replace('https://', '')}`);
    lines.push('');
  }
  lines.push(reset());
  return lines.join('\n');
}

export function renderResume(content: string): string {
  const lines: string[] = [];
  lines.push(bold('~/resume'));
  lines.push('');
  lines.push(content);
  lines.push(reset());
  return lines.join('\n');
}

export function renderLinks(links: Array<{ label: string; url: string }>): string {
  const lines: string[] = [];
  lines.push(bold('~/links'));
  lines.push('');
  for (const link of links) {
    lines.push(`  ${cyan('→')} ${blue(link.url.replace('https://', ''))}  ${dim(link.label)}`);
  }
  lines.push(reset());
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/curl/render.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/curl/render.ts tests/curl/render.test.ts
git commit -m "feat: add curl plain-text renderers for all page types"
```

---

## Task 14: Edge Middleware for Curl Detection

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Implement the edge middleware**

Write `src/middleware.ts`:

```ts
import { defineMiddleware } from 'astro:middleware';
import { getCollection } from 'astro:content';
import { renderHome, renderBlogIndex, renderBlogPost, renderProjectsIndex, renderResume, renderLinks } from './curl/render';

const TERMINAL_AGENTS = ['curl/', 'wget/', 'httpie/', 'fetch/', 'libfetch/'];

function isTerminalClient(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return TERMINAL_AGENTS.some(agent => ua.includes(agent));
}

function textResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  const ua = request.headers.get('user-agent');
  if (!isTerminalClient(ua)) {
    return next();
  }

  const path = url.pathname;

  if (path === '/' || path === '') {
    return textResponse(renderHome());
  }

  if (path === '/blog' || path === '/blog/') {
    const posts = (await getCollection('blog', ({ data }) => !data.draft))
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map(p => ({
        slug: p.slug,
        title: p.data.title,
        date: p.data.date,
        tags: p.data.tags,
        description: p.data.description,
      }));
    return textResponse(renderBlogIndex(posts));
  }

  if (path.startsWith('/blog/')) {
    const slug = path.replace('/blog/', '').replace(/\/$/, '');
    const posts = await getCollection('blog', ({ data }) => !data.draft);
    const post = posts.find(p => p.slug === slug);
    if (post) {
      const plainContent = post.body ?? post.data.description;
      return textResponse(renderBlogPost({
        title: post.data.title,
        date: post.data.date,
        tags: post.data.tags,
        content: plainContent,
      }));
    }
  }

  if (path === '/projects' || path === '/projects/') {
    const projects = (await getCollection('projects'))
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map(p => ({
        slug: p.slug,
        title: p.data.title,
        date: p.data.date,
        stack: p.data.stack,
        status: p.data.status,
        description: p.data.description,
        permissions: p.data.permissions,
        repo: p.data.repo,
        url: p.data.url,
      }));
    return textResponse(renderProjectsIndex(projects));
  }

  // For other paths, fall through to normal rendering
  return next();
});
```

- [ ] **Step 2: Verify curl detection works**

```bash
npx astro dev &
sleep 3
curl -s http://localhost:4321/
```

Expected: Plain text response with ASCII logo, site description, and navigation hints.

```bash
curl -s http://localhost:4321/blog
```

Expected: Plain text blog listing.

Kill the dev server after testing.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add edge middleware for curl/wget User-Agent detection"
```

---

## Task 15: Curl Demo Island

**Files:**
- Create: `src/islands/curl-demo.ts`, `src/lib/ansi-to-dom.ts`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create safe ANSI-to-DOM converter**

Write `src/lib/ansi-to-dom.ts`:

```ts
/**
 * Converts a string with ANSI escape codes into DOM nodes.
 * Uses safe DOM methods (createElement, textContent) — no innerHTML.
 */

interface StyleState {
  bold: boolean;
  dim: boolean;
  underline: boolean;
  color: string | null;
}

const COLOR_MAP: Record<string, string> = {
  '31': 'ansi-red',
  '32': 'ansi-green',
  '33': 'ansi-amber',
  '34': 'ansi-blue',
  '36': 'ansi-cyan',
};

export function ansiToNodes(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const parts = text.split(/(\x1b\[[0-9;]*m)/);
  const state: StyleState = { bold: false, dim: false, underline: false, color: null };

  for (const part of parts) {
    // Check if this part is an ANSI escape sequence
    const escapeMatch = part.match(/^\x1b\[([0-9;]*)m$/);
    if (escapeMatch) {
      const code = escapeMatch[1];
      switch (code) {
        case '0': // reset
          state.bold = false;
          state.dim = false;
          state.underline = false;
          state.color = null;
          break;
        case '1': state.bold = true; break;
        case '2': state.dim = true; break;
        case '4': state.underline = true; break;
        case '22': state.bold = false; state.dim = false; break;
        case '24': state.underline = false; break;
        case '39': state.color = null; break;
        default:
          if (COLOR_MAP[code]) {
            state.color = COLOR_MAP[code];
          }
          break;
      }
      continue;
    }

    // This is a text part — might contain newlines
    if (part.length === 0) continue;

    const subParts = part.split('\n');
    for (let i = 0; i < subParts.length; i++) {
      if (i > 0) {
        fragment.appendChild(document.createElement('br'));
      }
      const text = subParts[i];
      if (text.length === 0) continue;

      const classes: string[] = [];
      if (state.bold) classes.push('ansi-bold');
      if (state.dim) classes.push('ansi-dim');
      if (state.underline) classes.push('ansi-underline');
      if (state.color) classes.push(state.color);

      if (classes.length === 0) {
        fragment.appendChild(document.createTextNode(text));
      } else {
        const span = document.createElement('span');
        span.className = classes.join(' ');
        span.textContent = text;
        fragment.appendChild(span);
      }
    }
  }

  return fragment;
}
```

- [ ] **Step 2: Implement the curl demo typing animation**

Write `src/islands/curl-demo.ts`:

```ts
import { renderLogo } from '../curl/logo';
import { ansiToNodes } from '../lib/ansi-to-dom';

const COMMAND = '$ curl lsalik.dev';
const RESPONSE_LINES = [
  '',
  renderLogo(),
  '',
  '\x1b[1mlsalik.dev\x1b[22m',
  '\x1b[2mA terminal-inspired personal website.\x1b[22m',
  '',
  '\x1b[2m─── Navigation ───\x1b[22m',
  '  \x1b[32mcurl\x1b[39m lsalik.dev/blog',
  '  \x1b[32mcurl\x1b[39m lsalik.dev/projects',
  '  \x1b[32mcurl\x1b[39m lsalik.dev/resume',
  '  \x1b[32mcurl\x1b[39m lsalik.dev/links',
].join('\n');

function initCurlDemo(): void {
  const container = document.getElementById('curl-demo-output');
  if (!container) return;

  let charIndex = 0;

  function clearContainer(): void {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  function typeCommand(): void {
    if (charIndex <= COMMAND.length) {
      clearContainer();
      // Command text
      const cmdSpan = document.createElement('span');
      cmdSpan.className = 'ansi-green';
      cmdSpan.textContent = COMMAND.slice(0, charIndex);
      container.appendChild(cmdSpan);
      // Blinking cursor
      const cursorSpan = document.createElement('span');
      cursorSpan.className = 'cursor-inline';
      cursorSpan.textContent = '\u2588'; // Full block character
      container.appendChild(cursorSpan);

      charIndex++;
      const delay = 40 + Math.random() * 60;
      setTimeout(typeCommand, delay);
    } else {
      // Done typing command — remove cursor, start streaming
      clearContainer();
      const cmdSpan = document.createElement('span');
      cmdSpan.className = 'ansi-green';
      cmdSpan.textContent = COMMAND;
      container.appendChild(cmdSpan);
      setTimeout(streamResponse, 500);
    }
  }

  let streamIndex = 0;

  function streamResponse(): void {
    if (streamIndex <= RESPONSE_LINES.length) {
      const partial = RESPONSE_LINES.slice(0, streamIndex);

      clearContainer();
      // Re-add command
      const cmdSpan = document.createElement('span');
      cmdSpan.className = 'ansi-green';
      cmdSpan.textContent = COMMAND;
      container.appendChild(cmdSpan);
      container.appendChild(document.createElement('br'));
      // Add streamed response using safe DOM methods
      const responseNodes = ansiToNodes(partial);
      container.appendChild(responseNodes);

      streamIndex++;
      const delay = streamIndex < 20 ? 15 : 5;
      setTimeout(streamResponse, delay);
    }
    // Final state — output stays as-is
  }

  setTimeout(typeCommand, 800);
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', () => {
    if (document.getElementById('curl-demo-output')) {
      initCurlDemo();
    }
  });
}
```

- [ ] **Step 3: Update homepage to include the curl demo**

Replace `src/pages/index.astro`:

```astro
---
import Page from '../layouts/Page.astro';
---
<Page title="Home" path="/">
  <section class="hero">
    <h1 class="hero-title">lsalik.dev</h1>
    <p class="hero-desc">A terminal-inspired personal website.</p>
  </section>

  <section class="curl-demo">
    <div class="curl-demo-frame">
      <div class="curl-demo-titlebar">~ — bash — 80x24</div>
      <div class="curl-demo-body">
        <pre id="curl-demo-output"></pre>
      </div>
    </div>
  </section>
  <script src="../islands/curl-demo.ts"></script>
</Page>

<style>
  .hero {
    padding: 2rem 0;
  }

  .hero-title {
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--accent);
    margin-bottom: 0.5rem;
  }

  .hero-desc {
    color: var(--fg-muted);
  }

  .curl-demo {
    margin-top: 2rem;
  }

  .curl-demo-frame {
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }

  .curl-demo-titlebar {
    background-color: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    padding: 0.5rem 1rem;
    color: var(--fg-muted);
    font-size: 0.85rem;
  }

  .curl-demo-body {
    padding: 1rem;
    background-color: var(--bg);
    min-height: 200px;
  }

  #curl-demo-output {
    font-family: inherit;
    font-size: 0.9rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
  }

  :global(.ansi-bold) { font-weight: 700; }
  :global(.ansi-dim) { opacity: 0.6; }
  :global(.ansi-underline) { text-decoration: underline; }
  :global(.ansi-red) { color: #f85149; }
  :global(.ansi-green) { color: var(--green); }
  :global(.ansi-amber) { color: var(--amber); }
  :global(.ansi-blue) { color: var(--accent); }
  :global(.ansi-cyan) { color: #56d4dd; }
  :global(.cursor-inline) {
    color: var(--cursor);
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }
</style>
```

- [ ] **Step 4: Verify the curl demo works**

```bash
npx astro dev
```

Expected: Homepage shows the hero section, then below it a terminal frame. After ~800ms, `$ curl lsalik.dev` types out character by character. After a pause, the response streams in with colored ASCII logo and navigation hints. All rendering uses safe DOM methods (no innerHTML).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ansi-to-dom.ts src/islands/curl-demo.ts src/pages/index.astro
git commit -m "feat: add curl demo typing animation on homepage with safe DOM rendering"
```

---

## Task 16: Resume Page

**Files:**
- Create: `src/data/resume.md`, `src/pages/resume.astro`, `src/styles/print.css`, `public/resume.pdf`

- [ ] **Step 1: Create resume content**

Write `src/data/resume.md`:

```markdown
# SLK

## Contact

- GitHub: github.com/lsalik2
- Website: lsalik.dev

## Experience

*Add your experience entries here.*

## Education

*Add your education entries here.*

## Skills

*Add your skills here.*
```

This is placeholder content — replace with actual resume data.

- [ ] **Step 2: Create print stylesheet**

Write `src/styles/print.css`:

```css
@media print {
  #ascii-bg,
  .nav,
  .palette-toggle,
  .page-header {
    display: none !important;
  }

  .content-layer {
    position: static;
  }

  .page-main {
    background: none !important;
    padding: 0 !important;
  }

  body {
    background: white;
    color: black;
    font-size: 12px;
    line-height: 1.4;
  }

  a {
    color: black;
    text-decoration: underline;
  }

  .terminal-frame {
    border: 1px solid #ccc;
  }

  .terminal-titlebar {
    background: #f0f0f0;
    color: #333;
  }
}
```

- [ ] **Step 3: Create resume page**

Write `src/pages/resume.astro`:

Note: Astro can import `.md` files directly if they are in `src/`. If the import fails, move the resume into a Content Collection or use a raw text import with a markdown rendering step.

```astro
---
import Page from '../layouts/Page.astro';
import TerminalFrame from '../components/TerminalFrame.astro';

const resumeModule = await import('../data/resume.md');
const ResumeContent = resumeModule.default;
---
<Page title="Resume" path="/resume">
  <div class="resume-actions">
    <a href="/resume.pdf" download class="download-link">[Download PDF]</a>
  </div>
  <TerminalFrame title="cat ~/resume.md">
    <div class="resume-content">
      <ResumeContent />
    </div>
  </TerminalFrame>
</Page>

<style>
  .resume-actions {
    margin-bottom: 1rem;
  }

  .download-link {
    color: var(--accent);
    font-size: 0.9rem;
  }

  .download-link:hover {
    color: var(--accent-bright);
  }

  .resume-content :global(h1),
  .resume-content :global(h2) {
    color: var(--accent);
    font-weight: 400;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .resume-content :global(h1) { font-size: 1.2rem; }
  .resume-content :global(h2) { font-size: 1rem; }
  .resume-content :global(h2)::before { content: '## '; color: var(--fg-muted); }

  .resume-content :global(p),
  .resume-content :global(li) {
    margin-bottom: 0.5rem;
  }

  .resume-content :global(ul) {
    list-style: none;
    padding-left: 2ch;
  }

  .resume-content :global(li)::before {
    content: '- ';
    color: var(--fg-muted);
  }

  .resume-content :global(em) {
    color: var(--fg-muted);
    font-style: normal;
  }
</style>

<link rel="stylesheet" href="/src/styles/print.css" />
```

- [ ] **Step 4: Create a placeholder PDF**

```bash
touch public/resume.pdf
```

Replace this with an actual PDF later.

- [ ] **Step 5: Verify resume page renders**

```bash
npx astro dev
```

Visit `/resume` — should show resume content in a terminal frame with download link. Test `Ctrl+P` — should show a clean, print-friendly version.

- [ ] **Step 6: Commit**

```bash
git add src/data/resume.md src/pages/resume.astro src/styles/print.css public/resume.pdf
git commit -m "feat: add resume page with print stylesheet and PDF download"
```

---

## Task 17: Links Page

**Files:**
- Create: `src/pages/links.astro`

- [ ] **Step 1: Create links page**

Write `src/pages/links.astro`:

```astro
---
import Page from '../layouts/Page.astro';

const links = [
  { label: 'GitHub', url: 'https://github.com/lsalik2' },
  // Add more links as needed:
  // { label: 'Twitter', url: 'https://twitter.com/...' },
  // { label: 'LinkedIn', url: 'https://linkedin.com/in/...' },
  // { label: 'Email', url: 'mailto:...' },
];
---
<Page title="Links" path="/links">
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
  }

  .link-entry {
    display: flex;
    gap: 1ch;
    text-decoration: none;
    padding: 0.5rem 0;
    transition: color 0.15s;
  }

  .link-entry:hover .link-url {
    color: var(--accent-bright);
  }

  .link-arrow {
    color: var(--green);
  }

  .link-url {
    color: var(--accent);
  }

  .link-label {
    color: var(--fg-muted);
  }
</style>
```

- [ ] **Step 2: Verify links page renders**

```bash
npx astro dev
```

Visit `/links` — should show terminal-styled link list.

- [ ] **Step 3: Commit**

```bash
git add src/pages/links.astro
git commit -m "feat: add links page with terminal-styled link list"
```

---

## Task 18: Final Integration and Build Verification

**Files:**
- No new files — verification only

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run Astro type check**

```bash
npx astro check
```

Expected: No type errors.

- [ ] **Step 3: Run production build**

```bash
npx astro build
```

Expected: Build completes successfully.

- [ ] **Step 4: Test curl responses against production build**

```bash
npx astro preview &
sleep 2
curl -s http://localhost:4321/
curl -s http://localhost:4321/blog
curl -s http://localhost:4321/projects
```

Expected: Each returns properly formatted plain text with ANSI codes.

- [ ] **Step 5: Verify all pages load in browser**

Visit each page in the dev server:
- `/` — Homepage with hero + curl demo animation
- `/blog` — Blog index with terminal-frame cards
- `/blog/hello-world` — Blog post in terminal frame
- `/projects` — Projects with `ls -la` listing
- `/projects/lsalik-dev` — Project detail in terminal frame
- `/resume` — Resume with download link
- `/links` — Links list

Verify:
- ASCII background animates behind all pages
- Palette toggle works and persists across navigation
- View Transitions are smooth
- Nav breadcrumb updates per page

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: complete lsalik.dev initial build — all pages and features integrated"
```
