---
title: "Randomizing the SLK curl logo"
date: 2026-04-16
tags: [meta, curl, webdev]
description: "Each curl lsalik.dev now picks three distinct light colors for the word and its two underline bars."
draft: false
---

The ANSI logo at the top of `curl lsalik.dev` used to be three fixed colors: cyan letters, pink bar, cream bar. Perfectly fine, and also a bit static once you'd seen it a few times. I decided to make it a little more alive.

# What changed

Every call to `renderLogo()` in `src/curl/logo.ts` now picks three distinct colors from a curated palette and paints:

- the entire SLK word in color A,
- the first underline bar in color B,
- the second underline bar in color C.

`curl`ing the homepage twice in a row gives you a different combination almost every time, but all three stripes are always legible against a black terminal background.

# The palette

I didn't want random RGB, because random-anything on a dark terminal lands in "unreadable navy" territory half the time. The pool is hand-picked from the xterm 256-color space, biased toward tints that stay bright on black:

```ts
const LIGHT_COLORS: readonly number[] = [
  87,  // bright cyan
  120, // light green
  159, // pale cyan
  189, // pale lavender
  195, // pale blue
  210, // salmon
  211, // pink
  215, // peach
  218, // light pink
  219, // magenta pink
  222, // wheat
  223, // cream
  228, // pale yellow
  229, // parchment
];
```

Fourteen entries is enough variety that consecutive curls rarely repeat, without getting into territory where the contrast gets iffy.

# Distinct, not just random

The first version of the change picked each of the three colors independently with `Math.random()`. That occasionally gave me the same color for the word and one of the bars, which looked like a single fat block instead of three stripes. The fix was trivial: pull without replacement.

```ts
function pickDistinctColors(n: number): string[] {
  const pool = [...LIGHT_COLORS];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const j = Math.floor(Math.random() * pool.length);
    out.push(fgCode(pool[j]));
    pool.splice(j, 1);
  }
  return out;
}
```

Each render copies the palette, draws three indices, splices as it goes. With a 14-entry pool and only three draws there's no measurable overhead, and the three stripes are guaranteed to be visually distinct.

# What it didn't change

The existing `renderLogo()` test contract still holds: six rows total (four for the word, two for the bars), every row exactly 17 visible columns wide after stripping ANSI, only half-block glyphs (`▀ ▄ █`) and spaces in the visible output, and balanced open/reset SGR codes on each line. The color codes are just parameters now instead of constants, so the existing tests passed without modification.

The underline bars are also still drawn with the "lower-half block" glyph (`▄`), so when the terminal renders them back-to-back against the letter row above, you get the same two-stripe accent under the word — just in a different color each time.

A tiny change, but one of those things that's nice every time you see it.
