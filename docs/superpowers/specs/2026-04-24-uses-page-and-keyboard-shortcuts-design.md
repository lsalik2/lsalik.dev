# /uses page + vim-style keyboard shortcuts — design

Date: 2026-04-24
Branch: `feat/uses-page-and-shortcuts`

Two features from the README "Future plans" list, implemented together because they both touch routing/nav and ship cleanly in one round of work.

## Goals

- Add a `/uses` page in both browser and curl renderers, structured so the curl version reads like `neofetch` output.
- Add vim-style chord navigation (`g h`, `g b`, `g p`, `g c`, `g u`) plus a `?` help overlay for browser visitors.

## Non-goals

- No blog search or `/`-to-focus binding (no search target exists yet).
- No new dependencies.
- No changes to existing routes beyond the nav addition and a small footer hint.
- No content authoring help — the user fills `data/uses.ts` with their actual stack.

---

## Feature 1 — `/uses` page

### Data

`src/data/uses.ts`

```ts
export interface UsesItem { key: string; value: string; }
export interface UsesCategory { heading: string; items: UsesItem[]; }
export interface Uses { categories: UsesCategory[]; }
export const USES: Uses = { categories: [ /* seeded with placeholder values */ ] };
```

Seed categories (placeholders — user edits before merge):

- **System** — OS, kernel, WM/DE, terminal emulator
- **Shell & Editor** — shell, editor, multiplexer
- **Languages** — primary languages and runtimes
- **Tools** — daily-driver CLI tools
- **Fonts** — UI/code fonts
- **Hardware** — laptop, keyboard, mouse, monitor

Pattern matches `src/data/contact.ts` and `src/data/resume.ts` (typed module export).

### Browser render

`src/pages/uses.astro`

- Uses existing `Page` layout with `path="/uses"` and `title="Uses"`.
- Each category renders inside a `TerminalFrame` with title `~/uses/<category>`.
- Items render as a `dl.uses-grid` (same `grid-template-columns: max-content 1fr` pattern as `whoami-grid` in `index.astro`) so the visual style is unmistakably the same site.

### Curl render

`src/curl/render.ts` — add `renderUses(uses: Uses): string`.

- Two-column layout, neofetch-style:
  - **Left**: ASCII logo via existing `renderLogo()` from `src/curl/logo.ts`.
  - **Right**: lines like `bold(cyan(key))` + `: ` + `bodyWarm(value)`, one per item; categories separated by a blank line and a dim heading like `── system ──`.
- Composed line-by-line by zipping logo lines with content lines, padding the shorter side with empty strings so columns stay aligned. Width matches the existing `PAGE_WIDTH` from `src/curl/box.ts`.
- Wrap the whole composition in a `box()` titled `~/uses` for consistency with other pages.

### Routing

`src/middleware.ts`

- Add a branch handling `pathname === '/uses' || pathname === '/uses/'` for terminal clients, calling `renderUses(USES)` through `textResponse(...)`.

### Nav

`src/lib/nav.ts`

- Add `{ href: '/uses', label: '~/uses' }` between `~/blog` and `~/contact`. Visible in both `NAV_LINKS` (curl) and `BROWSER_NAV_LINKS` (browser header).

### Tests

`tests/curl/uses.test.ts` — fixture `Uses` value; assert that the rendered string contains every key, every value, and the title `~/uses`. Snapshot the output to lock the layout.

---

## Feature 2 — Vim-style keyboard shortcuts

### Bindings

| Chord | Action |
|-------|--------|
| `g h` | navigate to `/` |
| `g p` | navigate to `/projects` |
| `g b` | navigate to `/blog` |
| `g c` | navigate to `/contact` |
| `g u` | navigate to `/uses` |
| `?` | toggle help overlay |
| `Esc` | close help overlay |

### Pure chord resolver

`src/lib/shortcuts.ts`

```ts
export type ChordState = { leader: 'g' | null; leaderAt: number };
export type ChordAction =
  | { type: 'navigate'; href: string }
  | { type: 'toggle-help' }
  | { type: 'close-help' }
  | { type: 'none' };
export interface ChordResult { next: ChordState; action: ChordAction; }

export function resolveChord(
  state: ChordState,
  key: string,
  now: number,
  timeoutMs: number,
): ChordResult;
```

Pure function — no DOM, no globals. Drives the island's behavior and makes everything testable.

Rules:

- If `state.leader === 'g'` and `now - state.leaderAt > timeoutMs`, treat leader as expired (clear it before processing `key`).
- If leader is set and `key` maps to a route, return `navigate` and clear leader.
- If leader is set and `key` doesn't map, clear leader and return `none`.
- If leader is unset and `key === 'g'`, set leader.
- If `key === '?'`, return `toggle-help`.
- If `key === 'Escape'`, return `close-help`.
- Otherwise return `none`.

### Island

`src/islands/keyboard-shortcuts.ts`

- Listens for `keydown` on `document`, **once** at module load. Handlers are persistent across `astro:page-load` (the document survives view transitions), so we don't double-bind.
- **Input guard**: bail out if any of these are true:
  - `event.target` is `INPUT`, `TEXTAREA`, `SELECT`, or has `isContentEditable`
  - `event.ctrlKey || event.metaKey || event.altKey` (Shift is OK so `?` works)
  - `event.isComposing`
- Maintains `ChordState` in module-local `let` variables; passes them to `resolveChord` and applies the result.
- For `navigate` actions, calls `navigate(href)` from `astro:transitions/client` and `event.preventDefault()`. This cooperates with `ClientRouter` and preserves the persisted `#ascii-bg`.
- For `toggle-help`, lazily builds and shows the overlay (built once, then `display: none`/`display: flex` thereafter).
- For `close-help`, hides the overlay and returns focus to `lastFocus` (saved when opened).

### Help overlay

Built imperatively by the island (no separate `.astro` component — keeps the feature self-contained, like `palette-toggle.ts`).

- Fixed-position centered card, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on a hidden heading.
- Backdrop captures clicks → close.
- Styled with existing CSS variables (`--bg`, `--bg-surface`, `--fg`, `--fg-muted`, `--accent`, `--border`).
- Body lists each chord using `<kbd>` elements, e.g. `<kbd>g</kbd> <kbd>b</kbd> — blog`.
- Close on `Esc`, on backdrop click, and on a small `[x]` button. Focus is trapped only loosely — we just return focus to the previously-focused element.

### Footer hint

`src/layouts/Page.astro` footer adds a third dim line: `press ? for shortcuts`. Discoverable without intruding.

### Loading

`src/layouts/Page.astro` already loads `palette-toggle.ts` via `<script src=...>`. Add a sibling line for `keyboard-shortcuts.ts`. Astro bundles it as a deferred ES module.

### Tests

`tests/lib/shortcuts.test.ts` — drives `resolveChord`:

- `g` then `h` (within window) → `navigate /`
- `g` then `b` → `navigate /blog`
- `g` then `x` → `none`, leader cleared
- `g` then `h` after timeout → leader expired, `h` alone → `none`
- `?` alone → `toggle-help`
- `Escape` → `close-help`
- Modifier-laden combos handled inside the island guard, not the resolver — so the resolver test only covers the state-machine logic.

---

## File list

**Create**

- `src/data/uses.ts`
- `src/pages/uses.astro`
- `src/islands/keyboard-shortcuts.ts`
- `src/lib/shortcuts.ts`
- `tests/curl/uses.test.ts`
- `tests/lib/shortcuts.test.ts`

**Modify**

- `src/lib/nav.ts` — add `/uses` entry
- `src/curl/render.ts` — export `renderUses()`
- `src/middleware.ts` — add `/uses` route, import `renderUses` and `USES`
- `src/layouts/Page.astro` — load shortcuts island, add footer hint

## Build sequence

1. Add `/uses` data + nav entry + browser page; verify in dev.
2. Add `renderUses()` and middleware route; verify with `curl localhost:4321/uses`.
3. Add `tests/curl/uses.test.ts`; ensure `npm test` passes.
4. Add `src/lib/shortcuts.ts` with the resolver and its test.
5. Add `src/islands/keyboard-shortcuts.ts`, wire into `Page.astro`, add footer hint; manually verify in browser.

Each step is an independent commit so history is clean.

## Risks / open questions

- Placeholder content in `data/uses.ts` is genuinely placeholder — the user must edit before this is shipped to production. Flagged in the PR body, not silently glossed over.
- Browser-side `kbd` styling: not currently used anywhere in the site. Will define minimal styles inline in the island's overlay CSS rather than touching `global.css`.
- View-transition navigation: `navigate()` from `astro:transitions/client` is the right entry point with `ClientRouter` mounted. If for some reason a route load fails, the browser falls back to a normal full-page load — acceptable.
