---
title: "Overhauling the curl experience"
date: 2026-04-16
tags: [meta, curl, webdev]
description: "Box-drawing layout, a richer color palette, resume support, and a randomized logo — a full refresh of what you see when you curl lsalik.dev."
draft: false
---

When I built the original curl renderer I kept it deliberately minimal: plain bold/dim, one indent level, a few hardcoded colors. It was readable, but it wasn't much to look at. This overhaul adds a proper box-drawing layout system, a wider 256-color palette, a curl-readable resume, and a randomized logo.

# A box-drawing layout system

The biggest change is `src/curl/box.ts`, a new pure layout module. Before this, everything was freeform text — titles were just `bold(...)`, sections were separated by a blank line, and nothing had visual edges. Now every block of content sits inside a Unicode frame:

```
┌── ~/blog ─────────────────────────────────────────────────────────────────┐
│ Hello, World!                                                    2026-04-09 │
│ First post on lsalik.dev for testing purposes.                             │
│ [meta, webdev]                                                             │
│ curl -L lsalik.dev/blog/hello-world                                        │
└────────────────────────────────────────────────────────────────────────────┘
```

The `box()` function takes a list of pre-styled lines and wraps them. Widths are measured after stripping ANSI — colored text doesn't throw off padding. Long lines get word-wrapped with `wrap()`, which is ANSI-aware too so escape sequences don't straddle line breaks. There's also `twoCol()` for flush-left/flush-right pairs (post titles with dates, job titles with date ranges) and `sectionHeader()` for the `bold + hr` section dividers.

The page width is fixed at 80 columns, which is the terminal-compatibility sweet spot. Boxes nest by adjusting the `width` option down.

# A 256-color palette

The old renderer used classic 8-color ANSI codes (`\x1b[32m`, `\x1b[34m`, etc.) everywhere. Those look fine but they're coarse — the eight standard colors look very different terminal to terminal depending on how the profile is configured.

I replaced them with 256-color SGR codes (`\x1b[38;5;N`) keyed to the ysap.sh reference palette. Five named helpers in `ansi.ts` now cover everything the renderer needs:

- `borderDim` — `38;5;241`, a mid-grey for box borders and horizontal rules
- `titleBright` — `38;5;87`, the bright cyan used for headings and the SLK word
- `bodyWarm` — `38;5;223`, a warm cream for body copy in resume bullets
- `accentMagenta` — `38;5;211`, a soft pink for company names and resume accents
- `accentGreen` — `38;5;120`, a light green for bullet points

Every helper resets only the foreground color (`\x1b[39m`) rather than doing a full reset (`\x1b[0m`), so colored spans can nest without bleeding into each other.

# Resume in curl

`curl lsalik.dev/resume` now renders a full plain-text resume instead of following a redirect to the PDF. The browser path still redirects to the PDF unchanged — the middleware intercepts only terminal-client requests.

The resume data lives in `src/data/resume.ts` as a typed TypeScript object, mirrored from `public/resume.pdf` by hand. The middleware reads the same `RESUME` constant and passes it to `renderResume()`, which assembles work experience (title + company + date range in `twoCol`, bullets in `accentGreen` + `bodyWarm`), education, and skills into boxes under their respective `sectionHeader` sections. The footer points curl users at the PDF:

```
pdf: curl -LO lsalik.dev/resume.pdf
```

# Randomized logo colors

The SLK logo at the top of the homepage used to use fixed colors: green letters, blue bar, amber bar. I swapped those out for a curated 14-color palette of light 256-color hues and now pick three distinct colors per render — one for the whole word, one for each underline bar. The colors are pulled without replacement so the three stripes always read as visually distinct.

The existing tests still pass unchanged: six rows total, 17 visible columns per row, only half-block glyphs in the output, balanced ANSI open/reset codes. The colors are parameters now rather than constants, so they don't show up in structural assertions.

# Everything updated to use the new primitives

The old render functions were doing their own ad-hoc layout — `date + "  " + title + "  " + tags` as a single joined string, section titles as bare `bold(...)`, separators as forty hyphens. Every one of those got rewritten to use `box()`, `twoCol()`, `sectionHeader()`, and `hr()` consistently:

- `renderHome()` — logo + title/description in a titled box, nav links in a separate nav box
- `renderBlogIndex()` / `renderRSS()` — one box per post with `twoCol` header
- `renderBlogPost()` — titled box for the header block, `hr()` before prev/next links
- `renderProjectsIndex()` — one box per project with title + permissions in `twoCol`
- `renderContact()` — one box per section, section heading as box title
- `renderProjectPost()` — titled box for title + meta

The browser-side curl demo on the homepage also benefits: `src/lib/ansi-to-dom.ts` was updated to handle 256-color SGR codes (`\x1b[38;5;N`) alongside the original 8-color ones, so the in-browser preview renders the new palette correctly without needing a real terminal.
