# review-fixes — Design

**Date:** 2026-04-09
**Branch:** `review-fixes` (off `main`)
**Scope:** Clear every item in `docs/REVIEW.md`, plus a short list of local optimizations discovered during exploration. All work lands on a single branch, split into focused commits.

## Goals

1. Collapse duplicated markdown-prose CSS into one shared stylesheet.
2. Close the rest of the "code quality follow-ups" and "background animation hardening" backlogs.
3. Fix the two cosmetic curl-output issues.
4. Apply a few small, local cleanups that remove drift points and dead code.

## Non-goals

- No new features.
- No unrelated refactors.
- No changes to content, themes, or the dual-rendering architecture.

## Design

### 1. Shared prose styles (Option A — CSS class)

- New file: `src/styles/prose.css`. Contains the full markdown rule set currently duplicated in `src/pages/blog/[...slug].astro` and `src/pages/projects/[...slug].astro` (already byte-identical).
- Selectors are scoped under a `.prose` class (no `:global` needed — the file is a plain stylesheet).
- Import `../../styles/prose.css` in the frontmatter of the four consuming pages: `blog/[...slug].astro`, `projects/[...slug].astro`, `about.astro`, `resume.astro`. Wrap each `<Content />` (or equivalent markdown render) in `<div class="prose">…</div>`.
- Delete the old duplicated `<style is:global>` blocks from all four pages.
- Result: single source of truth for markdown styling; `about` and `resume` inherit the full rule set (lists, blockquotes, tables, task lists, footnotes) for free, closing REVIEW item #2.

### 2. Nav and contact extraction

- New file: `src/lib/nav.ts` exporting `NAV_LINKS: readonly { href: string; label: string }[]`.
- Consumers: `src/components/Nav.astro`, `src/curl/render.ts` (used by `renderHome` and other curl renderers), and `src/middleware.ts` (`notFoundResponse` — the third hardcoded copy found during exploration).
- New file: `src/data/contact.ts` exporting `CONTACT_SECTIONS: ContactSection[]`. The `ContactSection` type moves here (or is re-exported from here) so both `src/pages/contact.astro` and `src/middleware.ts` consume the same shape.
- `contact.astro` is rewritten to iterate `CONTACT_SECTIONS` instead of its two inline arrays.

### 3. Nav active-state fix

In `src/components/Nav.astro`, change:

```ts
path.startsWith(link.href)
```

to:

```ts
path === link.href || path.startsWith(link.href + '/')
```

Prevents `/about` from matching a hypothetical `/aboutfoo`.

### 4. `renderResume` wiring

- Add `import resumeRaw from './data/resume.md?raw'` to `src/middleware.ts`.
- Pass `resumeRaw` into `renderResume(resumeRaw)` at the `/resume` handler.
- Remove the `'Visit lsalik.dev/resume for full resume content.'` stub string.

### 5. `renderProjectPost` symmetry

- Add `renderProjectPost({ title, status, stack, content })` to `src/curl/render.ts`, parallel to `renderBlogPost`.
- Middleware `/projects/:slug` handler calls it instead of the inline `bold()`/`dim()` template literal currently at `src/middleware.ts:133`.
- Covered by a new golden-output test in `tests/curl/`.

### 6. Middleware tidy-up

- Drop the dead `isTerminalClient(ua)` re-checks at `middleware.ts:96`, `:136`, `:172`. The early return at line 68 guarantees terminal clients from that point on.
- Remove the `entry as any` casts at `:102` and `:131`. Use the proper content-collection entry type (or a narrow helper) to access `.body`.

### 7. `ascii-bg.ts` hardening

- **Parity guard.** At module load, assert `LAYER_PHASES.length === LAYER_COLORS.length`; throw a clear error if they drift.
- **`started` flag ordering.** In the `astro:page-load` handler, move the `document.getElementById('ascii-bg')` container check to run *before* `started = true`. If there's no container on the current page, leave `started` false so a later page that does have one will still initialize.
- **rAF cancellation.** Store the handle returned by `requestAnimationFrame(frame)` in a module-scoped variable; call `cancelAnimationFrame(handle)` before starting a new loop. Defends against a future `transition:persist` mismatch creating duplicate loops.
- **Resize rebuild.** Already fixed in the current file (`measureCharWidth()` probe + `+1` cell overscan). No code change; called out here so the commit message can note the item is closed.

### 8. Curl markdown cleanup for `/about`

New file: `src/curl/markdown.ts` exporting a pure `stripMarkdownForTerminal(body: string): string` that:

- Converts `[text](url)` → `text (url)`.
- Strips leading `#` / `##` / `###` from heading lines (keeps the text).
- Converts `- ` list markers to `• `.

Called from `renderAbout` in `src/curl/render.ts`. Pure function, covered by unit tests in `tests/curl/markdown.test.ts` (links, nested links, headings at various levels, bullets mid-paragraph, empty input, already-clean input).

### 9. `textResponse` double-newline

In `src/middleware.ts`:

```ts
return new Response('\n' + body.trimEnd() + '\n\n', …)
```

becomes:

```ts
return new Response('\n' + body.trimEnd() + '\n', …)
```

### 10. Deletions

- `src/data/sources.md` — orphan from a removed page.
- `PALETTE_LABELS` export in `src/lib/palettes.ts` — unused; raw palette id look is intentional.

## Testing

### Existing tests that must still pass

- `tests/curl/*` (golden output for home, blog, projects, resume, about, contact, 404)
- `tests/middleware/*`
- `tests/content/schema.test.ts`
- `renderHome` ↔ `curl-demo` drift test

### New tests

- `tests/curl/markdown.test.ts` — exercises `stripMarkdownForTerminal` across link/heading/bullet/empty/clean cases.
- `tests/lib/nav.test.ts` — asserts `NAV_LINKS` is non-empty and every `href` starts with `/`.
- Golden output for `renderProjectPost` (one representative project) added to `tests/curl/`.

### Manual verification

- `npm run build` clean.
- `curl localhost:4321/about` — no literal `[text](url)`, no `##`, no double blank line at bottom.
- `curl localhost:4321/resume` — real resume content, not stub.
- Browser: nav active state on `/about` (should highlight), then manually visit `/aboutfoo` if curious (should 404 and not highlight `about`).
- Browser: all four content pages render with consistent markdown styling.
- Browser: palette toggle still cycles through palettes and persists across navigation.
- Browser: ascii-bg still animates; no console errors.

## Commit plan

1. `refactor: extract shared prose styles into src/styles/prose.css`
2. `fix: pass resumeRaw through renderResume`
3. `refactor: extract NAV_LINKS and CONTACT_SECTIONS`
4. `fix: tighten Nav active-state matching`
5. `refactor: add renderProjectPost and tidy middleware`
6. `feat: strip markdown syntax from curl /about output`
7. `fix: ascii-bg parity guard, init ordering, rAF cancel`
8. `chore: delete sources.md, PALETTE_LABELS, double-newline`

Commits have no `Co-Authored-By` line (per standing preference).

## Out of scope / future

- Anything not listed above. If new issues surface mid-implementation, flag them and add to `docs/REVIEW.md` rather than expanding this branch.
