---
title: "A screensaver, an /ssh easter egg, and the rest of the roadmap"
date: 2026-10-09
tags: [meta, webdev]
description: "Pagination, a curl-only /ssh login with the cats, a new logo on every curl, three new background patterns, a braille spinner in the prompt, a CSP bug on 404s, and a full-screen screensaver mode."
draft: false
---

The last two writeups were both from June 13th, and they each ended by ticking a line off the old README roadmap. This one closes out the rest of that list in one go, and then adds something that was never on it: a screensaver. It's a roundup, so it's organised by feature rather than told as one story.

# Pagination that respects the filter

The first roadmap line was "blog pagination: will add this once i have too many blogs, same with projects". Nine posts isn't exactly *too many*, but the pager is easier to build before the list gets long than after.

The catch was the blog's search box and tag chips. They're a client-side island that hides non-matching cards, and server-side pagination would have broken them: search would only ever see the current page. So pagination is client-side too. The server still renders every post, and a small pager shows five at a time. The key detail is *what* gets paged: the filter hands the pager only the cards that currently match, so pages are always slices of the filtered results, and any change to the search or tags jumps back to page 1.

The page lives in the URL as `?page=2`, written with `history.replaceState`, so a refresh or a shared link lands where you were. Two details worth noting:

- **`history.state` gets passed through**, not nulled. Astro's ClientRouter keeps its own bookkeeping in there, and clobbering it breaks Back.
- **Out-of-range pages clamp.** `?page=99` shows the last page and rewrites the URL to match, and `?page=abc` is page 1.

Without JavaScript, every post shows and the pager never appears, which is exactly the behaviour from before. Projects use the same pager with no filter, five per page.

# `curl -L lsalik.dev/ssh`

This one had been sitting on the roadmap with a question mark: *"not sure what the easter egg should be, maybe some ascii art of my cats?"* It's the cats. Hitting `/ssh` from a terminal gets you a fake SSH login: a host-key warning with a suspiciously purr-shaped fingerprint, then a message of the day introducing the site's two maintainers. Finch is an oversized tuxedo Maine Coon, and Raven is a small black cat who runs ops.

```
$ curl -L lsalik.dev/ssh
The authenticity of host 'lsalik.dev (104.21.0.7)' can't be established.
ED25519 key fingerprint is SHA256:9faSn0w+ba11sm30wmix...purr=
...
```

It's terminal-only on purpose: a browser hitting `/ssh` gets the normal 404. The one plumbing change was in `box()`, the helper that frames every curl response. It soft-wraps long lines, and that strips leading whitespace, which is the only thing holding ASCII art together. It now takes an opt-in `wrap: false` that frames lines verbatim.

# A new curl logo on every request

The curl home page used to open with an `SLK` wordmark in half-block pixels. It's gone. In its place is a random mark, generated fresh for every request, in the style of a GitHub identicon:

- **A mirrored grid.** The left 8 columns of an 8×17 pixel grid are random, there's a center column, and the right side mirrors the left. Symmetry is what makes random pixels read as an *emblem* instead of noise.
- **Half-block packing.** Pairs of pixel rows pack into one text row using `▀ ▄ █`, the same trick the old wordmark used. The result is four rows tall, in one random light colour, with two coloured bars underneath.
- **Quality guards.** A pattern is rejected and regenerated if its fill is outside 35–65%, if any pixel row is empty, or if the center column has fewer than two pixels (otherwise the two halves read as two separate blobs). After 20 tries it keeps the last attempt, so a bad run of randomness can never hang a request.

The footprint is exactly the old logo's, 17 columns by 6 rows, so the two-column layout on `curl lsalik.dev/uses` didn't need to change. And because curl responses are already `no-store`, so the same URL can serve HTML to browsers and text to terminals, every request genuinely gets a new mark. The homepage's animated curl demo renders in the browser, so it gets a new one on every visit too.

# Three new background patterns

The background used to pick one of three presets per page load: Drift, Cascade and Pulse. They were all the same function, a sum of four straight-line sine waves with different tuning, so they all read as *diagonal waves*. Now there are six, and the new three are shapes the old function couldn't make:

- **Ripple:** rings spreading out from a center that wanders slowly around the screen.
- **Vortex:** three spiral arms turning around the middle.
- **Interference:** two orbiting sources whose waves cross into shifting bands.

To make room for them, each preset became a `{ name, field }` pair, where a field is any `(x, y, t, phase, grid) → brightness` function. The old three moved into a `waves(...)` field, and a test checks them *bit for bit* against a copy of the old formula, so the refactor provably changed nothing.

Three things took tuning:

- **Aspect ratio.** Characters are about twice as tall as they are wide, so a distance measured in cells makes circles look like wide ovals. Vertical distances count double.
- **Shared geometry.** The background draws three phase-shifted layers and lets the brightest win each cell. My first version gave each layer its own ripple center, and the result was mud. Sharing the geometry across layers and varying only the wave timing made the rings line up.
- **Contrast.** The radial sums came out flatter than the originals: a brightness spread of about 0.21 against roughly 0.3. That made them look washed out next to Drift. A single `RADIAL_GAIN` constant brings them into line, and a test now holds every new pattern to the originals' range.

# The prompt got a spinner

The header prompt (`lsalik@dev:~/blog$`) picked up a mark to its left, and it took three tries to get right. The first was a literal `[slk]`. The second was a tiny 5×2 identicon, a cousin of the curl logo, but a grid that small only has a few dozen patterns worth showing, and it got repetitive fast.

The one that stuck is a braille spinner, `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`, the same "working…" indicator plenty of CLIs use. It's pure CSS: a keyframe animation that steps through the `content` of a `::before`, so there's no script and nothing for the CSP to worry about. Under `prefers-reduced-motion` it holds still on `⠿`. The only surprise was that the site font has no braille characters, so the browser falls back to another font where they render small. The spinner gets its own font size and a fixed width, so the prompt never jitters between frames.

# A CSP bug that only lived on 404s

The site's Content Security Policy is built per response: the middleware hashes every inline `<script>` in the HTML and lists exactly those hashes in `script-src`. That's what lets Astro's small inlined scripts run without `unsafe-inline`.

The hashing sat inside an `if (response.status === 200 && isHtml)` block, tangled up with the cache headers. The 404 page carries the same two inline layout scripts as every other page, but it isn't a 200, so it got a policy with no hashes, and the browser blocked both scripts on every missing page. The fix untangled the two decisions: every HTML response gets its scripts hashed, and the cache headers are decided separately.

# Screensaver mode

This is the one that wasn't on any list. The background is the most "this site" thing about this site, and it always sat at 19% opacity behind the content. I wanted to be able to leave it running on a second monitor.

`/screensaver` runs only the background, full screen, with nothing in front of it. Press `g s` from any page (it's in the `?` help), or, on a phone, tap the dim `░` at the very end of the footer. There's a settings panel for:

- the pattern, or auto-cycling through all six every few minutes;
- speed, cell size and brightness;
- colours from any of the site palettes, or your own background and three layer colours;
- colour animation: a hue cycle, a slow gradient, or a rainbow;
- a clock: big block digits, a minimal one, or just the date.

Settings save in your browser, and **copy url** turns them into a short link that recreates the setup elsewhere. The link writes only what differs from the defaults, with one exception: the colour palette is always included, because the default palette is *your* site palette, and leaving it out would hand the recipient their own colours instead of yours.

## One engine, two backgrounds

The background code started life as a single setup function with a module-level "already started" flag, which made a second copy on another page impossible. It's now a reusable `createAsciiEngine(container, options)`, and the site background and the screensaver each run their own instance. The rewrite also fixed two quiet bugs in the site background:

- **Persisted layers.** It now recognises its persisted container by identity rather than by a run-once flag, so coming back from a page without a background rebuilds it properly.
- **Hidden tabs.** Time advances by a capped step each frame, `min(dt, 0.1s) × speed`. Previously the animation used absolute time, so a tab left in the background for an hour would fast-forward when you came back.

## Colour without per-character work

The engine draws three `<pre>` layers of text every frame, and I didn't want colour effects adding work per character on top of that. So all three colour animations are CSS, driven by one variable written per frame:

- **Hue cycle** is a `hue-rotate()` filter on the whole stage.
- **Gradient** paints each layer with a `linear-gradient` clipped to the glyphs (`background-clip: text`), between the layer colour and a hue-shifted partner, with a slowly turning angle.
- **Rainbow** uses a full-spectrum gradient that's twice the screen width and slides across. The gradient contains the spectrum *twice*, so sliding it by exactly half lands on an identical frame, and the loop has no visible seam.

## Leaving it running

A screensaver gets left alone for hours, which surfaces problems a normal page never sees:

- **Nothing on screen when idle.** The panel and the mouse cursor fade out after three seconds without input.
- **The screen stays on.** The page asks for a Screen Wake Lock, and asks again whenever the tab becomes visible, since browsers drop the lock when you switch away.
- **No burn-in.** The clock shifts up to 12 px to a new spot every minute, so a static `12:00` never burns into an OLED panel. It ticks on minute boundaries rather than every second, and re-syncs immediately when the tab comes back.
- **No fullscreen on iPhone.** Safari on iPhone doesn't let web pages go fullscreen at all; only videos can. Desktop, Android and iPad get a real `[fullscreen]` button. On iPhone, that button becomes **add to home screen**: the screensaver page ships a small web app manifest with `display: fullscreen`, so launching it from the home screen opens it without any browser UI, which is the closest iOS allows.

## One more catch before shipping

The exit button takes you back to the page you came from, and only if that page is on the same site. It turns out that check has a hole: a same-origin URL with a path like `//evil.example` passes it, and assigning that path to `location.href` is a *protocol-relative* URL that leaves the site. It's an obscure route (you'd have to arrive from a 404 page with that exact path), but it's the classic shape of an open redirect, so exit targets starting with `//` now go home instead, and a test pins it down.

# Wrap-up

That clears the old roadmap: pagination, the corner logo (which became the spinner), the `/ssh` egg, the GitHub stats and the cursor-reactive background from June, and "add different animations", which became both the new patterns and a whole page for watching them. The README doesn't have a future-plans section anymore, and for the first time that's because everything on it is done.

Press `g s`, put it fullscreen, and go make a coffee.
