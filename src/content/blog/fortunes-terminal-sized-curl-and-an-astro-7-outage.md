---
title: "Fortunes, terminal-sized curl, and an Astro 7 outage"
date: 2026-10-14
tags: [meta, webdev, curl]
description: "An Astro 7 upgrade that took the site down and the check that now guards against it, plus /fortune, curl output sized to your terminal, working-on badges, and the cats in colour."
draft: false
---

The [last post](/blog/screensaver-and-friends) closed out the old roadmap. This one covers the five days since: a dependency cleanup that ended with every page returning a 500, a batch of new features, and a round of fixes, including two cats whose ears were in the wrong place. Like the last one, it's a roundup, organised by feature.

# Clearing the Dependabot alerts

GitHub had a pile of Dependabot alerts open against the site. Most of them went away without touching `package.json` at all: refreshing the lockfile within the existing version ranges took `npm audit` from 18 vulnerable packages to 4, and pulled in patched copies of `vite`, `postcss`, `tar`, `nanoid` and a handful of other transitive packages.

It also fixed something I hadn't noticed. The committed lockfile was missing esbuild's optional platform packages, so `npm ci` refused to install from it. It installs cleanly now.

The last four alerts were only fixed in Astro 7 and version 11 of the Vercel adapter. None of them was reachable as the site is configured (the critical one is in image optimisation, which is turned off), but staying a major version behind would cut the site off from future fixes. So the next step was the upgrade.

# Astro 7, twice

The upgrade itself was small. Astro went from 6.4.8 to 7.3.8 and `@astrojs/vercel` from 10 to 11, and the only code change was one line in `astro.config.mjs`. Astro 7 switched its default whitespace handling to a JSX-style mode that strips the whitespace between elements written on separate lines, which glued words together on the projects list, the man page and one blog post. `compressHTML: true` brings back the old HTML-aware behaviour, and I compared every page against the live site to make sure nothing else moved.

It passed 322 unit tests, a clean build and 60 headless browser checks. I merged it, and every page on the site started returning 500.

The Vercel logs said `Cannot find native binding`. The server entry that the new adapter generated contained a bare side-effect import:

```js
// .vercel/output/functions/_render.func/dist/server/entry.mjs
import "rolldown";
```

`rolldown` is Vite 8's bundler, and it has no business running inside a deployed server. It got traced into the serverless function without its platform-specific native binding, so the function crashed on startup, before it could serve anything. None of my checks caught it because all of them ran against the full local `node_modules`, where the binding exists. The Vercel preview had built fine, but previews sit behind Deployment Protection, so nothing had actually requested a page from it.

I reverted first and debugged after. The real fix was upstream: version 11.0.14 of the adapter, whose changelog describes this exact failure. The redo pins `^11.0.14` so the broken 11.0.13 can't come back, and it brings a new script, `npm run check:function`. It copies the packaged function out of the repo, so it can only resolve its own bundled `node_modules` the way it would on Vercel, imports it, and sends real requests to the key routes, curl ones included. Pointed at the broken build, it fails with the exact production error. It now runs before any change to dependencies or the build, and `npm audit` reports 0 vulnerabilities.

# Working on

The projects page now marks what I'm actively working on. Project front matter has a new optional `active` field, and active projects get a `● working on` badge on their card and their page and sort to the top. The sort is one shared `sortProjects()` function, so the browser list and `curl -L lsalik.dev/projects` can't disagree about the order. The badge's dot pulses slowly, and holds still under `prefers-reduced-motion`.

Five new entries went in at the same time: Finch, BashCraft, Devil's Bayou, vsync and Glyphling, which brings the list to 11 projects across three pages. Finch, the media player, is named after Finch the cat, who shows up again further down.

# `/fortune`

`curl -L lsalik.dev/fortune` prints a random fortune in a speech bubble with a small cat underneath, a nod to the classic Unix `fortune` and to `cowsay`:

```
┌──────────────────────────────┐
│ Clear is better than clever. │
└──────────────────────────────┘
   \
    \    /\_/\
        ( o.o )
         > ^ <
```

The browser version at `/fortune` doesn't reimplement any of it. It calls the same `renderFortune()` the terminal route uses, strips the ANSI colour codes, and puts the text in a `<pre>`, with an `[another]` link that reloads for a new one. It launched with 19 lines and now has 43. A test holds every line to a few rules: plain text, 90 characters at most, and no duplicates.

# Curl that fits your terminal

Every curl view used to be exactly 80 columns wide. Now any route takes a `?cols=` parameter:

```
curl -L "lsalik.dev/blog?cols=$COLUMNS"
```

Boxes, headers and two-column layouts size themselves to anything from 40 to 160 columns, and anything else, including no parameter at all, falls back to 80. Below 64 columns, `/uses` stacks its logo above the text instead of squeezing the two side by side.

The one design decision worth mentioning is that the width is passed into every render function as an argument, rather than set once in a module-level variable. On Vercel, one function instance can serve several requests at the same time, so a shared "current width" could leak one request's width into someone else's response.

The bigger win was the test that came with it. It renders every terminal view at 40, 80 and 120 columns and fails if any line comes out wider than requested. It found two bugs that predated the feature: the previous/next links at the bottom of a blog post overflowed even at the default 80 columns, and long box titles could push past the top border. Titles are now cut short with an `…`.

# The cats, properly

The cat under the fortune and Finch on `/ssh` both had their ears in the wrong place. Each ear row was drawn one column to the left of the rest of the cat, and Finch's ears were also two columns too narrow to meet the top of the head. Since the browser's `/fortune` shows the same text as curl, it was wrong in both places. The art now lives in its own module, `src/curl/cats.ts`, with a test that checks every cat is centred on a single column and that its ears sit just inside its head, so the next edit can't knock them out of line.

While I was in there, the `/ssh` cats got redrawn from a photo of the two of them, and they now sit side by side the way they did for it: Finch tall on the left, Raven small on the right. Finch is a tuxedo Maine Coon, so the art has white whiskers, a white blaze between the eyes, a white bib and white front paws, plus a pink nose and yellow-green eyes. Raven is a Bombay, black all over except for the same yellow-green eyes. Black fur is drawn in grey, so it still shows up on a dark terminal.

The colours come from a mask drawn in the same shape as each cat: `W` for white fur, `E` for eyes, `N` for the nose, and anything else is black fur. A small `paintCat()` turns the art and its mask into ANSI colour codes, with one escape per run of same-coloured characters rather than one per character.

The maintainers' descriptions used to be fixed. Now each cat has a list, ten lines for Finch and nine for Raven, and the message of the day shows one from each, changing at midnight UTC. Each list is walked in order, so every line gets its day before any repeats, and because the lists have different lengths, a given pairing only comes back every 90 days. Finch's list includes "opens doorknobs and cabinets. has root on the house" (the doorknobs part is literal), and Raven's includes "sleeps in the office. calls it monitoring". And the fingerprint in the fake host-key warning no longer ends in `purr=`. It ends in `bl3p`.

# Screensaver follow-ups

The screensaver's final review left five minor items, and they're all fixed:

- **No jump after a stall.** The colour cycle used wall-clock time, so a frozen tab leapt ahead when it came back. It now advances by the same capped frame step as the background, and after a 2-second freeze the hue moves 10.8° instead of 148°.
- **No filter when nothing's animating.** The `hue-rotate()` filter used to stay on at 0° with colour animation off, which still cost a compositing pass every frame. It now applies only while hue-cycling.
- **Fewer re-measures.** Changing the speed no longer re-measures the character grid (five nudges used to cost five measurements, now none), and a resize measures once instead of twice.
- **One wake lock at a time.** Two quick visibility changes used to leave three live screen wake locks. Now there's one, and a lock the browser releases is re-acquired exactly once.
- **Accessibility.** The clock is a `role="timer"` whose label holds the time as text, so screen readers no longer read the block digits as "full block, full block…", and the colour pickers have real names.

# Wrap-up

The outage was the most useful part of this stretch, even if it didn't feel like it at the time. Every check I had tested the code in my working copy, and none of them tested the thing that actually gets deployed. `check:function` closes that gap for the price of one more command. As for the cats, they're centred now, and they're finally the right colours.
