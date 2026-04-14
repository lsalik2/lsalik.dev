---
title: "Six new (small) features"
date: 2026-04-14
tags: [meta, webdev]
description: "New palettes, blog reading times, RSS feed and more."
draft: false
---

I added six features to the website today. Most of these are trivial, taking little to no time and serving mostly as QoL additions to the end-user, search engine crawlers and myself for programming. Nevertheless, I thought they were worth noting down in their individual blog posts.

# Feature 1: sitemap.xml and robots.txt

The two files search engines look for first. `robots.txt` is a static file in `public/` that tells crawlers everything is fair game and points them at the sitemap. `sitemap.xml` is slightly more interesting because the site runs with `output: 'server'`, so I can't rely on a build-time crawl of the file tree.

Instead of pulling in `@astrojs/sitemap`, I wrote a tiny `src/pages/sitemap.xml.ts` endpoint. On every request it:

1. emits the handful of static routes (`/`, `/blog`, `/projects`, `/contact`),
2. calls `getCollection('blog', ({ data }) => !data.draft)` and `getCollection('projects')`,
3. serializes everything into a minimal `<urlset>` with each entry's frontmatter `date` as its `<lastmod>`.

The one gotcha was the middleware: the curl/UA sniffer was intercepting every path and wrapping it in ANSI, which is not what a Googlebot wants when it fetches `/sitemap.xml`. I added an explicit passthrough for `/sitemap.xml` and `/robots.txt` at the top of the middleware so both files go out verbatim, regardless of User-Agent.

# Feature 2: RSS feed (and its curl plain-text version)

Same pattern as the sitemap: a `src/pages/rss.xml.ts` endpoint that reads the blog collection and emits a minimal RSS 2.0 document. No new dependencies; the whole thing is ~40 lines of template string with an `escapeXml` helper. Each item uses the post's `description` as the summary and the `date` as `pubDate`.

For discoverability, `Base.astro` now ships a `<link rel="alternate" type="application/rss+xml" href="/rss.xml" />` in the `<head>`, which is what most feed readers use to autodetect a feed when you paste in `lsalik.dev`. I also added a visible `[rss feed]` link at the top of the blog index and the top of every post, so people can find it without opening devtools.

Because the whole site has a dual rendering mode, I did not want curl users to just get a dump of XML. The middleware has a new branch for `/rss.xml` that serves a plain-text listing when the request comes from a terminal client: date, title, description, and a `curl -L lsalik.dev/blog/<slug>` line for each post, rendered by a new `renderRSS()` in `src/curl/render.ts`. Browsers get real RSS; terminals get something you can actually read in a terminal.

# Feature 3: Blog reading time

A standard 200-words-per-minute estimate, computed at render time rather than stored in frontmatter, so I never have to update it by hand.

The logic is a six-line helper in `src/lib/reading-time.ts`: trim the markdown, split on `/\s+/`, divide by 200, and clamp to at least one minute. I call it from `src/pages/blog/[...slug].astro` and pass the result into the existing `.post-meta` line that already shows the date and tags, giving you `2026-04-14 · meta, webdev · 2 min read`.

The curl renderer gets the same treatment: `renderBlogPost` now takes a `readingMinutes` field and drops it into its dimmed meta line, so `curl lsalik.dev/blog/<slug>` shows the same estimate as the browser.

# Feature 4: Previous/next blog quick links

Obvious, but surprisingly fiddly because of sort direction. Posts are sorted descending by date everywhere on the site, so the lower-indexed post is the newer one. That means `next = posts[idx - 1]` and `prev = posts[idx + 1]`. I kept that mapping consistent in both the browser page and the middleware's curl handler so there's exactly one rule to remember.

On the browser side, the slug page renders a `<nav class="post-nav">` after the prose with two anchors, styled as a flex row with the title truncated if it's too long. In curl output, the same neighbors are appended after a dashed separator as two lines:

```
← prev: <title>  curl -L lsalik.dev/blog/<slug>
→ next: <title>  curl -L lsalik.dev/blog/<slug>
```

`renderBlogPost` now takes optional `prev` and `next` neighbor objects and only emits the footer if at least one exists, so the oldest and newest posts just get whichever side applies.

# Feature 5: Code-block copy buttons

Vanilla DOM, no dependencies. `src/islands/code-copy.ts` listens for `astro:page-load` (Astro's client-router event), queries `.prose pre`, and for each one appends a `<button class="code-copy-btn">copy</button>`. Click handler grabs the `<code>` text, hands it to `navigator.clipboard.writeText`, swaps the label to `copied` for 1.5 seconds, then resets.

A `data-copyReady` flag prevents double-attaching buttons across client-side navigations. Styles live in `src/styles/prose.css`: `.prose pre` becomes `position: relative`, and the button is absolutely positioned in the top-right corner, fading in on hover. On success the button tints green; on failure it shows `error`. The whole island is about 40 lines.

# Feature 6: Three new palette themes

The existing palette system is shaped around a fixed tuple in `src/lib/palettes.ts` and per-theme blocks in `src/styles/palettes.css` setting sixteen CSS custom properties. Adding a theme is three edits:

1. append its name to the `PALETTES` tuple,
2. add a `:root[data-palette="X"] { ... }` block to `palettes.css` with all sixteen variables,
3. add the dot color for the palette toggle in `src/components/PaletteToggle.astro`'s `DOT_COLORS` map.

I picked the canonical hex values from each theme's published spec:

- **solarized** — Ethan Schoonover's classic[^1], dark base (`#002b36`) with the signature blue (`#268bd2`).
- **gruvbox** — the warm retro one, dark background (`#282828`) with yellow accent (`#fabd2f`).
- **nord** — the cold arctic palette, `#2e3440` background with the frost-blue accent (`#88c0d0`).

The palette toggle island already persists the selected theme to `localStorage` and re-applies it before first paint via an inline head script, so the new themes survive reloads and page transitions for free. The only test change was updating the expected `PALETTES` array from five entries to eight.

[^1]: https://ethanschoonover.com/solarized/
