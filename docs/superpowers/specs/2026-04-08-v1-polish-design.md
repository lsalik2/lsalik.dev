# v1 Polish Pass — Design Spec

**Date:** 2026-04-08
**Scope:** All items currently in `docs/TRACKER.md` (3 bugs + 5 feature items) bundled into a single coordinated design.

## 1. Scope & Build Order

This spec covers four groups of work, derived from `TRACKER.md`:

- **A. Curl logo fix** — the SLK logo renders choppy because it only uses `▄` half-blocks.
- **B. Background animation** — empty blotches, micro-stutters every 5–8s, and the animation restarts on every client-side navigation.
- **C. Homepage & nav expansion** — new intro copy, per-page `~/heading` + description, three new nav entries (about, contact, sources), with `/links` renamed to `/contact`.
- **D. Three new color palettes** — distinct from the existing `dark-terminal` and `amber-crt`.

Build order (each chunk independently shippable):

1. Palettes (enables correct colors for logo + new pages)
2. Logo redesign
3. Background animation refactor
4. Background persistence across navigations
5. Nav + new pages + homepage copy

No new npm dependencies. No Astro config changes. No prerender flag changes. No middleware rewrite — only registrations added.

## 2. Curl Logo Redesign

### 2.1 Current problem

`src/curl/logo.ts` uses a grid where every cell is one of `▄`, `▀`, or ` `, but the grid is authored such that almost all cells are `▄`. The result is disconnected letterforms with visible gaps between rows. Compare to `resources/ysap/make-logo`, which pairs `▀`/`▄` deliberately across consecutive rows to produce continuous shapes.

### 2.2 Approach

Design SLK at true pixel resolution (8 px tall, 17 px wide including gaps), then pack each pair of pixel rows into one text row using the standard 2-bit mapping:

| top pixel | bottom pixel | glyph |
|:-:|:-:|:-:|
| 0 | 0 | `' '` |
| 0 | 1 | `▄` |
| 1 | 0 | `▀` |
| 1 | 1 | `█` |

Using 8 pixel rows (even) ensures every text row holds a full pair — no dangling half-row that would break continuity with the colored underline rows.

### 2.3 Letterforms (5w × 8h each)

```
S:        L:        K:
.####     #....     #...#
#....     #....     #..#.
#....     #....     #.#..
.###.     #....     ##...
....#     #....     ##...
....#     #....     #.#..
#...#     #....     #..#.
.###.     #####     #...#
```

Layout: `S` in cols 0–4, gap in col 5, `L` in cols 6–10, gap in col 11, `K` in cols 12–16. Total 17 cols × 8 pixel rows.

### 2.4 Packed output

```
Row 0:  ▄▀▀▀▀ █     █  ▄▀
Row 1:  ▀▄▄▄  █     █▄▀
Row 2:      █ █     █▀▄
Row 3:  ▀▄▄▄▀ █▄▄▄▄ █  ▀▄
Row 4:  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄    ← accent-colored underline
Row 5:  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄    ← amber-colored underline
```

Row 3 contains both the bottom of the letterforms and their lower-half pixels, so it meets the accent bar (row 4) cleanly with no visual gap.

### 2.5 Implementation

- Replace `LOGO_LINES` with a raw pixel bitmap `const BITMAP: string[]` (8 entries of length 17) and a small `packPair(top, bot) → char` helper.
- Underlines remain two explicit post-letter rows, accent then amber.
- `renderLogo(): string` signature is unchanged. Callers (`middleware` via `renderHome`, `curl-demo.ts` island) are not touched.
- Letters are rendered with ANSI `\x1b[32m` (green), underlines with `\x1b[34m` (blue, the "accent") and `\x1b[33m` (amber), reset after each row. The ANSI-to-CSS mapping in `src/lib/ansi-to-dom.ts` already handles these codes.

### 2.6 Tests (`tests/curl/logo.test.ts`)

- `renderLogo()` returns exactly 6 lines.
- After stripping ANSI escape sequences, every character is a member of `' ▀▄█'`.
- ANSI color escape count is balanced by matching `\x1b[0m` resets.
- All 6 stripped rows have identical width (17 chars).

## 3. Background Animation Refactor

### 3.1 Current problems

`src/islands/ascii-bg.ts` simulates 3 layers of 150 particles each, splats a circular brightness stamp into a per-layer `Float32Array` field, decays the field every frame, and for each cell picks the brightest layer's char. Two failure modes:

- **Empty blotches.** Where no particle has visited recently, the field decays to near-zero and the ramp maps it to `' '`. Over large regions this leaves dead patches.
- **Micro-stutters every 5–8s.** Consistent with minor GC pauses. The per-frame `els[r].textContent = layerChars[li][r].join('')` pattern creates ~135 short-lived strings per frame at ~60fps.

### 3.2 New approach: per-cell flow field

Abandon particles and stamps. For each cell `(c, r)` at time `t`, directly sample three flow-field values — one per color layer — and keep the brightest per cell.

```ts
function sample(x: number, y: number, t: number, phase: number): number {
  const s1 = Math.sin(x * 0.08 + t * 0.6 + phase);
  const s2 = Math.sin(y * 0.11 - t * 0.4 + phase * 1.3);
  const s3 = Math.sin((x + y) * 0.06 + t * 0.5);
  const s4 = Math.sin((x - y) * 0.09 - t * 0.3 + phase * 0.7);
  return (s1 + s2 + s3 + s4) * 0.25 + 0.5;  // → [0, 1]
}
```

Three layers use phases `0`, `3.7`, and `7.2` to decorrelate their fields.

This guarantees full-screen coverage (no blotches possible) and has no GC-eligible per-frame allocations.

### 3.3 DOM model change

Instead of `rows` × `layers` divs with per-row `textContent` writes, use **one `<pre>` element per layer**, and update each layer's `textContent` exactly once per frame.

String assembly per layer per frame:

- Pre-allocated reusable `Uint16Array` of length `cols * rows + rows` (extra for `\n` separators).
- Fill the typed array by sampling each cell and mapping to a char code via the existing `RAMP`.
- Convert to string via `String.fromCharCode.apply(null, buffer)` — one string alloc per layer per frame (3 total, vs. current ~135).

### 3.4 File layout

`src/islands/ascii-bg.ts` is rewritten. Pure, exported functions for testability:

- `sample(x, y, t, phase): number`
- `charForBrightness(b): string` (reuses existing `RAMP`)
- `renderLayers(cols, rows, t, phases): { layers: string[] }`

The DOM wiring (element creation, resize, RAF loop, persistence guard) stays in the same file but is thin.

### 3.5 Tuning knobs (constants at top of file)

- `FONT_SIZE`, `LINE_HEIGHT`
- `LAYER_PHASES: [0, 3.7, 7.2]`
- `LAYER_COLORS: ['var(--fg)', 'var(--fg-muted)', 'var(--accent)']`
- Noise scales and time scale inside `sample`
- Container opacity (currently `0.3` in `Base.astro`)

### 3.6 Tests (`tests/islands/ascii-bg.test.ts`)

- `sample(x, y, t, phase)` returns values in `[0, 1]` for a grid of inputs.
- `charForBrightness(0)` is `' '`, `charForBrightness(0.9999)` is the last ramp char.
- `renderLayers(10, 5, 1.0, [0, 3.7, 7.2])` returns 3 layer strings of identical length and deterministic content (snapshot).

## 4. Background Animation Persistence

### 4.1 Goal

Animation keeps running across Astro's client-side navigations. Restarts only on a full page reload.

### 4.2 Mechanism

1. **`transition:persist="ascii-bg"`** on the `#ascii-bg` element in `src/layouts/Base.astro`. Astro reuses the same DOM node across navigations instead of swapping it.
2. **Idempotent init** in the rewritten `ascii-bg.ts`. A module-scoped `let started = false` flag guards `start()`. The `astro:page-load` listener only calls `start()` when `!started`. Full reload re-evaluates the module, which resets `started`, so reload still restarts the animation.
3. **Single resize listener.** Installed once at module load, not re-installed on re-init. Prevents leaks across phantom re-inits.

No changes to middleware or any individual page. One attribute change in `Base.astro` plus the guard pattern in the rewritten island.

## 5. New Color Palettes

Add three palettes alongside `dark-terminal` and `amber-crt` in `src/styles/palettes.css`, register them in `src/lib/palettes.ts`, and update `src/islands/palette-toggle.ts` to cycle through all five.

### 5.1 `green-phosphor`

Classic VT220 monochrome:

```css
:root[data-palette="green-phosphor"] {
  --bg:            #000800;
  --bg-surface:    #001400;
  --fg:            #33ff66;
  --fg-muted:      #1a9933;
  --accent:        #66ff99;
  --accent-bright: #99ffbb;
  --green:         #33ff66;
  --amber:         #ccff66;
  --border:        #003300;
  --cursor:        #66ff99;
}
```

### 5.2 `synthwave`

Magenta / cyan on deep indigo:

```css
:root[data-palette="synthwave"] {
  --bg:            #1a0933;
  --bg-surface:    #2b1155;
  --fg:            #f9f8ff;
  --fg-muted:      #9d7dbe;
  --accent:        #ff2a6d;
  --accent-bright: #ff5b8c;
  --green:         #05d9e8;
  --amber:         #f7b32b;
  --border:        #5e3c8a;
  --cursor:        #ff2a6d;
}
```

### 5.3 `paper`

Warm off-white light mode. Also improves the printable resume page.

```css
:root[data-palette="paper"] {
  --bg:            #f7f3eb;
  --bg-surface:    #ece4d0;
  --fg:            #2b2a28;
  --fg-muted:      #6b6a66;
  --accent:        #1b5e9e;
  --accent-bright: #134a7f;
  --green:         #2a6b36;
  --amber:         #8a5a00;
  --border:        #c9bfa9;
  --cursor:        #2b2a28;
}
```

### 5.4 Palette-scoped `--ansi-*` overrides

Currently `--ansi-green`, `--ansi-amber`, `--ansi-blue`, etc. are only declared as fallback defaults inside per-page style blocks. That means the curl demo's streamed logo uses the same hardcoded greens/blues regardless of active palette — and in `paper` mode the defaults don't contrast with the cream background.

Fix: move the `--ansi-*` declarations into `src/styles/palettes.css`, one set per palette. Each palette picks ANSI colors that read well against its `--bg`. The ANSI classes in `src/lib/ansi-to-dom.ts` and `src/pages/index.astro` already reference these vars, so nothing else has to change.

### 5.5 Tests (`tests/lib/palettes.test.ts`)

- Registry exports exactly 5 palettes with stable IDs.
- Each registered palette has a non-empty display label.
- Toggle cycle order is deterministic (starts at `dark-terminal`, wraps).

## 6. Homepage, Navigation, and New Pages

### 6.1 Nav structure

Final order: `about · projects · blog · resume · contact · sources`.

`src/components/Nav.astro` replaces the current 4-entry `navLinks` array with the 6-entry list above.

### 6.2 Page file changes

| Route | File | Content source |
|---|---|---|
| `/about` | `src/pages/about.astro` *(new)* | `src/data/about.md` *(new, placeholder bio)* |
| `/contact` | `src/pages/contact.astro` *(renamed from `links.astro`)* | existing link list in the page file, no data changes — only the page header label (`~/links` → `~/contact`) and the route path change |
| `/sources` | `src/pages/sources.astro` *(new)* | `src/data/sources.md` *(new, inspirations + site source link)* |

`src/pages/links.astro` is deleted in the same commit as the rename.

**Markdown loading pattern.** `src/pages/resume.astro` already uses `await import('../data/resume.md')` to get an Astro-rendered markdown component. New pages `about.astro` and `sources.astro` follow the same pattern for their respective data files. For the curl (middleware) side, raw text is needed instead of a rendered component, so middleware imports the raw markdown via Vite's raw query: `import aboutRaw from '../data/about.md?raw'` (and same for sources). This keeps middleware synchronous at the content layer and avoids a content-collection schema for what is just prose.

### 6.3 Shared `PageHeader` component

Add `src/components/PageHeader.astro`:

```astro
---
interface Props {
  heading: string;      // e.g. "~/projects"
  description: string;  // e.g. "ls -la ~/projects — things I've built."
}
const { heading, description } = Astro.props;
---
<header class="page-heading">
  <h1>{heading}</h1>
  <p>{description}</p>
</header>
```

Styled with `--fg` for the heading and `--fg-muted` for the description. Every page (`about`, `projects`, `blog`, `resume`, `contact`, `sources`) renders this above its existing content.

### 6.4 Homepage hero copy (`src/pages/index.astro`)

Under the existing `h1` + tagline, add two muted `<p>` lines using terminal-flavored placeholder copy:

```
lsalik.dev
A terminal-inspired personal website.
$ whoami — a corner of the internet for my notes, projects, and writing.
$ tip — you can also `curl lsalik.dev` from any terminal and read the site in plaintext.
```

### 6.5 Placeholder descriptions per page

All copy is placeholder and editable in-place later:

- `~/about` — `cat about.md — who I am, what I build, what I'm into.`
- `~/projects` — `ls -la ~/projects — things I've built, public and otherwise.`
- `~/blog` — `cd ~/blog — essays, notes, and the occasional rant.`
- `~/resume` — `less ~/resume — CV. download the PDF if you need a paper copy.`
- `~/contact` — `cat ~/contact — how to reach me, socials included.`
- `~/sources` — `cat ~/sources — sites that inspired this one, plus the site's own source.`

### 6.6 Middleware updates (`src/middleware.ts`)

- Before the terminal-client check: return a `308 Permanent Redirect` from `/links` (with or without trailing slash) to `/contact`. Applies to both browser and curl traffic.
- Rename the `/links` handler to `/contact` and import `renderContact` (the renamed `renderLinks`).
- Add `/about` handler: uses the static `?raw` import of `src/data/about.md` (see 6.2), renders via new `renderAbout(rawMarkdown)`.
- Add `/sources` handler: same pattern for `src/data/sources.md` via `renderSources(rawMarkdown)`.
- Update `renderHome()`'s `nav` list in `src/curl/render.ts` to include all 6 paths (this is a `render.ts` change; listed here only because it is co-released with the middleware registrations).

### 6.7 `src/curl/render.ts` updates

- Rename `renderLinks` → `renderContact` (function + export). Update the middleware import.
- Add `renderAbout(content: string): string` — terminal-frame wrapper with `~/about` heading and the markdown body.
- Add `renderSources(content: string): string` — same pattern with `~/sources` heading.

### 6.8 Tests (`tests/curl/render.test.ts`)

- `renderHome()` output contains all 6 nav paths (`/about`, `/projects`, `/blog`, `/resume`, `/contact`, `/sources`).
- `renderContact(links)` contains the `~/contact` heading.
- `renderAbout('hi')` contains the `~/about` heading and `'hi'` body.
- `renderSources('hi')` contains the `~/sources` heading and `'hi'` body.

## 7. Test Plan Summary

New test files:

- `tests/curl/logo.test.ts`
- `tests/islands/ascii-bg.test.ts`
- `tests/lib/palettes.test.ts`
- `tests/curl/render.test.ts`

Existing `tests/curl/ansi.test.ts` is unchanged.

## 8. Manual Verification (pre-merge)

**Browser:**
- Each of the 5 palettes renders the logo, background, and all 6 pages without visual breakage.
- The background animation persists unchanged while navigating between all 6 pages, and only restarts on full reload.
- The homepage curl demo streams the new logo cleanly in every palette.
- The palette toggle cycles through all 5 palettes in stable order.

**Terminal:**
- `curl -s localhost:4321/` returns the new logo without gaps, the updated 6-path nav, and the updated tagline copy.
- `curl -s localhost:4321/{about,projects,blog,resume,contact,sources}` each return the correct heading.
- `curl -s -i localhost:4321/links` returns `308` with `Location: /contact`.
- `npm run test` is green.

## 9. Out of Scope

- Resume curl output remains the current stub (`Visit lsalik.dev/resume...`); actual markdown rendering of the resume over curl is not in this spec.
- No changes to blog or project content schemas.
- No changes to print stylesheet for the new `paper` palette beyond whatever naturally follows from using the palette variables the print.css already references.
- No new animations or interactive components on `/about`, `/contact`, or `/sources` beyond the static content and `PageHeader`.
