# Deferred Review Items

Items raised during polish review pass that were intentionally left out of the shipped scope. Keep as a backlog.

## Code quality follow-ups

- **Markdown-prose CSS duplicated across four pages.** `src/pages/about.astro`, `src/pages/resume.astro`, `src/pages/blog/[...slug].astro`, and `src/pages/projects/[...slug].astro` each carry ~30–170 lines of near-identical `:global(...)` markdown styling. The blog and project slug pages are currently byte-identical in their markdown rules; `about.astro` and `resume.astro` still use the older, minimal style (no lists, no blockquotes, no tables). A future "fix h2 spacing" edit will silently apply to one copy and skip the others. Extract into a shared `.prose` class or a `MarkdownProse.astro` wrapper — start with the blog/project pair since they're already identical.

- **`about.astro` and `resume.astro` markdown styles are incomplete.** Both pages still use a minimal style block with `::before` list markers and no blockquote, table, task-list, or footnote rules. They should be brought in line with the blog/project rendering once the above duplication is resolved.

- **`renderResume` terminal handler still returns a stub.** `src/middleware.ts` passes `'Visit lsalik.dev/resume for full resume content.'` to `renderResume`, but the `/about` handler imports `aboutRaw` from `./data/about.md?raw` and ships the real content. The asymmetry is visible when curling `/resume`. Fix: add `import resumeRaw from './data/resume.md?raw'` and pass it through — roughly 3 lines.

- **`PALETTE_LABELS` is exported but unused.** `src/lib/palettes.ts` ships a `PALETTE_LABELS` map that `src/islands/palette-toggle.ts` never reads; the toggle displays the raw palette id. Either delete the export or wire it into the toggle so the label renders as "Dark Terminal" instead of "dark-terminal".

- **Nav list is declared in two places.** `src/components/Nav.astro` and `src/curl/render.ts` both hardcode the 5-path nav. Drift risk is low thanks to the existing `renderHome` + `curl-demo` drift test, but extracting a shared `NAV_LINKS` constant (e.g. `src/lib/nav.ts`) would make future nav edits a one-liner and eliminate one manual sync point.

- **Contact-link list is also declared in two places.** `src/pages/contact.astro` and `src/middleware.ts` both inline the same contact link arrays. Extract to `src/data/contact.ts` (or similar) and import from both.

- **`Nav.astro` active state uses `path.startsWith(link.href)`.** Works today because no current path is a prefix of another, but `/about` would also match a hypothetical `/aboutfoo`. Safer: `path === link.href || path.startsWith(link.href + '/')`. Five-character change.

- **`src/data/sources.md` is a leftover orphan.** The sources page and its middleware handler were removed, but `src/data/sources.md` was not deleted. Safe to remove.

## Background animation hardening

- **`LAYER_PHASES.length === LAYER_COLORS.length` has no runtime or test guard.** `src/islands/ascii-bg.ts` assumes the two arrays stay in sync; if someone adds a fourth phase but forgets the fourth color, one layer will silently fail to render. Add a one-line assertion at module load or a parity test.

- **`started` flag has a latent regression vector.** `src/islands/ascii-bg.ts` sets `started = true` before checking whether `#ascii-bg` exists on the current page. If a future page uses a layout without `#ascii-bg` and a visitor lands there first, subsequent navigation to a Base.astro page will find `started === true` and skip init. Not exercised today (every page uses Base.astro) but worth either a defensive comment or moving the container check ahead of the flag set.

- **rAF loop has no cancellation.** If `transition:persist` ever fails to match (e.g. a future layout change), two rAF loops could end up writing to two different `<pre>` sets. Store the last `requestAnimationFrame` handle and cancel it before re-init.

- **Resize rebuild is implicit.** `handleResize` only calls `measure()` and relies on the next frame to pick up the new `cols`/`rows`. Works because the next frame is ~16ms away, but subpixel rounding could leave 1-cell gaps on the right/bottom. Dynamically measure a real monospace glyph once, or add a small `+2` overscan.

## Cosmetic

- **`textResponse` double-newlines raw markdown bodies.** `src/middleware.ts` calls `body.trimEnd() + '\n\n'`, so `?raw`-sourced content ends with a trailing blank line in `curl lsalik.dev/about`. Cosmetic only.

- **Curl output for `about` leaks markdown syntax.** `aboutRaw` ships `#`, `##`, `-`, and `[text](url)` syntax literally in the terminal. Markdown is famously terminal-readable, but a small pass that turns `[text](url)` → `text (url)` would polish the curl output.
