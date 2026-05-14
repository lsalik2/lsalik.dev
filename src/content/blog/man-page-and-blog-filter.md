---
title: "`man lsalik` and a blog filter"
date: 2026-05-14
tags: [meta, webdev, curl]
description: "A dual-rendered manual page at /man, and a client-side search bar with tag chips on the blog index."
draft: false
---

Two items off the README's "Future plans" list shipped together this week: a manual page at `/man` that renders as a real-looking `man(1)` in both browsers and `curl`, and a client-side search/tag filter for the blog index. They're unrelated in scope but ended up on the same branch.

# Feature 1: `man lsalik`

The page mimics a section-1 Unix manual: `LSALIK(1)` header/footer bars, uppercase section headings (`NAME`, `SYNOPSIS`, `DESCRIPTION`, `ROUTES`, `EXAMPLES`, `SHORTCUTS`, `SEE ALSO`, `AUTHOR`), 7-character indented body text, tagged-paragraph definitions. The content lives in `src/data/man.ts` as a typed `Man` constant — same pattern as `uses.ts` and `contact.ts` — so the browser route and the curl renderer read from one source and can't drift.

```
LSALIK(1)              User Commands              LSALIK(1)

NAME
       lsalik — personal portfolio site, browsable in a
       terminal or a browser.

SYNOPSIS
       curl -L lsalik.dev[/route]
       open  https://lsalik.dev[/route]
```

`src/pages/man.astro` walks the typed structure and emits semantic HTML: `<dl>` for the routes and shortcuts definitions, `<pre>` for the lines blocks, `<p>` for prose. The whole thing sits inside a centered `<article class="man-page">` framed by header/footer bars that span the box width via negative margins, so the rule lines actually wrap the content like a real manpage would in a terminal.

The curl side is `renderMan()` in `src/curl/render.ts`. The three-column header/footer (`LSALIK(1)  User Commands  LSALIK(1)`) is laid out with a small `manBar()` helper that splits the page width into pinned left/right and a centered middle. Body indent is 7 spaces; tagged-paragraph definitions get the term on its own line and the definition wrapped to `contentWidth - 7`. The terminal output follows Mandoc/groff conventions closely enough that on a real terminal it's nearly indistinguishable from native `man` output.

# Feature 2: blog search and tag filter

The blog index now ships a search bar and a clickable row of tag chips. Both filter the post list client-side; there's no server round-trip and no JS framework — it's a 75-line island and a 40-line pure resolver, mirroring the same split the chord-shortcut code uses.

`src/lib/blog-filter.ts` exports one function:

```ts
matchesFilter(
  post: PostMeta,
  query: string,
  activeTags: ReadonlySet<string>,
): boolean
```

Pure, no DOM, no globals. Semantics: if any tags are active, a post passes only when every active tag is also on the post (intersection — clicking `[meta]` and `[security]` shows posts tagged with both, not either). The query, if present, is a case-insensitive substring match against title, description, or any tag. The unit tests just feed it tuples and assert booleans, no JSDOM needed.

`src/islands/blog-filter.ts` is the DOM layer: read each `[data-blog-card]`'s dataset into a `PostMeta`, attach `input` and `click` handlers to the search bar and chips, run `matchesFilter()` on every change, and toggle `el.hidden` accordingly. A `[data-blog-empty]` element shows "no posts match." when the visible count drops to zero. The whole thing re-runs on `astro:page-load` so Astro's view transitions don't strand the listeners on swapped-out nodes.

`BlogCard` stayed structurally the same — it just exposes its title, description, and tags as `data-*` attributes so the filter can read them without re-parsing markdown.

# Wrap-up

Two more items off the future-plans list. The next obvious one is OG image generation per post; that's a meatier change, so probably its own post when it lands.
