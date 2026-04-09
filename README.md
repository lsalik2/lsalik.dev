# lsalik.dev

Personal portfolio and blog for Luis Salik (SLK). Built with Astro and deployed on Vercel.

The site has two rendering modes baked in: a styled browser UI and a plain-text terminal view. Visiting any route with `curl`, `wget`, or `httpie` returns ANSI-formatted plain text instead of HTML — the same content, different skin.

```
curl lsalik.dev
```

## Tech stack

- **[Astro 6](https://astro.build)** — SSR with `output: 'server'`
- **TypeScript** — all islands and utilities
- **[Vercel](https://vercel.com)** — hosting + edge middleware via `@astrojs/vercel`
- **[Vitest](https://vitest.dev)** — unit/integration tests

No UI framework. No CSS preprocessor. No external component library.

## Project structure

```
src/
  pages/          # Astro page routes
  layouts/        # Page.astro and Base.astro
  components/     # Nav, TerminalFrame, PageHeader, etc.
  islands/        # Client-side TypeScript (ascii-bg, curl-demo, palette-toggle)
  curl/           # Terminal renderer: ansi.ts, render.ts, logo.ts
  lib/            # Shared utilities (ansi-to-dom, palettes)
  data/           # Raw markdown: about.md, resume.md
  content/        # Astro content collections
    blog/         # Blog posts (.md)
    projects/     # Project entries (.md)
  middleware.ts   # UA sniffing + terminal response routing
  content.config.ts  # Zod schemas for content collections
docs/             # Internal notes and review backlog
tests/            # Vitest test suite
```

## Dual-rendering architecture

`src/middleware.ts` checks the `User-Agent` header on every request. Clients matching `curl/`, `wget/`, `httpie/`, `fetch/`, or `libfetch/` receive a `text/plain` response built by `src/curl/render.ts` using ANSI helpers from `src/curl/ansi.ts`. All other clients pass through to the normal Astro SSR pipeline.

The homepage also ships a browser-side curl demo (`src/islands/curl-demo.ts`) that replays the terminal output inline, converting ANSI escape codes to DOM nodes via `src/lib/ansi-to-dom.ts` — no `innerHTML`, no sanitizer needed.

## Content collections

Blog posts live in `src/content/blog/` and project entries in `src/content/projects/`. Both use Zod schemas defined in `src/content.config.ts`. Fields:

**Blog:** `title`, `date`, `tags`, `description`, `draft` (default `false`)

**Projects:** `title`, `date`, `stack`, `status`, `description`, `permissions` (default `drwxr-xr-x`), `url` (optional), `repo` (optional — omit for closed-source projects)

## Getting started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build
```

Requires Node 18+. No environment variables needed for local development.

## Deployment

Deploys automatically via Vercel on push to `main`. The Vercel adapter runs the Astro server as an edge function. Sharp image processing is intentionally disabled (`passthroughImageService`) because it pulls in Node built-ins incompatible with the edge runtime.

## Copying / reuse

Feel free to fork and adapt this for your own site. Attribution is appreciated but not required.
