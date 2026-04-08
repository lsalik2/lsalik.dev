# lsalik.dev — Design Spec

## Overview

A dark, monospace-forward personal website that feels like peering into a living terminal session. Built with Astro, deployed on Vercel free tier. Every element should feel like it belongs in a terminal, but with animation and polish only a browser can deliver.

## Tech Stack

- **Framework:** Astro (static output + edge middleware)
- **Hosting:** Vercel free tier
- **Content:** Astro Content Collections with local Markdown files
- **Interactivity:** Vanilla TypeScript islands (no React/Svelte)
- **Styling:** CSS custom properties for palette system, no CSS framework
- **Font:** Loskeley Mono (self-hosted), fallback to JetBrains Mono, Fira Code, monospace

## Project Structure

```
lsalik.dev/
├── src/
│   ├── components/        # Astro components (nav, terminal-frame, palette toggle, etc.)
│   ├── content/
│   │   ├── blog/          # .md files with typed frontmatter
│   │   └── projects/      # .md files with typed frontmatter
│   ├── data/
│   │   └── resume.md      # Resume content
│   ├── islands/
│   │   ├── ascii-bg.ts    # Pretext ASCII background (vanilla TS)
│   │   └── curl-demo.ts   # Curl typing animation (vanilla TS)
│   ├── layouts/
│   │   ├── Base.astro     # HTML shell, font loading, View Transitions
│   │   └── Page.astro     # Wraps content with nav + ASCII bg
│   ├── middleware.ts       # Edge middleware: User-Agent curl detection
│   ├── pages/
│   │   ├── index.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── projects/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── resume.astro
│   │   ├── links.astro
│   │   └── uses.astro      # Optional
│   ├── styles/
│   │   ├── global.css      # CSS variables, base resets
│   │   ├── palettes.css    # Color palette token sets
│   │   └── print.css       # @media print for resume
│   └── curl/
│       ├── render.ts       # Plain-text renderers for each page
│       └── logo.ts         # ASCII logo with ANSI color codes
├── public/
│   ├── fonts/              # Loskeley Mono self-hosted
│   └── resume.pdf          # Pre-generated PDF
├── docs/                   # Existing docs
├── resources/              # Existing references
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Color System & Palette Toggle

Driven entirely by CSS custom properties. A `data-palette` attribute on `<html>` swaps the active token set.

### Dark Terminal (default)

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
```

### Amber-on-Black CRT

```css
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

### Toggle Behavior

- A small Astro component in the nav that cycles through palettes on click
- Sets `document.documentElement.dataset.palette` to the next value
- An in-memory variable tracks the current palette — survives across View Transitions, resets on hard refresh
- Adding future palettes requires only a new CSS block and registering the name in the toggle's palette list

## ASCII Animated Background

Ported from `resources/pretext-demos/variable-typographic-ascii.ts`, adapted for this site. Uses the Monospace x Single Weight variant.

### Architecture

- Vanilla TS island at `src/islands/ascii-bg.ts`
- Renders into a full-viewport `<div>` with `position: fixed; z-index: 0`
- Page content sits above at `z-index: 1` with semi-transparent `--bg` background
- Each row is a `<div>` with `white-space: pre`, characters updated as `textContent` each frame (DOM-based, not canvas)

### Key Behaviors

- Particle-and-attractor brightness field drives ASCII character selection and opacity
- Viewport-reactive: recalculates `COLS` and `ROWS` on resize based on viewport size and font metrics
- Performance guardrails: `requestAnimationFrame` with frame budget check; graceful degradation on slow devices
- Color reads from CSS custom properties (`--fg-muted` at varying alpha), so palette changes apply instantly
- Loaded with `defer` on `Base.astro` — never blocks first paint

## Curl-Friendly Terminal Rendering

### Edge Middleware Detection

- `src/middleware.ts` runs on Vercel's Edge Runtime
- Checks `User-Agent` for terminal clients: `curl`, `wget`, `HTTPie`, `fetch`, `libfetch`
- If matched, routes to the curl rendering pipeline instead of Astro pages

### Rendering Pipeline

- `src/curl/render.ts` exports a function per page type
- Each returns a plain string with ANSI escape codes for color
- Content pulled from the same Markdown sources as browser pages — single source of truth

### Homepage Curl Response

- ASCII logo with ANSI-colored underline bars
- Site title + description
- Navigation as a list of curl-able paths (e.g., `curl lsalik.dev/blog`)
- Source link

### Other Pages

- Blog index: list of posts with title, date, tags
- Individual post: Markdown rendered as plain text with ANSI formatting for headers/bold/links
- Projects: `ls -la` style listing; individual project detail
- Resume: plain-text formatted resume

### Response Headers

- `Content-Type: text/plain; charset=utf-8`
- Appropriate `Cache-Control` headers

## Navigation & Layout

### Shell Prompt Breadcrumb

- Rendered at the top of every page: `guest@lsalik:~$ cd /current/path`
- `guest@lsalik:~$` styled with `--green`, path with `--fg`
- Clickable segments — `~` goes home, path segments navigate to that level
- Blinking cursor at the end via CSS `@keyframes` using `--cursor` color

### Navigation Links

- Below the breadcrumb, styled as shell commands: `ls projects/`, `cat blog/`, `cat resume`, `cat links`
- `--fg-muted` default, `--accent-bright` on hover, `--accent` for current page

### Page Layout

- ASCII background: `z-index: 0`, fixed, full viewport
- Content area: centered, max-width ~720px, `z-index: 1`
- Content has subtle semi-transparent `--bg` background for readability
- View Transitions enabled — page changes feel instant, ASCII background persists without restarting

### Responsive

- Single column at all breakpoints — terminal aesthetic naturally works narrow
- Font size stays consistent
- ASCII background recalculates on resize

## Content Pages

### Blog

**Content Collection schema:**
```ts
{
  title: string,
  date: Date,
  tags: string[],
  description: string,
  draft: boolean  // filtered out in production
}
```

**Index page:** Each post in a terminal-frame:
```
┌── cat ~/blog/building-lsalik-dev.md ──────────────┐
│                                                    │
│  # Building lsalik.dev                             │
│  2026-04-01 · webdev, project, opensource           │
│                                                    │
│  Post description here rendered from Markdown...   │
│                                                    │
└────────────────────────────────────────────────────┘
```

Sorted by date descending. Individual posts wrapped in the same terminal-frame style.

### Projects

**Content Collection schema:**
```ts
{
  title: string,
  date: Date,        // last updated
  stack: string[],
  status: string,    // "Live", "Alpha", "Archived", etc.
  url: string,       // primary link
  repo: string,      // github link
  description: string,
  permissions: string  // the drwxr-xr-x value
}
```

**Index page:** `ls -la` style listing:
```
drwxr-xr-x  slk  2026-03-15  lsalik.dev/
  Terminal-inspired personal website.
  Stack: Astro · TypeScript · Vercel
  Status: Alpha (in development)
  → github.com/lsalik2/lsalik.dev
```

Each entry clickable, leading to detail page with full Markdown body.

### Resume

- Single Markdown file at `src/data/resume.md`
- Rendered inside a terminal-frame
- `@media print` stylesheet strips ASCII background, nav, and color
- "Download PDF" link to `/resume.pdf` in `public/`

### Links

- Simple list of social/contact links styled as terminal output
- e.g., `-> github.com/lsalik2`, `-> twitter.com/...`

## Curl Demo Island

Homepage component that simulates typing `curl lsalik.dev` and streams the response.

### Behavior

1. Terminal-frame container on the homepage with title bar (e.g., `~ — bash — 80x24`)
2. After a short delay, types out: `$ curl lsalik.dev`
3. Brief pause simulating network latency
4. Curl response streams character by character — ASCII logo, title, description, nav links
5. Holds final state once complete

### Implementation

- Vanilla TS island at `src/islands/curl-demo.ts`
- Response content imported from `src/curl/logo.ts` and home renderer — not a real fetch
- Typing speed varies slightly per character for natural feel
- ANSI codes translated to `<span>` elements styled with current palette CSS variables

## Build Priority

1. Core shell: Astro project setup, layouts, navigation, color system, ASCII background
2. Content infrastructure: Content Collections, terminal-frame components, blog + projects pages
3. Curl system: Edge middleware, plain-text renderers, curl demo island
4. Polish pages: Resume, links, uses
5. Final polish: Performance tuning, PDF generation, deploy
