# v1 Polish — Deferred Review Items

Items raised during the subagent-driven v1 polish review pass that were intentionally left out of the shipped scope. Keep as a backlog.

## Infrastructure (pre-existing)

- **`npm run build` fails with sharp / `node:crypto` edge-function bundling error.** Reproduces at the pre-v1-polish baseline (`ecbd28c`), so this is not a v1 regression. Sharp gets pulled into the Vercel edge function bundle and can't resolve Node builtins. Needs a separate infrastructure pass — probably excluding sharp from the edge bundle or moving image work to a build-time step. Dev server and tests are unaffected.

## Code quality follow-ups

- **Markdown-prose CSS duplication across three pages.** `src/pages/about.astro`, `src/pages/sources.astro`, and `src/pages/resume.astro` each carry ~30 lines of near-identical `:global(h1/h2/p/ul/ul li::before)` styling. The copies are not byte-identical (resume uses larger headings, sources adds an `a` rule, about omits it), so a future "fix h2 spacing" edit will silently apply to one and skip the others. Extract into a shared `.prose` class or a `MarkdownProse.astro` wrapper before any additional markdown-backed pages land.

- **`renderResume` terminal handler still returns a stub.** `src/middleware.ts` passes `'Visit lsalik.dev/resume for full resume content.'` to `renderResume`, but the parallel `/about` and `/sources` handlers now use `import … from './data/…md?raw'` and ship the real content. The asymmetry became visible in Phase 5. Fix: add `import resumeRaw from './data/resume.md?raw'` and pass it through — roughly 3 lines.

- **`PALETTE_LABELS` is exported but unused.** `src/lib/palettes.ts` ships a `PALETTE_LABELS` map that `src/islands/palette-toggle.ts` never reads; the toggle displays the raw palette id. Either delete the export or wire it into the toggle so the label renders as "Dark Terminal" instead of "dark-terminal".

- **Nav list is declared in two places.** `src/components/Nav.astro` and `src/curl/render.ts` both hardcode the 6-path nav. Drift risk is low thanks to the existing `renderHome` + `curl-demo` drift test, but extracting a shared `NAV_LINKS` constant (e.g. `src/lib/nav.ts`) would make future nav edits a one-liner and eliminate one manual sync point.

- **Contact-link list is also declared in two places.** `src/pages/contact.astro` and `src/middleware.ts` both inline the same `[{ label: 'GitHub', url: 'https://github.com/lsalik2' }]` literal. Extract to `src/data/contact.ts` (or similar) and import from both.

- **`Nav.astro` active state uses `path.startsWith(link.href)`.** Works today because no current path is a prefix of another, but `/about` would also match a hypothetical `/aboutfoo`. Safer: `path === link.href || path.startsWith(link.href + '/')`. Five-character change.

## Background animation hardening

- **`LAYER_PHASES.length === LAYER_COLORS.length` has no runtime or test guard.** `src/islands/ascii-bg.ts` assumes the two arrays stay in sync; if someone adds a fourth phase but forgets the fourth color, one layer will silently fail to render. Add a one-line assertion at module load or a parity test.

- **`started` flag has a latent regression vector.** `src/islands/ascii-bg.ts` sets `started = true` before checking whether `#ascii-bg` exists on the current page. If a future page uses a layout without `#ascii-bg` and a visitor lands there first, subsequent navigation to a Base.astro page will find `started === true` and skip init. Not exercised today (every page uses Base.astro) but worth either a defensive comment or moving the container check ahead of the flag set.

- **rAF loop has no cancellation.** If `transition:persist` ever fails to match (e.g. a future layout change), two rAF loops could end up writing to two different `<pre>` sets. Store the last `requestAnimationFrame` handle and cancel it before re-init.

- **Resize rebuild is implicit.** `handleResize` only calls `measure()` and relies on the next frame to pick up the new `cols`/`rows`. Works because the next frame is ~16ms away, but subpixel rounding could leave 1-cell gaps on the right/bottom. Dynamically measure a real monospace glyph once, or add a small `+2` overscan.

## Cosmetic

- **`textResponse` double-newlines raw markdown bodies.** `src/middleware.ts` calls `body.trimEnd() + '\n\n'`, so `?raw`-sourced content ends with a trailing blank line in `curl lsalik.dev/about`. Cosmetic only.

- **Curl-demo markdown syntax leaks through.** `aboutRaw`/`sourcesRaw` ship `#`, `##`, `-`, and `[text](url)` syntax literally in the terminal. Markdown is famously terminal-readable, but a small pass that turns `[text](url)` → `text (url)` would polish the curl output.
