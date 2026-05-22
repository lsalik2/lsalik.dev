# Design: three portfolio features

Date: 2026-05-22
Status: approved

Implements three items from the README "Future plans" list:

1. `/ssh` curl easter egg
2. Animated ASCII corner ornaments on the homepage
3. Per-post Open Graph images, generated at build time

The three features are independent. Build order: `/ssh` → corner ornaments → OG
images (smallest to largest).

---

## Feature 1 — `/ssh` easter egg (curl-only)

### Behavior

`curl -L lsalik.dev/ssh` (or any terminal client matched by `TERMINAL_UA_RE`)
returns a fake SSH login session as `text/plain`. Browsers visiting `/ssh`
receive the normal 404 — there is no page route, so no change is needed for
browser traffic.

### Changes

- **`src/curl/render.ts`** — new exported `renderSsh(): string`. Builds the
  session output using the existing `box()` helper and ANSI color helpers
  (`green`, `dim`, `cyan`, `bold`, etc.). All content is static literal
  strings; there is no user input, so no escaping/sanitizing is required.
- **`src/middleware.ts`** — import `renderSsh`; in the terminal-client branch
  add a route check alongside the others:
  ```ts
  if (pathname === '/ssh' || pathname === '/ssh/') {
    return textResponse(renderSsh());
  }
  ```
  Placed before the final `notFoundResponse(pathname)` fallthrough.

### Output

```
$ ssh guest@lsalik.dev
The authenticity of host 'lsalik.dev' can't be established.
ED25519 key fingerprint is SHA256:9faS...purr
Warning: Permanently added 'lsalik.dev' to the list of known hosts.

  ┌─ motd ──────────────────────────────────────┐
  │  Welcome to lsalik.dev — last login: today   │
  │                                              │
  │   <Finch — big tuxedo maine coon ASCII art>  │
  │   <Raven — small black cat ASCII art>        │
  │                                              │
  │   the maintainers:                           │
  │   finch  ·  oversized tuxedo maine coon      │
  │   raven  ·  small black cat, runs ops        │
  └──────────────────────────────────────────────┘

hint: the rest of the site → curl -L lsalik.dev
Connection to lsalik.dev closed.
```

- Finch is drawn larger (he is the Maine Coon); Raven is drawn smaller and
  rendered in `dim`/grey.
- The `motd` box uses the existing `box()` helper with a `title`.
- The banner lines (`$ ssh ...`, fingerprint, warning) and the closing
  `Connection ... closed.` line sit outside the box, mimicking a real SSH
  client.

### Tests

- `tests/curl/` — assert `renderSsh()` output contains the expected
  substrings: the `ssh guest@lsalik.dev` banner, both cat names (`finch`,
  `raven`), the `motd` box title, and the `Connection to lsalik.dev closed.`
  line. Follow whatever assertion style the existing `tests/curl/` suite uses
  for the other `render*` functions.
- `tests/middleware.test.ts` — terminal UA on `/ssh` → 200, `Content-Type:
  text/plain`; browser UA on `/ssh` → 404.

---

## Feature 2 — Animated ASCII corner ornaments (homepage)

### Behavior

Two decorative box-drawing ornaments anchored to the top-left and top-right
corners of the homepage. On page load each ornament "draws itself" once (the
strokes wipe in from the corner), then sits still. Homepage only — the README
specifies `page-main`.

### Changes

- **`src/components/CornerOrnaments.astro`** — new component. Renders two
  `<div aria-hidden="true">` elements (`.corner-ornament.corner-tl` and
  `.corner-ornament.corner-tr`) containing box-drawing glyphs. A short
  horizontal arm plus a short vertical arm per corner, e.g. top-left
  `┌──╴` with a `│` descending one or two lines; top-right mirrored.
  Styling: `position: absolute`, `pointer-events: none`, low opacity,
  accent-tinted via `var(--accent)`. Component owns its own scoped `<style>`.
- **`src/pages/index.astro`** — render `<CornerOrnaments />` inside the page;
  ensure the anchoring ancestor establishes a positioning context. The
  homepage content sits inside `.page-content` (from `Page.astro`). The
  ornaments will be placed inside `index.astro`'s markup and positioned
  relative to a wrapper that `index.astro` marks `position: relative`. This
  keeps the change contained to `index.astro` and the new component — no edit
  to the shared `Page.astro` layout.

### Animation

- Pure CSS. A `@keyframes` rule animates `clip-path` so each ornament's strokes
  wipe in from its corner outward (horizontal arm grows away from the corner,
  vertical arm grows down). Runs once (`animation-fill-mode: both`, no
  iteration).
- Wrapped so it respects `@media (prefers-reduced-motion: reduce)` — under
  reduced motion the ornaments appear fully drawn with no animation.
- No JavaScript, therefore no Content-Security-Policy changes (the site's CSP
  whitelists inline-script hashes; CSS animations are unaffected).

### Placement note

The ornaments are small and sit in the corner padding zone so they frame the
top edge without overlapping the breadcrumb (top-left) or palette toggle
(top-right). Low opacity keeps them subtle. This placement is the most likely
spot for visual tweaking once it is running in the browser.

### Tests

- Light component test (in `tests/` following the existing structure): the
  rendered component output contains both ornament elements and both carry
  `aria-hidden="true"`.

---

## Feature 3 — Per-post Open Graph images (build-time)

### Approach

Considered three options:

1. **`satori` + `@resvg/resvg-js` in a prerendered Astro endpoint** —
   *chosen*. Full layout control for the terminal-window card; the native
   `resvg` module runs only during `astro build`, never on the Vercel edge
   runtime.
2. `@vercel/og` — runtime edge image generation. Rejected: contradicts the
   README's "build-time so edge-safe" intent and adds per-request edge cost.
3. `astro-og-canvas` — build-time but template-limited; hard to reproduce the
   exact terminal-window look.

### Changes

- **`package.json`** — add `satori` and `@resvg/resvg-js` to
  `devDependencies`. They are build-only: the prerendered endpoint's code is
  executed during `astro build` and excluded from the edge server bundle, so
  the native `resvg` binary never reaches the edge runtime. Vercel installs
  devDependencies during the build step.
- **`src/assets/fonts/`** — new directory. Bundle `RobotoMono-Regular.ttf` and
  `RobotoMono-Bold.ttf` (SIL Open Font License; Roboto Mono is the site's
  primary monospace face). Read at build time via `fs` with paths resolved
  from `import.meta.url`.
- **`src/lib/og-template.ts`** — new module. Pure function
  `buildOgTree({ title, date, tags }): <satori node tree>` that returns the
  Satori-compatible element tree (plain `{ type, props }` objects, no JSX) for
  the terminal-window card. Isolated and unit-testable.
- **`src/pages/og/[slug].png.ts`** — new endpoint.
  - `export const prerender = true`.
  - `getStaticPaths()` returns one entry per non-draft blog post (`slug` =
    post id).
  - `GET` builds the tree via `buildOgTree`, renders to SVG with `satori`
    (1200×630, supplying the two font buffers), rasterizes the SVG to PNG with
    `@resvg/resvg-js`, and returns a `Response` with `Content-Type:
    image/png`.
  - Output is a static file at `dist/.../og/<slug>.png`, served directly from
    Vercel's CDN. Astro middleware does not run for static assets at request
    time, so no middleware change is needed.
- **`src/layouts/Base.astro`** — add `<slot name="head" />` inside `<head>`
  (after the existing meta/link tags). This is the minimal hook needed to let
  individual pages contribute `<head>` content; it serves the OG feature and
  is not unrelated refactoring.
- **`src/layouts/Page.astro`** — forward the slot:
  `<slot name="head" slot="head" />` so pages using `Page` can reach `Base`'s
  head slot.
- **`src/pages/blog/[...slug].astro`** — inject into the head slot:
  `<meta property="og:image" content={`https://lsalik.dev/og/${post.id}.png`}>`
  plus `og:title`, `og:description` (from `post.data.description`), `og:type`,
  and `twitter:card` set to `summary_large_image`. The absolute URL uses the
  site's canonical origin `https://lsalik.dev`.

### Card design

- Canvas: 1200×630 px.
- Background: dark, matching the site's default `dark-terminal` palette.
- Titlebar: a horizontal bar in a slightly lighter surface color, containing
  three "traffic-light" dots on the left and the text `lsalik.dev`.
- Body:
  - A green prompt line `$ cat <slug>.md`.
  - The post title, large and bold (Roboto Mono Bold).
  - A horizontal rule.
  - A meta line: `<date> · #tag #tag` (tags prefixed with `#`).
- All text uses the bundled Roboto Mono faces.

### Tests

- `tests/lib/` — `buildOgTree({title, date, tags})` produces a tree whose
  flattened text content includes the title, the date string, and each tag.
- Endpoint `getStaticPaths()` returns exactly one path per non-draft post in
  the blog collection (drafts excluded).

---

## Out of scope

- Blog/projects pagination — README explicitly defers it until there are "too
  many" posts.
- OG images for project pages — only blog posts get OG images in this pass;
  projects can follow the same pattern later if wanted.
- GitHub live stats, ASCII-background cursor/scroll reactivity, additional
  animations — separate README items, not part of this spec.
