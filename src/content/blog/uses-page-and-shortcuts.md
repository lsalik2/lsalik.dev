---
title: "A /uses page and vim-style shortcuts"
date: 2026-05-10
tags: [meta, webdev, curl]
description: "Two items off the future-plans list: a /uses page that doubles as a neofetch when curled, and a tiny chord-driven keyboard navigation island."
draft: false
---

Two features that had been sitting on the README's "Future plans" list for a while and shipped well together: a `/uses` page describing my day-to-day setup, and a vim-style chord shortcut system for jumping between routes. They both touch nav and routing, so it made sense to bundle them into one branch.

# Feature 1: `/uses`

The browser side is unremarkable in the best way — the page reuses the existing `Page` layout and `TerminalFrame` component, drops in a `~/uses` heading, and renders one frame per category with a `dl.uses-grid` (`grid-template-columns: max-content 1fr`, the same pattern the homepage `whoami` block uses). Categories cover system, shell & editor, languages, tools, fonts, and hardware. There is no markdown or content collection behind it: `/uses` is a list of typed key/value pairs, not prose, so it lives in `src/data/uses.ts` next to `contact.ts` and `resume.ts`.

```ts
export interface UsesItem { key: string; value: string; }
export interface UsesCategory { heading: string; items: UsesItem[]; }
export interface Uses { categories: UsesCategory[]; }
export const USES: Uses = { categories: [ /* ... */ ] };
```

Both the browser route and the curl renderer import `USES` from this module, so the two views can never drift.

The fun part is the curl side. `renderUses()` in `src/curl/render.ts` lays the SLK logo on the left and the info on the right, neofetch-style:

```
┌── ~/uses ───────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ▄▀▀  █     █▄▄ ▄▀▄    ── system ──                                        │
│   ▀▀▄  █     █ █ █▀▄    os: Gentoo Desktop 23.0                             │
│   ▄▄▀  █▄▄   █ █ █ █    kernel: 7.0.1 gentoo-kernel                         │
│                         wm: sway                                            │
│                         terminal: kitty                                     │
│                                                                             │
│                         ── shell & editor ──                                │
│                         shell: bash                                         │
│                         editor: neovim                                      │
│                         ...                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

Composition is a straight zip: split the rendered logo on `\n`, walk the category list pushing dim `── heading ──` separators and `bold(cyan(key)): bodyWarm(value)` rows, then pair logo lines with info lines row-by-row. When the info column outruns the logo (it always does), the remaining rows get a left pad of spaces equal to the logo's visible width. Visible width is measured with `visibleWidth()` (the same ANSI-aware helper `box()` uses), so escape sequences never throw the columns off.

Routing-wise the middleware gets one new branch — `pathname === '/uses' || pathname === '/uses/'` for terminal clients goes through `renderUses(USES)` and `textResponse(...)`. The nav module gets a new `~/uses` entry between `~/blog` and `~/contact`, which automatically lights up in both the browser header and the curl page header because both read from the same `NAV_LINKS` tuple.

# Feature 2: vim-style chord shortcuts

The bindings are the obvious set:

| chord | action |
|-------|--------|
| `g h` | go home |
| `g p` | go to projects |
| `g b` | go to blog |
| `g u` | go to uses |
| `g c` | go to contact |
| `?`   | toggle help overlay |
| `Esc` | close help overlay |

The implementation splits cleanly into a pure resolver and a DOM island.

`src/lib/shortcuts.ts` exports `resolveChord(state, key, now, timeoutMs)` — no DOM, no globals, no side effects. State is `{ leader: 'g' | null; leaderAt: number }`. The function returns the next state and an action variant: `navigate`, `toggle-help`, `close-help`, or `none`. `?` and `Escape` always take precedence and clear any pending leader. A `g` leader older than 1500 ms is treated as expired before the new key is processed, so an idle hand on `g` doesn't trap you in chord mode forever. Because the whole thing is pure, the test file just feeds it a sequence of key events and asserts on what comes out — no JSDOM needed.

`src/islands/keyboard-shortcuts.ts` is the side-effect layer. It attaches **one** `keydown` listener on `document` at module load. The document survives Astro view transitions, so re-binding on every `astro:page-load` would leak handlers, hence the once-only attach. The handler runs three guards before consulting the resolver:

- `event.isComposing` — bail during IME composition,
- any of `ctrlKey/metaKey/altKey` — let the browser have its hotkeys,
- `event.target` is `INPUT`/`TEXTAREA`/`SELECT` or `isContentEditable` — don't hijack typing.

If the resolver returns `navigate`, the island calls `navigate(href)` from `astro:transitions/client` so the existing `ClientRouter` handles the transition (and the persisted `#ascii-bg` doesn't reset). For `toggle-help` it lazily builds an overlay the first time it's asked, then flips `display: none`/`flex` thereafter.

The overlay is built imperatively in the island rather than as its own `.astro` component, mirroring how `palette-toggle.ts` keeps its UI self-contained. It's a centered card with `role="dialog"` and `aria-modal="true"`, rendered against a dimmed backdrop, and listing each chord with `<kbd>` elements styled inline with the existing palette variables (`--bg-surface`, `--fg`, `--fg-muted`, `--accent`, `--border`). It closes on `Esc`, on backdrop click, and on a small `×` button in the corner; closing returns focus to whatever was focused when the overlay opened.

Discoverability is one dim line in the page footer: `press ? for keyboard shortcuts`. Enough to find it; not loud enough to nag.

# Wrap-up

Two more items off the future-plans list. The next obvious ones are a `man lsalik` page and OG image generation per post, but those are bigger swings — for now I'm happy with the small QoL pile growing one feature at a time.
