# lsalik.dev

My personal portfolio website, with some decent blog functionality. Built with Astro and deployed on Vercel.

The site has two rendering modes baked in: a styled browser UI and a plain-text terminal view. Visiting any route with `curl`, `wget`, or `httpie` returns ANSI-formatted plain text instead of HTML. Still the same content, just a different skin.

```
curl -L lsalik.dev
```

## Features

**In the browser**

- **Animated ASCII background:** a per-cell flow field with six patterns (drift, cascade, pulse, ripple, vortex, interference). One is picked at random on each page load. It brightens under the cursor and drifts as you scroll.
- **Screensaver mode** at `/screensaver` (press `g s`, or tap the dim `░` at the end of the footer). It runs only the background, full screen, with:
  - a settings panel for pattern, speed, cell size, brightness, colours (any palette or custom) and colour animation (hue, gradient, rainbow);
  - a clock (big block digits, minimal, or date);
  - settings saved per browser and shareable via **copy url**;
  - a panel and cursor that auto-hide;
  - a screen wake lock, OLED burn-in drift for the clock, and fullscreen. On iPhone, where Safari can't fullscreen a page, it offers an add-to-home-screen hint instead.
- **8 colour palettes:** dark terminal, amber CRT, green phosphor, synthwave, mocha, solarized, gruvbox, nord. The choice is remembered and applied before first paint.
- **Vim-style keyboard shortcuts:** `g h` / `g p` / `g b` / `g u` / `g c` jump to home, projects, blog, uses and contact, and `g s` opens the screensaver. `?` toggles the help overlay.
- **Blog:**
  - search and tag filtering (tags intersect);
  - client-side pagination that pages the *filtered* results, with `?page=N` deep links;
  - reading times and copy buttons on code blocks;
  - an RSS feed (`/rss.xml`) and per-post OpenGraph images.
- **Projects:** pagination, and live GitHub stars plus last-push recency, fetched at build time.
- **`/uses`** (tools and setup), **`/man`** (a man page for the site itself), **`/contact`**, and a terminal-styled 404.
- **A braille CLI spinner** in the prompt (`⠋ lsalik@dev:~/blog$`), pure CSS. It holds still under reduced motion.
- Client-side navigation via Astro's `ClientRouter`, with the background persisted across pages.

**In the terminal** (`curl -L lsalik.dev/<route>`)

- **Routes:** `/`, `/projects`, `/projects/<slug>`, `/blog`, `/blog/<slug>`, `/rss`, `/uses`, `/contact`, `/resume`, `/man`. Unknown routes get a terminal 404 with navigation hints.
- **A logo generated per request:** a random, mirrored, identicon-style pixel mark drawn in half-block characters, in random colours. No two curls look the same.
- **`/ssh`:** a hidden easter egg. It's a fake SSH login whose message of the day introduces the site's maintainers (two cats).
- **`/screensaver`:** points you to the browser version.
- **`/resume`:** in the terminal it renders as text; in a browser it redirects to the PDF.

## Tech stack

- **[Astro 7](https://astro.build)**: SSR with `output: 'server'`
- **TypeScript**: all islands and utilities
- **[Vercel](https://vercel.com)**: hosting via `@astrojs/vercel`; the site runs as a Node.js serverless function
- **[Vitest](https://vitest.dev)**: unit tests
- **Build-time only:** [satori](https://github.com/vercel/satori) + [resvg](https://github.com/yisibl/resvg-js) for OpenGraph images, and `js-yaml` for reading front matter in integrations

No UI framework, CSS preprocessor or external component library.

## Project structure

```
src/
  pages/            # Astro page routes (incl. screensaver, rss.xml, sitemap.xml)
  layouts/          # Base.astro (head, CSP-safe scripts, background) and Page.astro (header/nav/footer)
  components/       # Breadcrumb, NavLinks, BlogCard, Pager, TerminalFrame, Seo, etc.
  islands/          # Client-side TypeScript: ascii-bg (background engine), blog-filter, pager,
                    #   keyboard-shortcuts, palette-toggle, curl-demo, code-copy
    screensaver/    # Screensaver page modules: colour, clock, panel, power (fullscreen/wake lock)
  curl/             # Terminal renderer: ansi, box layout, markdown, per-request logo, render
  lib/              # Pure, unit-tested logic: pagination, shortcuts, palettes, github-stats,
                    #   screensaver settings, colour maths, clock, security headers, og/
  integrations/     # Build-time Astro integrations: og-images, github-stats
  data/             # Typed data: contact, resume, uses, man page, github-stats.json cache
  content/          # Astro content collections
    blog/           # Blog posts (.md)
    projects/       # Project entries (.md)
  styles/           # Global CSS, palettes, prose, print
  middleware.ts     # UA sniffing, terminal routing, security headers + per-response CSP
  content.config.ts # Zod schemas for content collections
public/             # Static assets: fonts, favicon, resume PDF, screensaver manifest + icons
scripts/            # check-function.mjs, generate-default-og.mjs
tests/              # Vitest test suite
```

## Dual-rendering architecture

`src/middleware.ts` checks the `User-Agent` header on every request. Clients matching `curl/`, `wget/`, `httpie/`, `fetch/` or `libfetch/` receive a `text/plain` response built by `src/curl/render.ts`, using the ANSI helpers in `src/curl/ansi.ts` and the box layout in `src/curl/box.ts`. All other clients pass through to the normal Astro SSR pipeline. Every browser route has a terminal equivalent, and the two share their data (content collections, `src/data/`) so they never drift apart.

The homepage also ships a browser-side curl demo (`src/islands/curl-demo.ts`) that replays the terminal output inline. It converts ANSI escape codes to DOM nodes via `src/lib/ansi-to-dom.ts`, so there's no `innerHTML` and no sanitizer needed.

## The background engine

`src/islands/ascii-bg.ts` exposes `createAsciiEngine(container, options)`. Each pattern is a `field(x, y, t, phase, grid) → brightness` function. Three phase-shifted layers are rendered per frame, and the brightest wins each cell before it's mapped to a glyph ramp. The site background and the screensaver each run their own engine instance. The time step is capped per frame, so a long-hidden tab resumes smoothly instead of fast-forwarding, and the cell size is raised on very large screens to stay under 60k cells per layer.

## Content collections

Blog posts live in `src/content/blog/` and project entries in `src/content/projects/`. Both use Zod schemas defined in `src/content.config.ts`. Fields:

**Blog:** `title`, `date`, `tags`, `description`, `draft` (default `false`)

**Projects:** `title`, `date`, `endDate` (optional), `stack`, `status`, `description`, `permissions` (default `drwxr-xr-x`), `url` (optional), `repo` (optional; GitHub repos get stars and last-push info)

## Build-time integrations

- **`og-images`:** renders a 1200×630 PNG per blog post and project at `/og/<collection>/<slug>.png` with satori and resvg, styled like a terminal window.
- **`github-stats`:** fetches stars and last-push time for every project with a GitHub `repo` and writes them to the committed cache `src/data/github-stats.json`. Failures keep the last-known values, and the build never fails because of GitHub. Set `GITHUB_TOKEN` to raise the rate limit and include private repos.

## Security

The middleware adds security headers to every response (HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Vary: User-Agent`). It also builds a **per-response Content Security Policy**: the SHA-256 of every inline `<script>` in the HTML is hashed into `script-src`, so Astro's inlined scripts run without `'unsafe-inline'`. Pages that differ by user agent are served `no-store`, so a cache can never hand a browser terminal text or the reverse.

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

# Boot the built Vercel function in isolation and request the key routes
# (catches deploy-only breakage that the dev server and build can't see)
npm run check:function
```

Requires Node 22.12+. No environment variables are needed for local development (`GITHUB_TOKEN` is optional; see above).

With Astro 7, `astro dev` may run as a background process: use `npx astro dev stop`, `npx astro dev status` and `npx astro dev logs`. Running `npm run build` while the dev server is up invalidates its Vite cache, so restart the dev server afterwards.

## Deployment

Deploys automatically via Vercel on push to `main`. The Vercel adapter packages the Astro server as a single Node.js serverless function (`.vercel/output/functions/_render.func`). Run `npm run check:function` after a build to boot that function exactly as packaged before shipping dependency or adapter changes. Sharp-based image optimization is disabled (`passthroughImageService`): the site does no server-side image processing, and this keeps native image libraries out of the function.

## Copying / reuse

Feel free to fork and adapt this for your own site. Attribution is appreciated but not required.

## References

**ysap.sh**: inspired the overall terminal vibe of the website, as well as the dual curl functionality and logo that shows up when curling the home page.

**pretext library demos**: specifically the variable typographic ASCII demo, inspired the ASCII art background animation of the website.
