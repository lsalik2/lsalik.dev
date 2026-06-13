---
title: "OG images for every post and project"
date: 2026-05-28
tags: [meta, webdev]
description: "Per-entry OpenGraph PNGs rendered at build time with Satori and resvg, a small Seo component, and a broken image in the very first post."
draft: false
---

The last item I had teed up from the previous post finally landed: every blog entry and project page now ships its own 1200×630 OpenGraph image, generated at build time and dropped under `/og/<kind>/<slug>.png`. Link previews on Discord, iMessage, Slack and the usual feed readers no longer fall back to the favicon; they get a tiny terminal-styled card with the post title and meta line. While I was in the neighborhood I also fixed an embarrassingly broken image in `hello-world.md` that had been quietly 404-ing since April.

# Feature 1: a Satori template that matches the site

The render pipeline is [Satori](https://github.com/vercel/satori) for layout (HTML/CSS-ish tree → SVG) and [@resvg/resvg-js](https://github.com/yisibl/resvg-js) for rasterization (SVG → PNG). Both are pure JS/WASM, which matters because the build also runs on Vercel's edge runtime and I'm already avoiding `sharp` for the same reason ([astro.config.mjs](/blog/curl-overhaul) uses `passthroughImageService` for that exact bundle issue).

The template itself lives in `src/lib/og/template.ts` and is a plain object tree, not JSX — Satori accepts the same shape React produces, and the rest of this codebase has no React in it, so pulling in a JSX runtime just for one build-time template would have been silly. A tiny `el(type, props)` helper keeps the calls readable.

The card is a terminal frame, deliberately mirroring `TerminalFrame.astro`:

```
┌─────────────────────────────────────────────┐
│ ── cat ~/blog/og-image-generation.md ──     │
│                                             │
│                                             │
│  OG images for every post and project       │
│                                             │
│  2026-05-28 · meta, webdev · 2 min read     │
│                                             │
│                                  lsalik.dev │
└─────────────────────────────────────────────┘
```

Project entries get a `cat ~/projects/<slug>/README.md` titlebar and a `<status> · <stack>` meta line instead of `<date> · <tags> · <reading time>`, but the frame, fonts, and footer wordmark are identical. The color values are hard-coded hex pulled directly from the `dark-terminal` palette in `src/styles/palettes.css`; at build time there is no DOM and no `:root` to resolve CSS variables against, so mirroring the palette in the template was simpler than threading the values through.

Fonts are Roboto Mono Regular + Bold, vendored as `.ttf` under `src/lib/og/fonts/` and read once per process with a module-level cache. Satori does not have access to the page's `@font-face` declarations, so the fonts have to be handed to it explicitly. The two weights cover the bold title and the dim meta line; everything else in the template uses the regular weight.

`src/lib/og/render.ts` is fifteen lines once you strip the imports: load fonts → `satori(tree, { width: 1200, height: 630, fonts })` → `new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()`. The buffer comes back ready to write.

# Feature 2: a build-time Astro integration

The renderer is wired in via an Astro integration at `src/integrations/og-images.ts`, hooked into `astro:build:done`. Per-entry generation at request time would be a waste — the inputs change only when a markdown file changes — and emitting PNGs as part of the build means they end up in `dist/og/...` like any other static asset.

The first attempt used `getCollection('blog')` and `getCollection('projects')` inside the hook, which seems like the natural fit. It is not: by the time `astro:build:done` fires, the Vite module runner that resolves the `astro:content` virtual module has already been closed, and the dynamic import throws *"Vite module runner has been closed"* in a way that looks like a content collection failure but is really a lifecycle one. The fix was to drop `astro:content` for this codepath and walk the source tree directly with `fs/promises`:

```ts
const files = await readdir(contentDir, { recursive: true });
for (const file of files) {
  if (!file.endsWith('.md')) continue;
  const raw = await readFile(join(contentDir, file), 'utf-8');
  const { data, body } = parseFrontmatter(raw);
  // ...build OgEntry, push, render later
}
```

`parseFrontmatter` is a regex over `---\n…\n---\n` plus `js-yaml`. `js-yaml` is loaded with `createRequire(import.meta.url)` rather than a dynamic `import()`, for the same Vite-module-runner-is-closed reason: a `require` resolves through Node's CJS loader, which is still alive after Astro tears Vite down.

Slugs that come out of `readdir` are filesystem paths, so they get normalized to `sub/post` form to match Astro's content IDs. They also pass through `isSafeSlug()`, which is one short regex (`/^[a-z0-9][a-z0-9/-]*$/`) plus rejections for `..`, leading slashes, and dotfiles. The output path is `join(outDir, 'og', SUBDIR[kind], slug + '.png')`, and a malicious slug like `../../etc/passwd` would let an entry write outside `dist/`. In practice nothing in this repo would ever produce such a slug, but the integration runs against whatever sits in `src/content/`, and "build-time code that takes content as input" is exactly the kind of thing I do not want to think about twice. Slugs that fail the check are skipped with a warning.

Draft posts are skipped (`opts.skipDraft` is on for the blog directory, off for projects). Failed renders increment a counter and log instead of aborting the build — a single broken frontmatter file should not stop the other thirty PNGs from being emitted.

# Feature 3: a small `Seo` component

`src/components/Seo.astro` takes `{ title, description, image, type }` and emits the obvious meta tags: `<link rel="canonical">`, `<meta name="description">`, the OpenGraph block (`og:title`, `og:description`, `og:image`, `og:image:width`, `og:image:height`, `og:type`, `og:url`, `og:site_name`), and the Twitter card block (`twitter:card="summary_large_image"`, `twitter:title`, `twitter:description`, `twitter:image`). Nothing more.

Both `image` and `canonical` are resolved against `Astro.site` (set to `https://lsalik.dev` in `astro.config.mjs`) via `new URL(...).toString()`. OpenGraph crawlers do not consistently resolve root-relative `og:image` paths, so this needs to be an absolute URL or nothing renders in the preview at all.

`Base.astro` calls `<Seo />` unconditionally with sensible defaults (`image='/og/default.png'`, `type='website'`). The default PNG was generated once with the same Satori template, committed under `public/og/default.png`, and is what `/`, `/blog`, `/uses`, `/man`, `/contact`, etc. all share. The per-entry routes `src/pages/blog/[...slug].astro` and `src/pages/projects/[...slug].astro` override `image` with `/og/blog/${slug}.png` and `/og/projects/${slug}.png` respectively, and set `type='article'` so OpenGraph treats them as articles instead of generic site pages.

# Aside: an image that did not exist

While testing the actual rendering, I went to `/blog/hello-world` to make sure the per-post `og:image` was being picked up correctly, and noticed the inline test image in the post body — `![lsalik.dev logo](...)` — was 404-ing. The URL was `https://github.com/lsalik2/lsalik.dev/blob/main/public/favicon.svg`, which is the GitHub *web view* URL, not the raw asset. It had been wrong since the very first commit; I just never scrolled past the headings to notice.

Two-character fix: replace the GitHub URL with the local `/favicon.svg` that the rest of the site already references. The post now has its image, and the OG image for that post has been correct from the moment the integration shipped.

# Wrap-up

That clears the last "obvious next thing" from the previous post's tail. The README's future-plans list still has a handful of items on it (live GitHub project stats, the `/ssh` easter egg, ASCII background reacting to the cursor), but none of them are as load-bearing as OG images were — the site already worked fine when shared; it just looked anonymous in the preview. With per-entry PNGs in place, that's no longer the case.
