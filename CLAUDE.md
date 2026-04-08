# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (Vercel adapter)
npm run test         # Run all tests (vitest)
npx vitest run tests/curl/ansi.test.ts  # Run a single test file
```

## Architecture

**Astro 6** personal site with `output: 'server'` and Vercel edge middleware. All pages are server-rendered (no `export const prerender = true`) so that middleware can intercept terminal clients.

### Dual rendering: Browser + Terminal

The site serves two completely different responses based on User-Agent:

- **Browser visitors** get the full Astro HTML/CSS site
- **Terminal clients** (curl, wget, httpie) get plain text with ANSI escape codes

This is handled in `src/middleware.ts`, which checks the User-Agent and routes terminal clients to plain-text renderers in `src/curl/render.ts`. Every page route must have a corresponding terminal handler in the middleware.

### Content Layer (Astro 6)

Content is defined in `src/content.config.ts` using the `glob()` loader pattern (not the legacy `src/content/config.ts`). Collections: `blog` and `projects`, both Markdown in `src/content/{blog,projects}/`. Access entries via `post.id` (not `post.slug`). Render with `render(entry)` from `astro:content`.

Resume lives separately in `src/data/resume.md` (not a collection).

### Client-side Islands (vanilla TS, no framework)

- `src/islands/ascii-bg.ts` — Particle-based ASCII background animation using a brightness field, stamps, and flow simulation. Renders to rows of monospace characters.
- `src/islands/curl-demo.ts` — Homepage curl demo. Types out the command char-by-char, then streams the response line-by-line. Uses `ansiToNodes()` for safe DOM construction (no innerHTML).
- `src/islands/palette-toggle.ts` — Color palette switcher using `data-palette` attribute on `<html>`.

### Curl/Terminal Layer

- `src/curl/ansi.ts` — ANSI escape code helpers (bold, dim, colors)
- `src/curl/logo.ts` — SLK logo using Unicode half-block characters (U+2584/U+2580) with ANSI 256-color codes
- `src/curl/render.ts` — Plain-text renderers for each page type
- `src/lib/ansi-to-dom.ts` — Converts ANSI escape codes to DOM nodes safely (createElement/textContent only, never innerHTML)

### Palette System

CSS custom properties defined in `src/styles/palettes.css`, toggled via `data-palette` attribute. Palette registry in `src/lib/palettes.ts`. Currently: `dark-terminal`, `amber-crt`.

## Key Constraints

- **No innerHTML** — A security hook blocks it. Use `document.createElement()`, `textContent`, and `DocumentFragment` for all DOM construction. The `ansiToNodes()` function in `src/lib/ansi-to-dom.ts` is the safe ANSI-to-DOM converter.
- **No prerender** — All pages must be server-rendered so edge middleware can detect terminal clients. Do not add `export const prerender = true` to any page.
- **Astro 6 APIs** — Use `ClientRouter` (not `ViewTransitions`), `glob()` loader in content config, `post.id` (not `post.slug`).
- **Self-hosted font** — Loskeley Mono (woff2) in `public/fonts/`.
