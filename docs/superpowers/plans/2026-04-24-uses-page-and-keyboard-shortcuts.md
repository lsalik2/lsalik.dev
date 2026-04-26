# /uses page + vim-style keyboard shortcuts — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/uses` page rendered in both browser and curl modes (curl version reads like `neofetch`), plus vim-style keyboard shortcuts (`g h`, `g b`, `g p`, `g c`, `g u`) with a `?` help overlay.

**Architecture:** New typed `USES` data module feeds both render paths. Browser route reuses the existing `Page` layout and `TerminalFrame` component; curl route adds `renderUses()` to `src/curl/render.ts` and a route branch in `src/middleware.ts`. A pure `resolveChord()` function in `src/lib/shortcuts.ts` drives a thin DOM island that listens for keydowns and calls `navigate()` from `astro:transitions/client`.

**Tech Stack:** Astro 6 SSR, TypeScript, Vitest, Vercel edge.

**Spec:** `docs/superpowers/specs/2026-04-24-uses-page-and-keyboard-shortcuts-design.md`

---

## File map

**Create**
- `src/data/uses.ts` — typed `USES` constant (categories of key/value items)
- `src/pages/uses.astro` — browser route, renders categories in `TerminalFrame`s
- `src/lib/shortcuts.ts` — pure `resolveChord()` state machine
- `src/islands/keyboard-shortcuts.ts` — DOM wiring + help overlay
- `tests/curl/uses.test.ts` — coverage for `renderUses()`
- `tests/lib/shortcuts.test.ts` — coverage for `resolveChord()`

**Modify**
- `src/lib/nav.ts` — add `/uses` between `/blog` and `/contact`
- `src/curl/render.ts` — export `renderUses(uses: Uses)`
- `src/middleware.ts` — route `/uses` for terminal clients
- `src/layouts/Page.astro` — load shortcuts island, add footer hint
- `tests/lib/nav.test.ts` — update strict-order assertion to include `/uses`

---

## Task 1: USES data module

**Files:**
- Create: `src/data/uses.ts`

- [ ] **Step 1: Write the data module**

```ts
// src/data/uses.ts
//
// Source-of-truth for the /uses page. Both the browser route
// (src/pages/uses.astro) and the curl renderer (renderUses in
// src/curl/render.ts) read from USES.

export interface UsesItem {
  readonly key: string;
  readonly value: string;
}

export interface UsesCategory {
  readonly heading: string;
  readonly items: readonly UsesItem[];
}

export interface Uses {
  readonly categories: readonly UsesCategory[];
}

// Placeholder values — edit before shipping.
export const USES: Uses = {
  categories: [
    {
      heading: 'system',
      items: [
        { key: 'os', value: 'Ubuntu 24.04 (WSL2)' },
        { key: 'kernel', value: '6.6 microsoft-standard' },
        { key: 'wm', value: 'i3' },
        { key: 'terminal', value: 'Windows Terminal' },
      ],
    },
    {
      heading: 'shell & editor',
      items: [
        { key: 'shell', value: 'bash' },
        { key: 'editor', value: 'neovim' },
        { key: 'multiplexer', value: 'tmux' },
      ],
    },
    {
      heading: 'languages',
      items: [
        { key: 'daily', value: 'TypeScript · Python · Rust' },
        { key: 'occasional', value: 'C · Go · Lua' },
      ],
    },
    {
      heading: 'tools',
      items: [
        { key: 'vcs', value: 'git' },
        { key: 'search', value: 'ripgrep · fd' },
        { key: 'browse', value: 'fzf · zoxide' },
      ],
    },
    {
      heading: 'fonts',
      items: [
        { key: 'ui', value: 'Roboto Mono' },
        { key: 'code', value: 'Loskeley Mono' },
      ],
    },
    {
      heading: 'hardware',
      items: [
        { key: 'laptop', value: 'TBD' },
        { key: 'keyboard', value: 'TBD' },
        { key: 'monitor', value: 'TBD' },
      ],
    },
  ],
};
```

- [ ] **Step 2: Type-check**

Run: `npx astro check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/uses.ts
git commit -m "feat(uses): typed USES data module with placeholder content"
```

---

## Task 2: Add /uses to nav and update nav test

**Files:**
- Modify: `src/lib/nav.ts`
- Modify: `tests/lib/nav.test.ts:21-24` (the strict-order assertion)

- [ ] **Step 1: Add `/uses` to NAV_LINKS**

In `src/lib/nav.ts`, replace the existing `NAV_LINKS` declaration:

```ts
export const NAV_LINKS: readonly NavLink[] = [
  { href: '/', label: '~/home' },
  { href: '/projects', label: '~/projects' },
  { href: '/blog', label: '~/blog' },
  { href: '/uses', label: '~/uses' },
  { href: '/contact', label: '~/contact' },
  { href: '/resume', label: '~/resume', terminalOnly: true },
] as const;
```

- [ ] **Step 2: Update the existing strict-order test**

In `tests/lib/nav.test.ts`, update the order assertion:

```ts
  it('contains the expected top-level paths in stable order', () => {
    const hrefs = NAV_LINKS.map(l => l.href);
    expect(hrefs).toEqual(['/', '/projects', '/blog', '/uses', '/contact', '/resume']);
  });
```

- [ ] **Step 3: Run the test**

Run: `npm test -- tests/lib/nav.test.ts`
Expected: PASS.

- [ ] **Step 4: Run the full suite to make sure nothing else broke**

Run: `npm test`
Expected: PASS. The home renderer test uses `toContain`, so `/uses` appearing in the curl nav box does not break it.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav.ts tests/lib/nav.test.ts
git commit -m "feat(uses): add /uses to NAV_LINKS"
```

---

## Task 3: Browser /uses page

**Files:**
- Create: `src/pages/uses.astro`

- [ ] **Step 1: Write the page**

```astro
---
import Page from '../layouts/Page.astro';
import TerminalFrame from '../components/TerminalFrame.astro';
import { USES } from '../data/uses';
---
<Page title="Uses" path="/uses">
  <section class="uses-intro">
    <h1 class="uses-title">~/uses</h1>
    <p class="uses-tagline">the tools, software, and hardware i use day-to-day.</p>
  </section>

  {USES.categories.map(category => (
    <TerminalFrame title={`~/uses/${category.heading}`}>
      <dl class="uses-grid">
        {category.items.map(item => (
          <>
            <dt>{item.key}</dt>
            <dd>{item.value}</dd>
          </>
        ))}
      </dl>
    </TerminalFrame>
  ))}
</Page>

<style>
  .uses-intro {
    padding: 1.5rem 0 1.25rem;
  }

  .uses-title {
    font-family: "Roboto Mono", "JetBrains Mono", "Fira Code", monospace;
    font-size: 1.5rem;
    color: var(--accent);
    margin: 0 0 0.35rem;
    font-weight: 600;
  }

  .uses-tagline {
    font-size: 0.95rem;
    color: var(--fg-muted);
    margin: 0;
  }

  .uses-grid {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.3rem 2rem;
    font-size: 0.9rem;
  }

  .uses-grid dt {
    color: var(--fg-muted);
  }

  .uses-grid dd {
    color: var(--fg);
  }
</style>
```

- [ ] **Step 2: Start dev server in the background**

Run: `npm run dev`
Expected: server up on `http://localhost:4321` (or noted port).

- [ ] **Step 3: Manually verify in a browser**

Open `http://localhost:4321/uses`. Confirm:
- Page renders with the standard header/nav.
- `~/uses` appears in the top-right nav between `~/blog` and `~/contact`.
- Each category shows as a `TerminalFrame` with key/value rows.
- Visiting `/blog` and clicking through other nav items still works.

- [ ] **Step 4: Commit**

```bash
git add src/pages/uses.astro
git commit -m "feat(uses): browser /uses page with TerminalFrame categories"
```

---

## Task 4: renderUses() — TDD

**Files:**
- Create: `tests/curl/uses.test.ts`
- Modify: `src/curl/render.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/curl/uses.test.ts
import { describe, it, expect } from 'vitest';
import { renderUses } from '../../src/curl/render';
import { stripAnsi } from '../../src/curl/ansi';
import type { Uses } from '../../src/data/uses';

const FIXTURE: Uses = {
  categories: [
    {
      heading: 'system',
      items: [
        { key: 'os', value: 'Ubuntu' },
        { key: 'wm', value: 'i3' },
      ],
    },
    {
      heading: 'shell & editor',
      items: [
        { key: 'shell', value: 'bash' },
        { key: 'editor', value: 'neovim' },
      ],
    },
  ],
};

describe('renderUses', () => {
  it('contains ANSI escape codes', () => {
    expect(renderUses(FIXTURE)).toContain('\x1b[');
  });

  it('includes every category heading and every item key/value', () => {
    const out = stripAnsi(renderUses(FIXTURE));
    for (const cat of FIXTURE.categories) {
      expect(out).toContain(cat.heading);
      for (const item of cat.items) {
        expect(out).toContain(item.key);
        expect(out).toContain(item.value);
      }
    }
  });

  it('frames the output with a ~/uses titled box', () => {
    const out = stripAnsi(renderUses(FIXTURE));
    expect(out).toContain('~/uses');
  });

  it('renders each item line as `key: value`', () => {
    const out = stripAnsi(renderUses(FIXTURE));
    expect(out).toMatch(/os\s*:\s*Ubuntu/);
    expect(out).toMatch(/editor\s*:\s*neovim/);
  });
});
```

- [ ] **Step 2: Run the test (must fail because renderUses does not exist)**

Run: `npm test -- tests/curl/uses.test.ts`
Expected: FAIL with import error: `'renderUses'` not exported from `src/curl/render`.

- [ ] **Step 3: Implement renderUses() in src/curl/render.ts**

Add the import and function. Place the import near the existing imports at the top of `src/curl/render.ts`:

```ts
import type { Uses } from '../data/uses';
```

Append (or place after `renderResume`) the function:

```ts
export function renderUses(uses: Uses): string {
  const logoLines = renderLogo().split('\n');

  // Build right-side info lines. Each category produces a dim heading
  // followed by `key: value` rows; categories are separated by a blank line.
  const infoLines: string[] = [];
  for (let i = 0; i < uses.categories.length; i++) {
    const category = uses.categories[i];
    if (i > 0) infoLines.push('');
    infoLines.push(dim(`── ${category.heading} ──`));
    for (const item of category.items) {
      infoLines.push(`${bold(cyan(item.key))}: ${bodyWarm(item.value)}`);
    }
  }

  // Two-column layout: logo on the left, info on the right. Pad the shorter
  // column with empty strings so rows zip cleanly.
  const rowCount = Math.max(logoLines.length, infoLines.length);
  const gap = '  ';
  const logoVisibleWidth = logoLines.reduce(
    (max, line) => Math.max(max, line.replace(/\x1b\[[\d;]*m/g, '').length),
    0,
  );
  const blankLogo = ' '.repeat(logoVisibleWidth);

  const rows: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    const left = logoLines[r] ?? blankLogo;
    const right = infoLines[r] ?? '';
    rows.push(left + gap + right);
  }

  return box(rows, { title: '~/uses' });
}
```

Notes for the implementer:
- `dim`, `bold`, `cyan`, `bodyWarm` are already imported at the top of `render.ts`. Confirm before adding new imports — only `Uses` is new.
- The inline regex strip avoids depending on `stripAnsi` for one local computation. If you'd rather, import `stripAnsi` from `./ansi` instead and call it.

- [ ] **Step 4: Run the test (must pass)**

Run: `npm test -- tests/curl/uses.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/curl/render.ts tests/curl/uses.test.ts
git commit -m "feat(uses): renderUses() neofetch-style curl output"
```

---

## Task 5: Middleware route for /uses

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add the import**

At the top of `src/middleware.ts`, alongside the existing render imports, add `renderUses`:

```ts
import {
  renderHome,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderContact,
  renderProjectPost,
  renderRSS,
  renderResume,
  renderUses,
} from './curl/render';
```

And import the data:

```ts
import { USES } from './data/uses';
```

(Place near the other data imports — `CONTACT_SECTIONS`, `RESUME`.)

- [ ] **Step 2: Add the route branch**

Inside `onRequest`, after the existing `/contact` branch and before `/resume`:

```ts
  if (pathname === '/uses' || pathname === '/uses/') {
    return textResponse(renderUses(USES));
  }
```

- [ ] **Step 3: Verify with curl in a separate shell**

With `npm run dev` running, in another shell:

```bash
curl -A 'curl/8.0' -s http://localhost:4321/uses | head -40
```

Expected: Plain-text neofetch-style output with the SLK logo on the left and key/value lines on the right, framed by `┌── ~/uses ──...┐ ... └─...─┘`.

- [ ] **Step 4: Verify trailing-slash variant**

```bash
curl -A 'curl/8.0' -s http://localhost:4321/uses/ | head -5
```

Expected: same content (200, not the 404 box).

- [ ] **Step 5: Verify browsers still get the HTML page**

```bash
curl -A 'Mozilla/5.0' -s -I http://localhost:4321/uses | head -5
```

Expected: `HTTP/1.1 200`, `content-type: text/html` (not text/plain).

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(uses): route /uses to renderUses for terminal clients"
```

---

## Task 6: Pure shortcut chord resolver — TDD

**Files:**
- Create: `tests/lib/shortcuts.test.ts`
- Create: `src/lib/shortcuts.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/shortcuts.test.ts
import { describe, it, expect } from 'vitest';
import { resolveChord, INITIAL_CHORD_STATE, CHORD_TIMEOUT_MS } from '../../src/lib/shortcuts';

const TIMEOUT = CHORD_TIMEOUT_MS;

describe('resolveChord', () => {
  it('sets leader on first `g`', () => {
    const result = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    expect(result.next.leader).toBe('g');
    expect(result.next.leaderAt).toBe(1000);
    expect(result.action).toEqual({ type: 'none' });
  });

  it('navigates home on `g` then `h` within timeout', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_h = resolveChord(after_g.next, 'h', 1500, TIMEOUT);
    expect(after_h.action).toEqual({ type: 'navigate', href: '/' });
    expect(after_h.next.leader).toBeNull();
  });

  it('navigates to /blog on `g` then `b`', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_b = resolveChord(after_g.next, 'b', 1500, TIMEOUT);
    expect(after_b.action).toEqual({ type: 'navigate', href: '/blog' });
  });

  it('navigates to /projects on `g` then `p`', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_p = resolveChord(after_g.next, 'p', 1500, TIMEOUT);
    expect(after_p.action).toEqual({ type: 'navigate', href: '/projects' });
  });

  it('navigates to /contact on `g` then `c`', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_c = resolveChord(after_g.next, 'c', 1500, TIMEOUT);
    expect(after_c.action).toEqual({ type: 'navigate', href: '/contact' });
  });

  it('navigates to /uses on `g` then `u`', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_u = resolveChord(after_g.next, 'u', 1500, TIMEOUT);
    expect(after_u.action).toEqual({ type: 'navigate', href: '/uses' });
  });

  it('clears leader and emits none on `g` then unmapped key', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_x = resolveChord(after_g.next, 'x', 1500, TIMEOUT);
    expect(after_x.next.leader).toBeNull();
    expect(after_x.action).toEqual({ type: 'none' });
  });

  it('expires the leader if the second key arrives after the timeout', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_h = resolveChord(after_g.next, 'h', 1000 + TIMEOUT + 1, TIMEOUT);
    expect(after_h.action).toEqual({ type: 'none' });
    expect(after_h.next.leader).toBeNull();
  });

  it('toggles help on `?` regardless of leader state', () => {
    const without_leader = resolveChord(INITIAL_CHORD_STATE, '?', 1000, TIMEOUT);
    expect(without_leader.action).toEqual({ type: 'toggle-help' });

    const with_leader = resolveChord({ leader: 'g', leaderAt: 1000 }, '?', 1500, TIMEOUT);
    expect(with_leader.action).toEqual({ type: 'toggle-help' });
    expect(with_leader.next.leader).toBeNull();
  });

  it('closes help on Escape', () => {
    const result = resolveChord(INITIAL_CHORD_STATE, 'Escape', 1000, TIMEOUT);
    expect(result.action).toEqual({ type: 'close-help' });
  });

  it('Escape also clears any pending leader', () => {
    const result = resolveChord({ leader: 'g', leaderAt: 1000 }, 'Escape', 1500, TIMEOUT);
    expect(result.next.leader).toBeNull();
    expect(result.action).toEqual({ type: 'close-help' });
  });

  it('emits none for an unmapped key with no leader', () => {
    const result = resolveChord(INITIAL_CHORD_STATE, 'a', 1000, TIMEOUT);
    expect(result.action).toEqual({ type: 'none' });
    expect(result.next.leader).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test (must fail because module does not exist)**

Run: `npm test -- tests/lib/shortcuts.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement src/lib/shortcuts.ts**

```ts
// src/lib/shortcuts.ts
//
// Pure state machine for the vim-style keyboard shortcut island. Kept
// DOM-free so it's testable in isolation. The island in
// src/islands/keyboard-shortcuts.ts owns the side effects (navigation,
// overlay show/hide, focus restore).

export type ChordLeader = 'g' | null;

export interface ChordState {
  readonly leader: ChordLeader;
  readonly leaderAt: number;
}

export type ChordAction =
  | { type: 'navigate'; href: string }
  | { type: 'toggle-help' }
  | { type: 'close-help' }
  | { type: 'none' };

export interface ChordResult {
  readonly next: ChordState;
  readonly action: ChordAction;
}

export const INITIAL_CHORD_STATE: ChordState = { leader: null, leaderAt: 0 };

export const CHORD_TIMEOUT_MS = 1500;

const G_BINDINGS: Readonly<Record<string, string>> = {
  h: '/',
  p: '/projects',
  b: '/blog',
  c: '/contact',
  u: '/uses',
};

const CLEARED: ChordState = INITIAL_CHORD_STATE;

export function resolveChord(
  state: ChordState,
  key: string,
  now: number,
  timeoutMs: number,
): ChordResult {
  // Special keys take precedence and always clear any pending leader.
  if (key === '?') {
    return { next: CLEARED, action: { type: 'toggle-help' } };
  }
  if (key === 'Escape') {
    return { next: CLEARED, action: { type: 'close-help' } };
  }

  // Treat an expired leader as never having been set.
  const leaderActive = state.leader === 'g' && now - state.leaderAt <= timeoutMs;
  const effective: ChordState = leaderActive ? state : CLEARED;

  if (effective.leader === 'g') {
    const href = G_BINDINGS[key];
    if (href) {
      return { next: CLEARED, action: { type: 'navigate', href } };
    }
    return { next: CLEARED, action: { type: 'none' } };
  }

  if (key === 'g') {
    return { next: { leader: 'g', leaderAt: now }, action: { type: 'none' } };
  }

  return { next: CLEARED, action: { type: 'none' } };
}
```

- [ ] **Step 4: Run the test (must pass)**

Run: `npm test -- tests/lib/shortcuts.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/shortcuts.ts tests/lib/shortcuts.test.ts
git commit -m "feat(shortcuts): pure resolveChord state machine"
```

---

## Task 7: Keyboard shortcuts island

**Files:**
- Create: `src/islands/keyboard-shortcuts.ts`

- [ ] **Step 1: Write the island**

```ts
// src/islands/keyboard-shortcuts.ts
//
// DOM wiring for the vim-style chord shortcuts. The state machine lives in
// src/lib/shortcuts.ts; this file translates DOM events into resolveChord()
// calls and applies the resulting actions (navigate, show/hide overlay).
//
// Listeners are attached once at module load — the document survives Astro
// view transitions, so re-binding on every astro:page-load would leak.

import { navigate } from 'astro:transitions/client';
import {
  resolveChord,
  INITIAL_CHORD_STATE,
  CHORD_TIMEOUT_MS,
  type ChordState,
} from '../lib/shortcuts';

let state: ChordState = INITIAL_CHORD_STATE;
let overlay: HTMLDivElement | null = null;
let lastFocus: Element | null = null;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function buildOverlay(): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'shortcuts-overlay';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'shortcuts-title');
  root.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:1000',
    'display:none',
    'align-items:center',
    'justify-content:center',
    'background:rgba(0,0,0,0.55)',
  ].join(';');

  const card = document.createElement('div');
  card.className = 'shortcuts-card';
  card.style.cssText = [
    'background:var(--bg-surface)',
    'color:var(--fg)',
    'border:1px solid var(--border)',
    'border-radius:6px',
    'padding:1.25rem 1.5rem',
    'min-width:280px',
    'max-width:90vw',
    'font-family:"Roboto Mono","JetBrains Mono","Fira Code",monospace',
    'font-size:0.9rem',
    'box-shadow:0 8px 24px rgba(0,0,0,0.4)',
  ].join(';');
  card.addEventListener('click', e => e.stopPropagation());

  const heading = document.createElement('h2');
  heading.id = 'shortcuts-title';
  heading.textContent = 'keyboard shortcuts';
  heading.style.cssText = [
    'margin:0 0 0.75rem',
    'color:var(--accent)',
    'font-size:1rem',
    'font-weight:600',
  ].join(';');
  card.appendChild(heading);

  const list = document.createElement('dl');
  list.style.cssText = [
    'display:grid',
    'grid-template-columns:max-content 1fr',
    'gap:0.4rem 1.25rem',
    'margin:0',
  ].join(';');

  const rows: ReadonlyArray<readonly [string[], string]> = [
    [['g', 'h'], 'home'],
    [['g', 'p'], 'projects'],
    [['g', 'b'], 'blog'],
    [['g', 'u'], 'uses'],
    [['g', 'c'], 'contact'],
    [['?'], 'toggle this help'],
    [['Esc'], 'close this help'],
  ];

  for (const [keys, label] of rows) {
    const dt = document.createElement('dt');
    dt.style.cssText = 'display:flex;gap:0.25rem;align-items:center;';
    for (const k of keys) {
      const kbd = document.createElement('kbd');
      kbd.textContent = k;
      kbd.style.cssText = [
        'display:inline-block',
        'min-width:1.5em',
        'padding:0.1em 0.45em',
        'border:1px solid var(--border)',
        'border-radius:3px',
        'background:var(--bg)',
        'color:var(--fg)',
        'font-family:inherit',
        'font-size:0.85em',
        'text-align:center',
      ].join(';');
      dt.appendChild(kbd);
    }
    const dd = document.createElement('dd');
    dd.textContent = label;
    dd.style.cssText = 'margin:0;color:var(--fg-muted);align-self:center;';
    list.appendChild(dt);
    list.appendChild(dd);
  }
  card.appendChild(list);

  const hint = document.createElement('p');
  hint.textContent = 'click outside or press esc to close';
  hint.style.cssText = [
    'margin:1rem 0 0',
    'font-size:0.75rem',
    'color:var(--fg-muted)',
    'opacity:0.7',
  ].join(';');
  card.appendChild(hint);

  root.appendChild(card);
  root.addEventListener('click', () => closeOverlay());
  document.body.appendChild(root);
  return root;
}

function ensureOverlay(): HTMLDivElement {
  if (!overlay) overlay = buildOverlay();
  return overlay;
}

function isOverlayOpen(): boolean {
  return !!overlay && overlay.style.display !== 'none';
}

function openOverlay(): void {
  const el = ensureOverlay();
  lastFocus = document.activeElement;
  el.style.display = 'flex';
  // Move focus into the overlay so Tab doesn't escape behind it on first try.
  const card = el.querySelector('.shortcuts-card') as HTMLElement | null;
  card?.setAttribute('tabindex', '-1');
  card?.focus();
}

function closeOverlay(): void {
  if (!overlay) return;
  overlay.style.display = 'none';
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
  lastFocus = null;
}

function applyAction(action: ReturnType<typeof resolveChord>['action'], event: KeyboardEvent): void {
  switch (action.type) {
    case 'navigate':
      event.preventDefault();
      // Don't navigate if the overlay is open — close it first so the user
      // sees their context returning rather than a surprise page swap.
      if (isOverlayOpen()) closeOverlay();
      navigate(action.href);
      return;
    case 'toggle-help':
      event.preventDefault();
      if (isOverlayOpen()) closeOverlay();
      else openOverlay();
      return;
    case 'close-help':
      if (isOverlayOpen()) {
        event.preventDefault();
        closeOverlay();
      }
      return;
    case 'none':
      return;
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isTypingTarget(event.target)) return;

  const result = resolveChord(state, event.key, performance.now(), CHORD_TIMEOUT_MS);
  state = result.next;
  applyAction(result.action, event);
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', onKeydown);
}
```

- [ ] **Step 2: Type-check**

Run: `npx astro check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/islands/keyboard-shortcuts.ts
git commit -m "feat(shortcuts): keyboard island with chord nav and help overlay"
```

---

## Task 8: Wire island into Page layout + add footer hint

**Files:**
- Modify: `src/layouts/Page.astro`

- [ ] **Step 1: Add the script tag and footer hint**

Add a sibling `<script>` line under the existing `palette-toggle` import inside `Page.astro`:

```astro
  <script src="../islands/palette-toggle.ts"></script>
  <script src="../islands/keyboard-shortcuts.ts"></script>
```

In the same file, update the footer to include the hint. Replace the existing `<footer>...</footer>` block:

```astro
    <footer class="page-footer">
      <span class="footer-copy">&copy; Luis Salik &middot; lsalik.dev &middot; no cookies &middot; no analytics &middot; no tracking</span>
      <span class="footer-source">source: <a href="https://github.com/lsalik2/lsalik.dev" class="footer-link" target="_blank" rel="noopener noreferrer">github.com/lsalik2/lsalik.dev</a></span>
      <span class="footer-shortcuts">press <kbd>?</kbd> for keyboard shortcuts</span>
    </footer>
```

Add styles for the `kbd` and the new line at the end of the existing `<style>` block:

```css
  .footer-shortcuts kbd {
    display: inline-block;
    min-width: 1.5em;
    padding: 0 0.4em;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
    color: var(--fg-muted);
    font-family: inherit;
    font-size: 0.75rem;
    text-align: center;
  }
```

- [ ] **Step 2: Manual verification**

With `npm run dev` running, open `http://localhost:4321/`. Confirm:

1. Footer shows three lines, including `press [?] for keyboard shortcuts`.
2. Press `?` — overlay appears, listing every chord.
3. Press `Esc` — overlay closes and focus returns somewhere reasonable.
4. Press `g`, then `b` — navigates to `/blog` via view transition (no full reload, ASCII bg persists).
5. Press `g`, then `p` — navigates to `/projects`.
6. Press `g`, then `u` — navigates to `/uses`.
7. Press `g`, then `c` — navigates to `/contact`.
8. Press `g`, then `h` — navigates to `/`.
9. Press `g`, wait 2 seconds, then `h` — does nothing (timeout).
10. Press `g`, then `x` — does nothing (unmapped).
11. Click into a form field anywhere if possible (or open devtools and `document.designMode='on'` on a paragraph), type `g h` — should NOT navigate.
12. Press `Ctrl+G` — should NOT enter chord mode.
13. Click the backdrop while the overlay is open — overlay closes.
14. Verify the existing palette toggle still works.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Run a production build to catch any SSR-time issues**

Run: `npm run build`
Expected: build succeeds with no warnings about missing exports or untyped imports.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Page.astro
git commit -m "feat(shortcuts): load shortcuts island and add footer hint"
```

---

## Final verification

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: nothing to commit.

- [ ] **Step 2: Review the commit history**

Run: `git log --oneline main..HEAD`
Expected: 8 commits (one per task), no co-author lines.

- [ ] **Step 3: Run the full test suite one more time**

Run: `npm test`
Expected: PASS, no skipped tests.
