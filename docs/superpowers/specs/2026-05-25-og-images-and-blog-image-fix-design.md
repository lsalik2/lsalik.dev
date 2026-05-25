# OG image generation + blog image rendering fix

**Date:** 2026-05-25
**Status:** Approved (pending user review of this written spec)

## Summary

Two changes shipped in one PR:

1. **OG image generation** — per-entry social-preview PNGs for `blog` and `projects` content collections, plus a shared fallback for static pages. Generated at build time via a custom Astro integration, output to `dist/og/<collection>/<slug>.png` as flat static assets.
2. **Blog image rendering fix** — `src/content/blog/hello-world.md:50` references the markdown image via `https://github.com/lsalik2/lsalik.dev/blob/main/public/favicon.svg`, which returns GitHub's HTML repo viewer, not the SVG. Replace with the local `/favicon.svg` reference.

## Motivation

- The site currently emits no `og:*` or `twitter:*` meta tags (`src/layouts/Base.astro:13-32`). Links unfurled in Slack/Discord/Twitter show bare URLs with no preview, no title, no description.
- The "Future plans" section of `README.md` commits to build-time OG image generation specifically (`README.md:84`), citing edge safety. The site already disables Sharp via `passthroughImageService` in `astro.config.mjs:9-11` for the same reason.
- The hello-world post is the project's smoke-test for blog rendering features; a visibly broken image undermines that role.

## Scope

**In scope:**
- Per-entry OG image generation for `blog` (non-draft) and `projects` collections.
- A single committed fallback OG image at `public/og/default.png` for static pages (homepage, `/man`, `/uses`, `/projects`, `/contact`, `/404`).
- `<Seo />` component emitting `og:*` and `twitter:*` meta tags from layout props.
- Setting `site: 'https://lsalik.dev'` in `astro.config.mjs` so absolute URLs work in meta tags.
- Fixing the broken image URL in `hello-world.md`.

**Out of scope:**
- Generating OG images per static page (one shared default is enough).
- Migrating blog markdown to Astro's `astro:assets` image pipeline (deferred; site uses `passthroughImageService`, so optimization payoff is limited).
- Documenting blog-authoring conventions for images (small enough to address in a README tweak later if needed).
- Cache-busting query strings on OG image URLs (revisit if stale crawler caches become a real problem).

## Approach

**Custom Astro integration**, registered in `astro.config.mjs`, hooks into `astro:build:done`. It iterates the `blog` and `projects` collections via `getCollection`, calls a pure `renderOgPng(props)` function for each entry, and writes the resulting PNG to `dist/og/<kind>/<slug>.png`. Vercel packages `dist/` as-is, so the PNGs ship as static assets served by Vercel's static layer — never touched by an edge function.

Why this over alternatives:

- **vs. standalone pre-build npm script writing to `public/og/`:** keeps generated artifacts out of source folders and avoids needing a separate build step in `package.json`.
- **vs. dynamic `/og/[slug].png` route generated at edge:** explicitly fights the README's build-time constraint and the project's stance against Node deps on the edge.

## Architecture

### New files

| Path | Purpose |
|---|---|
| `src/lib/og/template.tsx` | Satori JSX template. Exports `OgTemplate({kind, slug, title, meta})` returning the element tree Satori consumes. Branches titlebar text on `kind`. |
| `src/lib/og/render.ts` | Exports `renderOgPng(props): Promise<Buffer>`. Wires Satori → SVG → resvg → PNG. Loads fonts lazily at first call. |
| `src/lib/og/fonts/` | Build-only directory holding TTF font files needed by Satori (Satori does not accept woff2). Not exposed at runtime. |
| `src/integrations/og-images.ts` | Astro integration. Registers an `astro:build:done` hook that iterates collections and writes PNGs to `dist/og/<kind>/<slug>.png`. |
| `src/components/Seo.astro` | Emits `og:*` and `twitter:*` meta tags from props `{title, description, image, url, type}`. |
| `public/og/default.png` | Committed fallback PNG for pages without per-entry OG images. Generated once via a one-off script using the same template, then checked in. |
| `src/lib/og/render.test.ts` | Vitest unit tests for `renderOgPng`. |
| `src/lib/og/template.test.ts` | Vitest unit tests for `OgTemplate` structure. |
| `tests/og-build.test.ts` | Integration test invoking the generation function against fixture collections in a temp dir. |

### Modified files

| Path | Change |
|---|---|
| `astro.config.mjs` | Register the `og-images` integration. Add `site: 'https://lsalik.dev'`. |
| `src/layouts/Base.astro` | Add `description` and `image` props (image defaults to `/og/default.png`). Render `<Seo />` in `<head>`. |
| `src/layouts/Page.astro` | Forward new props to `Base.astro`. |
| `src/pages/blog/[...slug].astro` | Pass `image={`/og/blog/${post.id}.png`}`, `description={post.data.description}`, `type="article"` to layout. |
| `src/pages/projects/[...slug].astro` | Same as the blog route — pass `image={`/og/projects/${project.id}.png`}`, `description={project.data.description}`, `type="article"`. |
| `src/content/blog/hello-world.md:50` | Replace `https://github.com/lsalik2/lsalik.dev/blob/main/public/favicon.svg` with `/favicon.svg`. |
| `package.json` | Add `satori` and `@resvg/resvg-js` to `devDependencies`. |

## Data flow

### Build time (`npm run build`)

```
astro build
  │
  ├─ Astro builds pages to dist/ as usual
  │
  └─ astro:build:done fires
       │
       └─ og-images integration runs
            │
            ├─ getCollection('blog', e => !e.data.draft)
            ├─ getCollection('projects')
            │
            └─ for each entry:
                 props = {
                   kind: 'blog' | 'project',
                   slug: entry.id,
                   title: entry.data.title,
                   meta: <built from frontmatter, see below>
                 }
                 buf = await renderOgPng(props)
                 writeFile(dist/og/<kind>/<slug>.png, buf)
```

`meta` line content by kind:

- **blog:** `<YYYY-MM-DD> · <tags joined with ', '> · <N> min read`
- **project:** `<status> · <stack joined with ', '>`

`renderOgPng(props)` internals:

1. Build JSX tree via `OgTemplate(props)`.
2. `satori(tree, { width: 1200, height: 630, fonts: [robotoMonoRegular, robotoMonoBold] })` → SVG string.
3. `new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()` → `Buffer`.
4. Return buffer.

Fonts loaded once at module init from `src/lib/og/fonts/RobotoMono-{Regular,Bold}.ttf`.

### Runtime (page request)

```
Browser/crawler requests /blog/<slug>/
  │
  └─ Astro SSR renders the page (Vercel edge)
       │
       └─ Base.astro renders <Seo image="/og/blog/<slug>.png" ...>
            │
            └─ Emits og:* and twitter:* meta tags with absolute URLs
               built from Astro.site + image path.

Crawler then fetches /og/blog/<slug>.png
  │
  └─ Vercel serves the static PNG from dist/og/... — no edge function involved.
```

Tags emitted by `<Seo />`:

- `og:title`, `og:description`, `og:image`, `og:image:width=1200`, `og:image:height=630`, `og:type` (`article` for blog posts and project entries, `website` for static pages), `og:url`, `og:site_name`
- `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`

## Template aesthetic

Matches the site's terminal-frame chrome:

- 1200×630 canvas, `--bg` color from the `dark-terminal` palette.
- Titlebar at top: `── cat ~/<kind>/<slug>.md ──` in muted color, mono font.
- Body: post/project title large (Roboto Mono Bold, ~64px, wraps if long).
- Below title: metadata line in muted color (smaller, ~28px).
- Bottom-right corner: `lsalik.dev` wordmark.

Palette values pulled from `src/styles/global.css` `:root[data-palette="dark-terminal"]` block (not from the runtime CSS — copied into a small constant in `src/lib/og/template.tsx` to keep build-time rendering self-contained).

## Error handling

**Build-time per-entry isolation.** Each `renderOgPng` + `writeFile` is wrapped in try/catch. On failure: log `[og-images] failed: <kind>/<slug>: <message>` and continue. Build still succeeds. Affected pages get a broken-image preview that's loud in build logs — fixable in a follow-up commit.

**Hard-fail on infrastructure errors.** Missing font files or `getCollection` throwing aborts the build. These are environment problems, not content problems.

**No existence-check fallback at SSR.** Pages always emit their post-specific OG URL. A missing PNG (build skipped it, post is newer than the deployed build) shows a broken preview on one page until the next deploy. Acceptable trade-off vs. building/loading a manifest.

**Crawler cache staleness.** Out of scope. Noted for the future: append `?v=<content-hash>` to image URLs if it becomes a problem.

**Image fix has no error handling concerns** — one-line content edit.

## Testing

**Unit (Vitest):**

- `src/lib/og/render.test.ts`:
  - Returns a `Buffer` whose first 8 bytes are the PNG magic header (`89 50 4E 47 0D 0A 1A 0A`).
  - Buffer length > 1 KB (guards against empty/transparent renders).
  - Long titles (200 chars) don't throw.
  - Empty `tags` array doesn't throw.
- `src/lib/og/template.test.ts`:
  - Returned tree contains the title and meta strings.

**Integration:**

- `tests/og-build.test.ts`:
  - One PNG per non-draft blog entry; drafts skipped.
  - Files written to `dist/og/<kind>/<slug>.png` (using a temp dir).
  - A mocked-failing entry doesn't abort the run; others succeed; warning was logged.

**Snapshot tests deliberately omitted.** PNG bytes are sensitive to font/resvg/platform; pixel snapshots would be brittle.

**Manual verification:**

- `npm run build`, open `dist/og/blog/hello-world.png` — looks right.
- Paste a deployed URL into a Slack/Discord channel; preview unfurls correctly.
- `curl -I https://lsalik.dev/og/blog/hello-world.png` returns 200 with `content-type: image/png`.
- View `/blog/hello-world` in a browser — favicon image renders inline (image fix verification).

**Image fix:** no automated test. Change is one line, visually verifiable, and no existing blog-rendering test harness exists to extend cheaply.

## Open items deferred to implementation

- **Font sourcing.** Verified: `public/fonts/roboto-mono/` ships only `.woff2` files (subset variants for Latin, Cyrillic, Greek, etc.). Satori needs TTF/OTF. The implementation plan will fetch the Roboto Mono Regular + Bold TTFs from Google Fonts and commit them to `src/lib/og/fonts/` (build-only, not served).
- **Default OG image generation.** A one-off script run once to produce `public/og/default.png`, then checked in. Implementation plan will decide between a `scripts/generate-default-og.mjs` helper or a `vitest` invocation.
