# Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign lsalik.dev to use frame-card layout, updated navigation, typography, and page structures inspired by Ryan's portfolio, while preserving the dual-rendering curl architecture.

**Architecture:** Evolve existing Astro layout in-place (Approach A). Remove `.page-main` wrapper from `Page.astro`, let pages compose their own `TerminalFrame` cards. Update nav links, footer, theme switcher, and ASCII background. Rewrite homepage with frame cards, update projects/blog/contact pages.

**Tech Stack:** Astro 6, TypeScript, CSS custom properties, Google Fonts (Roboto Mono)

**Spec:** `docs/superpowers/specs/2026-04-10-site-redesign-design.md`

---

### Task 1: Create feature branch

**Files:**
- None (git only)

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b redesign/card-layout
```

- [ ] **Step 2: Verify branch**

```bash
git branch --show-current
```

Expected: `redesign/card-layout`

---

### Task 2: Add Roboto Mono font and heading styles

**Files:**
- Modify: `src/layouts/Base.astro:12-17` (add font preconnect/import)
- Modify: `src/styles/global.css:19-27` (add heading font-family rule)

- [ ] **Step 1: Add Google Fonts preconnect and import to Base.astro**

In `src/layouts/Base.astro`, add these lines after the viewport meta tag (line 15), before the generator meta:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Add heading font-family rule to global.css**

In `src/styles/global.css`, after the `html` block (after line 27), add:

```css
h1, h2, h3 {
  font-family: "Roboto Mono", "JetBrains Mono", "Fira Code", monospace;
}
```

- [ ] **Step 3: Verify the dev server starts without errors**

```bash
cd /home/salik/projects/lsalik.dev && npx astro dev --host 2>&1 | head -20
```

Expected: Server starts on a local port with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Base.astro src/styles/global.css
git commit -m "feat: add Roboto Mono font for headings"
```

---

### Task 3: Update nav links and cursor thickness

**Files:**
- Modify: `src/lib/nav.ts` (update link labels, add home link)
- Modify: `src/components/Nav.astro:79-87` (cursor width)

- [ ] **Step 1: Update nav link definitions**

Replace the entire contents of `src/lib/nav.ts` with:

```typescript
export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/', label: '~/' },
  { href: '/projects', label: '~/projects' },
  { href: '/blog', label: '~/blog' },
  { href: '/resume', label: '~/resume' },
  { href: '/contact', label: '~/contact' },
] as const;
```

- [ ] **Step 2: Fix Nav.astro active-link logic for home link**

In `src/components/Nav.astro`, the active check on line 26 needs to handle `/` correctly. Replace:

```astro
class:list={['nav-link', { active: path === link.href || path.startsWith(link.href + '/') }]}
```

with:

```astro
class:list={['nav-link', { active: link.href === '/' ? path === '/' : (path === link.href || path.startsWith(link.href + '/')) }]}
```

- [ ] **Step 3: Make cursor thicker**

In `src/components/Nav.astro`, change the `.cursor` CSS rule (line 79-87):

```css
  .cursor {
    display: inline-block;
    width: 0.8ch;
    height: 1.1em;
    background-color: var(--cursor);
    margin-left: 0.25ch;
    vertical-align: text-bottom;
    animation: blink 1s step-end infinite;
  }
```

(Changed `width` from `0.6ch` to `0.8ch`.)

- [ ] **Step 4: Verify nav renders correctly**

Start dev server and check the homepage. Nav links should show `~/`, `~/projects`, `~/blog`, `~/resume`, `~/contact`. The `~/` link should be active on the homepage. Cursor should be visibly thicker.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav.ts src/components/Nav.astro
git commit -m "feat: update nav links to unix-path style with home link and thicker cursor"
```

---

### Task 4: Replace theme switcher with colored dots

**Files:**
- Modify: `src/components/PaletteToggle.astro` (replace button with dot circles)
- Modify: `src/islands/palette-toggle.ts` (update to handle multiple buttons)
- Modify: `src/styles/palettes.css` (add `--palette-dot` property to each palette)

- [ ] **Step 1: Add dot color property to each palette**

In `src/styles/palettes.css`, add a `--palette-dot` property to each palette. This is the representative color shown in the dot. Add as the last property in each palette block:

```css
/* dark-terminal (line ~17): */
  --palette-dot: #58a6ff;

/* amber-crt (line ~35): */
  --palette-dot: #ffb000;

/* green-phosphor (line ~53): */
  --palette-dot: #33ff66;

/* synthwave (line ~71): */
  --palette-dot: #ff2a6d;

/* mocha (line ~89): */
  --palette-dot: #d48d6a;
```

- [ ] **Step 2: Replace PaletteToggle.astro with dot-based switcher**

Replace the entire contents of `src/components/PaletteToggle.astro` with:

```astro
---
import { PALETTES } from '../lib/palettes';

// Map palette IDs to their dot colors (must match palettes.css --palette-dot)
const DOT_COLORS: Record<string, string> = {
  'dark-terminal': '#58a6ff',
  'amber-crt': '#ffb000',
  'green-phosphor': '#33ff66',
  'synthwave': '#ff2a6d',
  'mocha': '#d48d6a',
};
---
<div class="palette-dots" role="radiogroup" aria-label="Color palette">
  {PALETTES.map(id => (
    <button
      class="palette-dot"
      data-palette={id}
      type="button"
      aria-label={`Switch to ${id} palette`}
      style={`--dot-color: ${DOT_COLORS[id] ?? '#888'}`}
    />
  ))}
</div>

<style>
  .palette-dots {
    display: flex;
    gap: 5px;
    align-items: center;
    padding-top: 0.35rem;
  }

  .palette-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: none;
    background-color: var(--dot-color);
    cursor: pointer;
    transition: transform 0.15s;
    padding: 0;
  }

  .palette-dot:hover {
    transform: scale(1.3);
  }

  .palette-dot.active {
    outline: 2px solid var(--fg-muted);
    outline-offset: 2px;
  }
</style>
```

- [ ] **Step 3: Update palette-toggle.ts to handle dot buttons**

Replace the entire contents of `src/islands/palette-toggle.ts` with:

```typescript
import { PALETTES, type PaletteName } from '../lib/palettes';

const STORAGE_KEY = 'palette';
const DEFAULT_PALETTE: PaletteName = 'dark-terminal';

function readStoredPalette(): PaletteName {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (PALETTES as readonly string[]).includes(saved)) {
      return saved as PaletteName;
    }
  } catch (_) {}
  return DEFAULT_PALETTE;
}

function applyPalette(name: PaletteName): void {
  document.documentElement.dataset.palette = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch (_) {}
  // Update active dot
  document.querySelectorAll('.palette-dot').forEach(dot => {
    dot.classList.toggle('active', (dot as HTMLElement).dataset.palette === name);
  });
}

document.addEventListener('astro:before-swap', (event) => {
  const ev = event as Event & { newDocument: Document };
  const saved = readStoredPalette();
  ev.newDocument.documentElement.dataset.palette = saved;
});

document.addEventListener('astro:page-load', () => {
  const dots = document.querySelectorAll('.palette-dot');
  if (!dots.length) return;

  const current = readStoredPalette();
  applyPalette(current);

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const palette = (dot as HTMLElement).dataset.palette as PaletteName;
      if (palette) applyPalette(palette);
    });
  });
});
```

- [ ] **Step 4: Remove nextPalette from palettes.ts**

In `src/lib/palettes.ts`, remove the `nextPalette` function (lines 10-13) since the dot-based switcher no longer cycles. The file becomes:

```typescript
export const PALETTES = [
  'dark-terminal',
  'amber-crt',
  'green-phosphor',
  'synthwave',
  'mocha',
] as const;
export type PaletteName = typeof PALETTES[number];
```

- [ ] **Step 5: Verify theme dots render and switch palettes**

Check in the browser that 5 colored dots appear in the header, clicking each switches the palette, and the active dot has an outline. Refresh the page to confirm persistence.

- [ ] **Step 6: Commit**

```bash
git add src/components/PaletteToggle.astro src/islands/palette-toggle.ts src/lib/palettes.ts src/styles/palettes.css
git commit -m "feat: replace theme text button with colored dot switcher"
```

---

### Task 5: Update Page.astro layout — remove page-main, add footer with separator and nav

**Files:**
- Modify: `src/layouts/Page.astro` (restructure layout)

- [ ] **Step 1: Replace Page.astro with new layout**

Replace the entire contents of `src/layouts/Page.astro` with:

```astro
---
import Base from './Base.astro';
import Nav from '../components/Nav.astro';
import PaletteToggle from '../components/PaletteToggle.astro';
import { NAV_LINKS } from '../lib/nav';

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
    <main class="page-content">
      <slot />
    </main>
    <footer class="page-footer">
      <nav class="footer-nav">
        {NAV_LINKS.map(link => (
          <a href={link.href} class="footer-nav-link">{link.label}</a>
        ))}
      </nav>
      <div class="footer-meta">
        <span class="footer-source-line">source: <a href="https://github.com/lsalik2/lsalik.dev" class="footer-link" target="_blank" rel="noopener noreferrer">github.com/lsalik2/lsalik.dev</a></span>
        <span class="footer-copy">&copy; Luis Salik &middot; lsalik.dev</span>
        <span class="footer-privacy">no cookies, no analytics, no tracking. theme preference stored locally in your browser. hosted on Vercel, which briefly processes visitor IPs for routing and DDoS protection.</span>
      </div>
    </footer>
  </div>
  <script src="../islands/palette-toggle.ts"></script>
</Base>

<style>
  .page-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 1.5rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .page-content {
    flex: 1;
  }

  .page-footer {
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
    padding-bottom: 1.5rem;
  }

  .footer-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5ch;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }

  .footer-nav-link {
    color: var(--fg-muted);
    text-decoration: none;
  }

  .footer-nav-link:hover {
    color: var(--accent-bright);
    text-decoration: underline;
  }

  .footer-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--fg-muted);
    opacity: 0.6;
  }

  .footer-link {
    color: var(--fg-muted);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .footer-link:hover {
    color: var(--accent);
  }

  .footer-privacy {
    margin-top: 0.4rem;
    font-size: 0.7rem;
    opacity: 0.75;
    max-width: 60ch;
  }
</style>
```

- [ ] **Step 2: Verify all existing pages still render**

Navigate to `/`, `/about`, `/projects`, `/blog`, `/resume`, `/contact` — content should now flow without the semi-transparent background box. Footer should show nav links above the meta content with a border separator.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Page.astro
git commit -m "feat: remove page-main wrapper, add footer nav and separator bar"
```

---

### Task 6: Update ASCII background — reduce opacity and font-size

**Files:**
- Modify: `src/layouts/Base.astro:41-48` (opacity)
- Modify: `src/islands/ascii-bg.ts:106-107` (font-size and line-height)

- [ ] **Step 1: Decrease background opacity**

In `src/layouts/Base.astro`, in the `<style is:global>` block, change:

```css
    opacity: 0.3;
```

to:

```css
    opacity: 0.22;
```

- [ ] **Step 2: Decrease font-size in ascii-bg.ts**

In `src/islands/ascii-bg.ts`, change lines 106-107:

```typescript
  const FONT_SIZE = 14;
  const LINE_HEIGHT = 16;
```

to:

```typescript
  const FONT_SIZE = 11;
  const LINE_HEIGHT = 13;
```

- [ ] **Step 3: Verify background renders smaller and more subtle**

Check in browser — ASCII characters should be noticeably smaller and more transparent.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Base.astro src/islands/ascii-bg.ts
git commit -m "feat: reduce ASCII background opacity to 0.22 and font-size to 11px"
```

---

### Task 7: Add animation variant system

**Files:**
- Modify: `src/islands/ascii-bg.ts` (extract presets, random selection)

- [ ] **Step 1: Refactor ascii-bg.ts with preset system**

Replace lines 1-15 of `src/islands/ascii-bg.ts` (the constants section) with:

```typescript
// ASCII Animated Background — per-cell flow field (sums of sines).
// Three decorrelated layers; per cell, the brightest layer wins.

export const RAMP = ' -_:,;^+/|\\?0oOQ#%@';

interface AnimationPreset {
  NOISE_X: number;
  NOISE_Y: number;
  NOISE_XY: number;
  NOISE_XMY: number;
  TIME_X: number;
  TIME_Y: number;
  TIME_XY: number;
  TIME_XMY: number;
}

const PRESETS: AnimationPreset[] = [
  // Original lsalik.dev
  {
    NOISE_X: 0.08, NOISE_Y: 0.11, NOISE_XY: 0.06, NOISE_XMY: 0.09,
    TIME_X: 0.6, TIME_Y: 0.4, TIME_XY: 0.5, TIME_XMY: 0.3,
  },
  // Ryan's variant
  {
    NOISE_X: 0.12, NOISE_Y: 0.092, NOISE_XY: 0.051, NOISE_XMY: 0.063,
    TIME_X: 0.42, TIME_Y: 0.61, TIME_XY: 0.35, TIME_XMY: 0.55,
  },
];

const ACTIVE_PRESET = PRESETS[Math.floor(Math.random() * PRESETS.length)];
```

- [ ] **Step 2: Update the sample function to use the active preset**

Replace the existing `sample` function with:

```typescript
export function sample(x: number, y: number, t: number, phase: number): number {
  const p = ACTIVE_PRESET;
  const s1 = Math.sin(x * p.NOISE_X + t * p.TIME_X + phase);
  const s2 = Math.sin(y * p.NOISE_Y - t * p.TIME_Y + phase * 1.3);
  const s3 = Math.sin((x + y) * p.NOISE_XY + t * p.TIME_XY);
  const s4 = Math.sin((x - y) * p.NOISE_XMY - t * p.TIME_XMY + phase * 0.7);
  const raw = (s1 + s2 + s3 + s4) * 0.25 + 0.5;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}
```

- [ ] **Step 3: Verify both variants work**

Refresh the page multiple times — the background pattern should vary between two distinct looks. Both should render smoothly.

- [ ] **Step 4: Commit**

```bash
git add src/islands/ascii-bg.ts
git commit -m "feat: add animation variant system with random preset selection"
```

---

### Task 8: Update PageHeader — remove prefixes

**Files:**
- Modify: `src/components/PageHeader.astro` (add Roboto Mono to heading)
- Modify: `src/pages/projects/index.astro:10` (update heading/description)
- Modify: `src/pages/blog/index.astro:11` (update heading/description)
- Modify: `src/pages/contact.astro:12` (update heading/description)
- Modify: `src/pages/about.astro:10` (update heading/description)
- Modify: `src/pages/resume.astro:12` (update heading/description)

- [ ] **Step 1: Add Roboto Mono to PageHeader heading**

In `src/components/PageHeader.astro`, add `font-family` to the `.page-heading` style:

```css
  .page-heading {
    font-family: "Roboto Mono", "JetBrains Mono", "Fira Code", monospace;
    color: var(--accent);
    margin: 0 0 0.35rem;
    font-size: 1.2rem;
    font-weight: 600;
  }
```

- [ ] **Step 2: Update all PageHeader usages across pages**

In `src/pages/projects/index.astro` line 10, change:
```astro
<PageHeader heading="~/projects" description="ls -la ~/projects — things I've built, public and otherwise." />
```
to:
```astro
<PageHeader heading="projects" description="things I've built, public and otherwise." />
```

In `src/pages/blog/index.astro` line 11, change:
```astro
<PageHeader heading="~/blog" description="cd ~/blog — essays, notes, and the occasional rant." />
```
to:
```astro
<PageHeader heading="blog" description="essays, notes, and the occasional rant." />
```

In `src/pages/contact.astro` line 12, change:
```astro
<PageHeader heading="~/contact" description="cat ~/contact — how to reach me, socials included." />
```
to:
```astro
<PageHeader heading="contact" description="how to reach me, socials included." />
```

In `src/pages/about.astro` line 10, change:
```astro
<PageHeader heading="~/about" description="cat about.md — who I am, what I build, what I'm into." />
```
to:
```astro
<PageHeader heading="about" description="who I am, what I build, what I'm into." />
```

In `src/pages/resume.astro` line 12, change:
```astro
<PageHeader heading="~/resume" description="less ~/resume — my cv, with a download link at the bottom." />
```
to:
```astro
<PageHeader heading="resume" description="my cv, with a download link at the bottom." />
```

- [ ] **Step 3: Verify all pages show clean headings**

Check each page — headings should be plain words without `~/` prefix, descriptions should not have `ls -la` or `cat` prefixes.

- [ ] **Step 4: Commit**

```bash
git add src/components/PageHeader.astro src/pages/projects/index.astro src/pages/blog/index.astro src/pages/contact.astro src/pages/about.astro src/pages/resume.astro
git commit -m "feat: remove ~/ and command prefixes from page headers"
```

---

### Task 9: Redesign homepage with frame cards

**Files:**
- Modify: `src/pages/index.astro` (full rewrite)
- Modify: `src/data/about.md` (not needed — we'll inline the content in the homepage)

- [ ] **Step 1: Replace index.astro with frame-card homepage**

Replace the entire contents of `src/pages/index.astro` with:

```astro
---
import Page from '../layouts/Page.astro';
import TerminalFrame from '../components/TerminalFrame.astro';
---
<Page title="Home" path="/">
  <section class="hero">
    <h1 class="hero-title"><span class="accent">lsalik</span>.dev</h1>
    <p class="tagline">aerospace and software engineer</p>
  </section>

  <TerminalFrame title="whoami">
    <dl class="whoami-grid">
      <dt>name</dt>
      <dd>Luis Salik</dd>
      <dt>role</dt>
      <dd>aerospace & software engineer</dd>
      <dt>focus</dt>
      <dd>ML &middot; control systems &middot; manufacturing</dd>
      <dt>status</dt>
      <dd class="status-open">open to opportunities</dd>
      <dt>github</dt>
      <dd><a href="https://github.com/lsalik2">lsalik2</a></dd>
      <dt>linkedin</dt>
      <dd><a href="https://linkedin.com/in/luis-salik">luis-salik</a></dd>
    </dl>
  </TerminalFrame>

  <TerminalFrame title="./about">
    <p class="about-text">
      hi! i'm luis salik. i'm an <span class="accent">aerospace</span> and
      <span class="accent">software engineer</span> specializing in
      <span class="accent">machine learning</span>, control systems, and
      manufacturing processes. i like to build things; mostly software, mostly
      in the open.
    </p>
  </TerminalFrame>

  <TerminalFrame title="./interests">
    <ul class="interests-list">
      <li><span class="bullet">&rsaquo;</span> autonomous control systems</li>
      <li><span class="bullet">&rsaquo;</span> operating systems and low-level programming</li>
      <li><span class="bullet">&rsaquo;</span> machine learning and its applications</li>
      <li><span class="bullet">&rsaquo;</span> game design and development</li>
      <li><span class="bullet">&rsaquo;</span> small, owned infrastructure</li>
      <li><span class="bullet">&rsaquo;</span> anything that runs offline</li>
    </ul>
  </TerminalFrame>

  <TerminalFrame title="./resume">
    <p class="resume-summary">
      for my full professional and educational background, check out
      <a href="/resume">~/resume</a>.
    </p>
    <a href="/resume.pdf" class="resume-download" download>
      &rarr; download resume.pdf
    </a>
  </TerminalFrame>

  <nav class="quick-links">
    <a href="/projects">&rarr; projects</a>
    <a href="/blog">&rarr; blog</a>
    <a href="/contact">&rarr; contact</a>
  </nav>

  <section class="curl-easter-egg">
    <button class="curl-teaser" id="curl-teaser" type="button" aria-expanded="false">
      <span class="curl-prompt">$</span> curl -L lsalik.dev
    </button>
    <div class="curl-demo-wrapper" id="curl-demo-wrapper">
      <div class="curl-demo-frame">
        <div class="curl-demo-titlebar">~ &mdash; bash &mdash; 80x24</div>
        <div class="curl-demo-body">
          <pre id="curl-demo-output"></pre>
        </div>
      </div>
    </div>
  </section>
  <script src="../islands/curl-demo.ts"></script>
</Page>

<style>
  .hero {
    padding: 1.5rem 0 1.25rem;
  }

  .hero-title {
    font-family: "Roboto Mono", "JetBrains Mono", "Fira Code", monospace;
    font-size: 1.8rem;
    color: var(--fg);
    margin: 0 0 0.35rem;
    font-weight: 600;
  }

  .accent {
    color: var(--accent);
  }

  .tagline {
    font-size: 0.95rem;
    color: var(--fg-muted);
    margin: 0;
  }

  /* whoami grid */
  .whoami-grid {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.3rem 2rem;
    font-size: 0.9rem;
  }

  .whoami-grid dt {
    color: var(--fg-muted);
  }

  .whoami-grid dd {
    color: var(--fg);
  }

  .status-open {
    color: var(--green);
  }

  /* about */
  .about-text {
    font-size: 0.9rem;
    line-height: 1.65;
  }

  .about-text .accent {
    color: var(--accent);
  }

  /* interests */
  .interests-list {
    list-style: none;
    padding: 0;
    font-size: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .bullet {
    color: var(--accent);
    margin-right: 0.5ch;
  }

  /* resume */
  .resume-summary {
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }

  .resume-download {
    display: inline-block;
    font-size: 0.9rem;
    color: var(--accent);
    text-decoration: none;
  }

  .resume-download:hover {
    color: var(--accent-bright);
  }

  /* quick links */
  .quick-links {
    display: flex;
    gap: 2rem;
    margin-top: 0.5rem;
    margin-bottom: 2rem;
    font-size: 0.9rem;
  }

  .quick-links a {
    color: var(--accent);
    text-decoration: none;
  }

  .quick-links a:hover {
    color: var(--accent-bright);
  }

  /* curl easter egg */
  .curl-easter-egg {
    margin-top: 1rem;
  }

  .curl-teaser {
    display: block;
    width: 100%;
    text-align: left;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem 1rem;
    color: var(--fg-muted);
    font-family: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .curl-teaser:hover {
    border-color: var(--accent);
    color: var(--fg);
  }

  .curl-prompt {
    color: var(--green);
    margin-right: 0.25ch;
  }

  .curl-demo-wrapper {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.4s ease;
  }

  .curl-demo-wrapper.expanded {
    max-height: 600px;
  }

  .curl-demo-frame {
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 4px 4px;
    overflow: hidden;
  }

  .curl-demo-titlebar {
    background-color: var(--bg-surface);
    color: var(--fg-muted);
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    border-bottom: 1px solid var(--border);
  }

  .curl-demo-body {
    background-color: var(--bg);
    min-height: 380px;
    padding: 0.75rem 1rem;
  }

  #curl-demo-output {
    font: inherit;
    line-height: 1;
    letter-spacing: 0;
    white-space: pre-wrap;
    margin: 0;
  }
</style>

<style is:global>
  .ansi-bold { font-weight: bold; }
  .ansi-dim { opacity: 0.6; }
  .ansi-underline { text-decoration: underline; }
  .ansi-red { color: var(--ansi-red, #e06c75); }
  .ansi-green { color: var(--ansi-green, #98c379); }
  .ansi-amber { color: var(--ansi-amber, #e5c07b); }
  .ansi-blue { color: var(--ansi-blue, #61afef); }
  .ansi-cyan { color: var(--ansi-cyan, #56b6c2); }

  .cursor-inline {
    color: var(--cursor, var(--accent, #98c379));
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
</style>
```

- [ ] **Step 2: Update curl-demo.ts to handle the easter egg expand behavior**

In `src/islands/curl-demo.ts`, replace the `init` function (lines 92-100) with:

```typescript
function init(): void {
  const teaser = document.getElementById('curl-teaser');
  const wrapper = document.getElementById('curl-demo-wrapper');
  const container = document.getElementById('curl-demo-output');
  if (!teaser || !wrapper || !container) return;

  let started = false;
  teaser.addEventListener('click', () => {
    const isExpanded = wrapper.classList.contains('expanded');
    if (isExpanded) {
      wrapper.classList.remove('expanded');
      teaser.setAttribute('aria-expanded', 'false');
    } else {
      wrapper.classList.add('expanded');
      teaser.setAttribute('aria-expanded', 'true');
      if (!started) {
        started = true;
        runCurlDemo(container);
      }
    }
  });
}
```

- [ ] **Step 3: Verify homepage renders correctly**

Check that:
- Hero shows `lsalik.dev` with accent coloring
- Four frame cards appear: whoami, ./about, ./interests, ./resume
- Quick links row shows below frames
- Curl teaser bar is at the bottom
- Clicking the teaser expands and starts the demo animation

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/islands/curl-demo.ts
git commit -m "feat: redesign homepage with frame cards and curl easter egg"
```

---

### Task 10: Redesign projects page with TerminalFrame cards

**Files:**
- Modify: `src/content.config.ts` (add endDate field)
- Modify: `src/pages/projects/index.astro` (rewrite to use TerminalFrame)

- [ ] **Step 1: Add endDate to project schema**

In `src/content.config.ts`, add `endDate` as an optional field to the projects schema (after the `date` field on line 19):

```typescript
    endDate: z.coerce.date().optional(),
```

The full projects schema becomes:
```typescript
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    stack: z.array(z.string()),
    status: z.string(),
    url: z.string().url().optional(),
    repo: z.string().url().optional(),
    description: z.string(),
    permissions: z.string().default('drwxr-xr-x'),
  }),
});
```

- [ ] **Step 2: Rewrite projects/index.astro**

Replace the entire contents of `src/pages/projects/index.astro` with:

```astro
---
import { getCollection } from 'astro:content';
import Page from '../../layouts/Page.astro';
import PageHeader from '../../components/PageHeader.astro';

const projects = await getCollection('projects');
projects.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

function formatDateRange(start: Date, end?: Date): string {
  const startYear = start.getFullYear().toString();
  if (!end) return `${startYear} - present`;
  const endYear = end.getFullYear().toString();
  return startYear === endYear ? startYear : `${startYear} - ${endYear}`;
}
---
<Page title="Projects" path="/projects">
  <PageHeader heading="projects" description="things I've built, public and otherwise." />
  <div class="project-list">
    {projects.map(project => (
      <a href={`/projects/${project.id}`} class="project-card">
        <div class="project-titlebar">
          <span class="permissions">{project.data.permissions}</span>
          {' '}
          <span class="owner">slk</span>
        </div>
        <div class="project-body">
          <div class="project-header">
            <span class="project-name">{project.data.title}</span>
            <span class="project-dates">{formatDateRange(project.data.date, project.data.endDate)}</span>
          </div>
          <p class="project-desc">{project.data.description}</p>
          <div class="project-status">status: {project.data.status}</div>
          <div class="project-tags">
            {project.data.stack.map(tag => (
              <span class="tag">#{tag}</span>
            ))}
          </div>
        </div>
      </a>
    ))}
  </div>
</Page>

<style>
  .project-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .project-card {
    display: block;
    text-decoration: none;
    color: inherit;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    transition: border-color 0.15s, background-color 0.15s;
  }

  .project-card:hover {
    border-color: var(--accent);
    background-color: var(--bg-surface);
  }

  .project-titlebar {
    background-color: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    padding: 0.3rem 0.875rem;
    font-size: 0.8rem;
    color: var(--fg-muted);
  }

  .permissions {
    color: var(--fg-muted);
  }

  .owner {
    color: var(--green);
  }

  .project-body {
    padding: 1rem 1.25rem;
    background-color: var(--bg);
  }

  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.5rem;
    gap: 1rem;
  }

  .project-name {
    font-family: "Roboto Mono", "JetBrains Mono", "Fira Code", monospace;
    font-weight: 600;
    color: var(--accent);
    font-size: 1rem;
  }

  .project-dates {
    color: var(--fg-muted);
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .project-desc {
    font-size: 0.9rem;
    color: var(--fg);
    margin: 0 0 0.5rem;
    line-height: 1.5;
  }

  .project-status {
    font-size: 0.85rem;
    color: var(--amber);
    margin-bottom: 0.5rem;
  }

  .project-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6ch;
  }

  .tag {
    color: var(--ansi-cyan);
    font-size: 0.8rem;
  }
</style>
```

- [ ] **Step 3: Verify projects page renders with new layout**

Check that:
- Each project shows as a framed card with titlebar showing `drwxr-xr-x slk`
- Project name in accent color with Roboto Mono, date range on the right
- Tags shown as cyan `#tag` format at the bottom
- Entire card is clickable
- Hover shows border/bg change

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/pages/projects/index.astro
git commit -m "feat: redesign projects page with terminal frame cards and date ranges"
```

---

### Task 11: Update blog page styling

**Files:**
- Modify: `src/components/BlogCard.astro` (add Roboto Mono to title, ensure hover bg)

- [ ] **Step 1: Add Roboto Mono font to blog card title and hover bg**

In `src/components/BlogCard.astro`, update the `.card-title` style and add a hover background rule:

```css
  .card-title {
    font-family: "Roboto Mono", "JetBrains Mono", "Fira Code", monospace;
    margin: 0 0 0.4rem;
    color: var(--accent);
    font-weight: 600;
  }
```

Also update the existing `.card-frame` transition (line 39 of BlogCard.astro) from:

```css
    transition: border-color 0.15s ease;
```

to:

```css
    transition: border-color 0.15s ease, background-color 0.15s ease;
```

And add this new rule after the existing `.blog-card:hover .card-frame` block (after line 44):

```css
  .blog-card:hover .card-body {
    background-color: var(--bg-surface);
  }
```

- [ ] **Step 2: Update blog index page header**

Already done in Task 8 — verify the heading says `blog` without prefix.

- [ ] **Step 3: Verify blog cards render with updated styling**

Check blog index — card titles should use Roboto Mono, hover should show bg shift and border change.

- [ ] **Step 4: Commit**

```bash
git add src/components/BlogCard.astro
git commit -m "feat: update blog cards with Roboto Mono title and hover background"
```

---

### Task 12: Redesign contact page with dl/dt/dd grid in TerminalFrames

**Files:**
- Modify: `src/pages/contact.astro` (rewrite to use TerminalFrame + grid)

- [ ] **Step 1: Replace contact.astro with frame-based layout**

Replace the entire contents of `src/pages/contact.astro` with:

```astro
---
import Page from '../layouts/Page.astro';
import PageHeader from '../components/PageHeader.astro';
import TerminalFrame from '../components/TerminalFrame.astro';
import { CONTACT_SECTIONS } from '../data/contact';
---
<Page title="Contact" path="/contact">
  <PageHeader heading="contact" description="how to reach me, socials included." />

  {CONTACT_SECTIONS.map(section => (
    <TerminalFrame title={section.heading}>
      <dl class="contact-grid">
        {section.links.map(link => (
          <>
            <dt>{link.label.toLowerCase()}</dt>
            <dd><a href={link.url} target="_blank" rel="noopener noreferrer">{link.url.replace('https://', '')}</a></dd>
          </>
        ))}
      </dl>
    </TerminalFrame>
  ))}
</Page>

<style>
  .contact-grid {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.4rem 2rem;
    font-size: 0.9rem;
  }

  .contact-grid dt {
    color: var(--fg-muted);
  }

  .contact-grid dd {
    color: var(--fg);
  }

  .contact-grid a {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .contact-grid a:hover {
    color: var(--accent-bright);
    text-decoration-color: var(--accent-bright);
  }
</style>
```

- [ ] **Step 2: Verify contact page renders correctly**

Check that:
- Two TerminalFrames appear: `professional` and `esports`
- Each shows a clean grid with labels on the left and linked URLs on the right
- Links are underlined in accent color

- [ ] **Step 3: Commit**

```bash
git add src/pages/contact.astro
git commit -m "feat: redesign contact page with terminal frames and dl/dt/dd grid"
```

---

### Task 13: Update about page to use TerminalFrame

**Files:**
- Modify: `src/pages/about.astro` (wrap in TerminalFrame)

- [ ] **Step 1: Update about.astro to use a TerminalFrame**

Replace the entire contents of `src/pages/about.astro` with:

```astro
---
import Page from '../layouts/Page.astro';
import PageHeader from '../components/PageHeader.astro';
import TerminalFrame from '../components/TerminalFrame.astro';
import '../styles/prose.css';

const aboutModule = await import('../data/about.md');
const AboutContent = aboutModule.default;
---
<Page title="About" path="/about">
  <PageHeader heading="about" description="who I am, what I build, what I'm into." />
  <TerminalFrame title="cat about.md">
    <div class="prose">
      <AboutContent />
    </div>
  </TerminalFrame>
</Page>
```

- [ ] **Step 2: Verify about page renders in a frame**

Content should appear inside a terminal frame with titlebar `── cat about.md ──`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/about.astro
git commit -m "feat: wrap about page content in terminal frame"
```

---

### Task 14: Update resume page styling consistency

**Files:**
- Modify: `src/pages/resume.astro` (update header, already uses TerminalFrame)

- [ ] **Step 1: Verify resume page looks consistent**

Resume already uses `TerminalFrame` and was updated in Task 8 with the new header. No further changes needed — just verify it looks consistent with the rest of the redesign.

- [ ] **Step 2: Commit (if any tweaks were needed)**

If any visual tweaks were needed, commit them. Otherwise this task is a verification-only step.

---

### Task 15: Final verification and cleanup

**Files:**
- None (verification only)

- [ ] **Step 1: Build the project**

```bash
cd /home/salik/projects/lsalik.dev && npx astro build 2>&1 | tail -20
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify all pages in dev server**

Start dev server and check every page:
- `/` — hero, four frame cards, quick links, curl easter egg
- `/about` — framed content
- `/projects` — frame cards with titlebar, dates, tags
- `/blog` — cards with Roboto Mono titles
- `/resume` — framed with download link
- `/contact` — dl/dt/dd grids in frames

- [ ] **Step 3: Verify theme switching works on all pages**

Click through all 5 palette dots on multiple pages. Check persistence across page navigations.

- [ ] **Step 4: Verify curl rendering still works**

```bash
curl -L localhost:4321
curl -L localhost:4321/projects
curl -L localhost:4321/blog
curl -L localhost:4321/contact
```

Expected: Plain-text ANSI responses for all routes.

- [ ] **Step 5: Check responsive behavior**

Resize browser to mobile widths (~375px). Verify:
- Nav links wrap properly
- Frame cards are readable
- Project header/dates stack if needed
- Footer nav wraps

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: final polish and responsive fixes for redesign"
```
