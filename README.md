# lsalik.dev

My personal portfolio website, with some decent blog functionality. Built with Astro and deployed on Vercel.

The site has two rendering modes baked in: a styled browser UI and a plain-text terminal view. Visiting any route with `curl`, `wget`, or `httpie` returns ANSI-formatted plain text instead of HTML. Still the same content, just a different skin.

```
curl lsalik.dev
```

## Tech stack

- **[Astro 6](https://astro.build)**: SSR with `output: 'server'`
- **TypeScript**: all islands and utilities
- **[Vercel](https://vercel.com)**: hosting + edge middleware via `@astrojs/vercel`
- **[Vitest](https://vitest.dev)**: unit/integration tests

No UI framework, CSS preprocessor or external component library.

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

The homepage also ships a browser-side curl demo (`src/islands/curl-demo.ts`) that replays the terminal output inline, converting ANSI escape codes to DOM nodes via `src/lib/ansi-to-dom.ts`. No `innerHTML` and no sanitizer needed.

## Content collections

Blog posts live in `src/content/blog/` and project entries in `src/content/projects/`. Both use Zod schemas defined in `src/content.config.ts`. Fields:

**Blog:** `title`, `date`, `tags`, `description`, `draft` (default `false`)

**Projects:** `title`, `date`, `stack`, `status`, `description`, `permissions` (default `drwxr-xr-x`), `url` (optional), `repo` (optional)

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

## Future plans

Here's some future additions I plan to add:
- curl rendering improvements: curl outputs are raw markdown. eventually planning to beautify this.
- improve contact links: thinking of maybe swapping the link/label positioning or something of the sort
- blog pagination: will add this once i have too many blogs, same with projects
- animation switcher: allows for users to switch to different animation presets
- add logo/images: specifically on the top corners of page-main
- blog searching/filtering: no way to look for specific titles or tags in blogs
- rss/atom feed: plus a plain-text version for terminal clients
- curl lsalik.dev/ssh easter egg: not sure what the easter egg should be, maybe some ascii art of my cats?
- curl lsalik.dev/resume rendered as a nicely boxed ANSI CV
- blog reading time: estimate in frontmatter
- previous/next at bottom of blog posts: self-explanatory
- blog code-block copy buttons: self-explanatory
- live projects github stats: stars, last commit, etc.
- more palette themese cause why not (solarized, gruvbox, nord)
- keyboard shortcuts: g h, g b, / to focus search (vim-style)
- man lsalik page: fake manpage layout
- ASCII background reacting subtly to cursor/scroll: self-explanatory
- OG image generation per post: Satori or similar, build-time so edge-safe
- sitemap.xml + robots.txt cause I forgot
- /uses page: structure it as faux neofetch output when curled: OS, shell, editor, WM, terminal, font, etc.

## Copying / reuse

Feel free to fork and adapt this for your own site. Attribution is appreciated but not required.

## References

**ysap.sh**: inspired the overall terminal vibe of the website, as well as the dual curl functionality and logo that shows up when curling the home page.

**pretext library demos**: specifically the variable typographic ASCII demo, inspired the ASCII art background animation of the website.
