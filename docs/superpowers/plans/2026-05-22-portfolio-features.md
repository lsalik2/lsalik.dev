# Portfolio Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three README "Future plans" items to lsalik.dev — a `/ssh` curl easter egg, animated ASCII corner ornaments on the homepage, and build-time per-post Open Graph images.

**Architecture:** The `/ssh` easter egg extends the existing curl renderer (`src/curl/render.ts`) and middleware routing. Corner ornaments are a self-contained Astro component with CSS-only animation. OG images are generated at build time by a prerendered Astro endpoint using `satori` (HTML→SVG) and `@resvg/resvg-js` (SVG→PNG); native modules run only during `astro build`, never on the Vercel edge runtime.

**Tech Stack:** Astro 6 (`output: 'server'`), TypeScript, Vitest, `satori`, `@resvg/resvg-js`.

**Spec:** `docs/superpowers/specs/2026-05-22-portfolio-features-design.md`

---

## Known constraint: `box()` strips leading whitespace

`box()` in `src/curl/box.ts` soft-wraps every line through `wrap()`, which drops
leading whitespace from each line independently. Verified empirically: passing
`['   /\\_/\\', '  ( o.o )']` to `box()` yields both lines flush-left, destroying
ASCII-art alignment. Task 1 adds an opt-in `wrap: false` option to `box()` so
pre-formatted art can be framed verbatim. This is a backward-compatible addition
(default behavior unchanged).

---

## Task 1: Add `wrap` option to `box()`

**Files:**
- Modify: `src/curl/box.ts` (the `BoxOptions` interface and the `box` function)
- Test: `tests/curl/box.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/curl/box.test.ts` (inside the file, after the existing `describe` blocks):

```ts
describe('box with wrap: false', () => {
  it('preserves leading whitespace on each line', () => {
    const out = box(['   /\\_/\\', '  ( o.o )'], { width: 40, wrap: false });
    const lines = stripAnsi(out).split('\n');
    // Body lines are framed: "│ " + content + filler + " │"
    expect(lines[1]).toBe('│    /\\_/\\' + ' '.repeat(40 - 2 - 2 - '   /\\_/\\'.length) + ' │');
    expect(lines[2]).toBe('│   ( o.o )' + ' '.repeat(40 - 2 - 2 - '  ( o.o )'.length) + ' │');
  });

  it('still wraps long lines when wrap is not disabled (default)', () => {
    const longLine = 'x'.repeat(100);
    const out = box([longLine], { width: 40 });
    const lines = stripAnsi(out).split('\n');
    // Default behavior: long line is soft-wrapped onto multiple body lines.
    expect(lines.length).toBeGreaterThan(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/curl/box.test.ts -t "wrap: false"`
Expected: FAIL — the `wrap: false` test fails because the option is ignored and leading whitespace is stripped.

- [ ] **Step 3: Implement the `wrap` option**

In `src/curl/box.ts`, add `wrap` to the `BoxOptions` interface:

```ts
export interface BoxOptions {
  readonly title?: string;
  readonly width?: number;
  readonly padX?: number;
  readonly wrap?: boolean;
}
```

In the `box` function, replace the line-collection loop. The current loop is:

```ts
  const wrapped: string[] = [];
  for (const line of lines) {
    if (line === '') {
      wrapped.push('');
      continue;
    }
    const sub = wrap(line, inner);
    for (const s of sub.split('\n')) wrapped.push(s);
  }
```

Replace it with:

```ts
  const doWrap = opts.wrap ?? true;
  const wrapped: string[] = [];
  for (const line of lines) {
    if (line === '') {
      wrapped.push('');
      continue;
    }
    if (!doWrap) {
      // Frame the line verbatim — no soft-wrap, so leading whitespace
      // (needed for multi-line ASCII art) survives. Caller guarantees the
      // line fits within the inner width.
      wrapped.push(line);
      continue;
    }
    const sub = wrap(line, inner);
    for (const s of sub.split('\n')) wrapped.push(s);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/curl/box.test.ts`
Expected: PASS — all box tests, including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/curl/box.ts tests/curl/box.test.ts
git commit -m "feat(curl): add opt-in wrap:false option to box()"
```

---

## Task 2: Implement `renderSsh()`

**Files:**
- Modify: `src/curl/render.ts` (add a new exported `renderSsh` function; reuse existing imports `bold`, `dim`, `green`, `cyan`, `amber`, `titleBright`, `bodyWarm`, `box`)
- Test: `tests/curl/render.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the imports at the top of `tests/curl/render.test.ts`:

```ts
import { renderSsh } from '../../src/curl/render';
```

(Add `renderSsh` to the existing named-import list from `'../../src/curl/render'`.)

Add this `describe` block to `tests/curl/render.test.ts`:

```ts
describe('renderSsh', () => {
  it('contains ANSI escape codes', () => {
    expect(renderSsh()).toContain('\x1b[');
  });

  it('shows the fake ssh banner', () => {
    expect(stripAnsi(renderSsh())).toContain('ssh guest@lsalik.dev');
  });

  it('names both cats in the maintainers list', () => {
    const plain = stripAnsi(renderSsh());
    expect(plain).toContain('finch');
    expect(plain).toContain('raven');
  });

  it('closes the session', () => {
    expect(stripAnsi(renderSsh())).toContain('Connection to lsalik.dev closed.');
  });

  it('points the visitor back to the homepage', () => {
    expect(stripAnsi(renderSsh())).toContain('curl -L lsalik.dev');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/curl/render.test.ts -t "renderSsh"`
Expected: FAIL — `renderSsh` is not exported from `src/curl/render.ts`.

- [ ] **Step 3: Implement `renderSsh()`**

Add this function to `src/curl/render.ts` (after `renderUses`, at the end of the file). All imports it uses (`bold`, `dim`, `green`, `cyan`, `amber`, `titleBright`, `bodyWarm`, `box`) are already imported at the top of the file:

```ts
// curl -L lsalik.dev/ssh — a hidden easter egg. Mimics an SSH login session
// whose message-of-the-day introduces the site's two "maintainers", Finch and
// Raven. Terminal-clients only; browsers hitting /ssh get the normal 404.
//
// The cat art is framed with `box(..., { wrap: false })` so its leading
// indentation survives (the default soft-wrap path strips it).
export function renderSsh(): string {
  // Finch — oversized tuxedo Maine Coon. Drawn larger, warm-toned.
  const finch = [
    '      /\\___/\\',
    '     /  o   o  \\',
    '    ( ==  ^  == )',
    '     )         (',
    '    (  )  v  (  )',
    '   (__(_______)__)',
  ];
  // Raven — small black cat. Drawn compact, dim.
  const raven = [
    '   /\\_/\\',
    '  ( o.o )',
    '   > ^ <',
  ];

  const banner = [
    `${green('$')} ssh guest@lsalik.dev`,
    dim("The authenticity of host 'lsalik.dev (104.21.0.7)' can't be established."),
    dim('ED25519 key fingerprint is SHA256:9faSn0w+ba11sm30wmix...purr='),
    amber("Warning: Permanently added 'lsalik.dev' to the list of known hosts."),
  ];

  const motd = box(
    [
      `${bold(titleBright('Welcome to lsalik.dev'))}${dim('  —  last login: just now')}`,
      '',
      ...finch.map(line => bodyWarm(line)),
      '',
      ...raven.map(line => dim(line)),
      '',
      dim('the maintainers:'),
      `  ${bold(cyan('finch'))}  ·  oversized tuxedo maine coon`,
      `  ${bold(cyan('raven'))}  ·  small black cat, runs ops`,
    ],
    { title: 'motd', wrap: false },
  );

  const footer = [
    '',
    `${dim('hint: the rest of the site →')} ${cyan('curl -L lsalik.dev')}`,
    dim('Connection to lsalik.dev closed.'),
  ];

  return [...banner, '', motd, ...footer].join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/curl/render.test.ts`
Expected: PASS — all render tests, including the new `renderSsh` block.

- [ ] **Step 5: Commit**

```bash
git add src/curl/render.ts tests/curl/render.test.ts
git commit -m "feat(curl): add renderSsh fake ssh-session easter egg"
```

---

## Task 3: Route `/ssh` in middleware

**Files:**
- Modify: `src/middleware.ts` (the import block from `'./curl/render'`, and the terminal-client route chain)

`src/middleware.ts` imports `astro:` virtual modules, so it has no unit test
(see the comment in `tests/middleware.test.ts`). This task is verified by build
+ manual curl.

- [ ] **Step 1: Add `renderSsh` to the render imports**

In `src/middleware.ts`, the import from `'./curl/render'` currently lists
`renderHome, renderBlogIndex, ... renderMan`. Add `renderSsh` to that list:

```ts
import {
  renderHome,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderContact,
  renderProjectPost,
  renderRSS,
  renderResume,
  renderUses,
  renderMan,
  renderSsh,
} from './curl/render';
```

- [ ] **Step 2: Add the `/ssh` route**

In `src/middleware.ts`, in the terminal-client section (after the `if (pathname === '/man' ...)` block and immediately before the final `return notFoundResponse(pathname);`), add:

```ts
  if (pathname === '/ssh' || pathname === '/ssh/') {
    return textResponse(renderSsh());
  }
```

- [ ] **Step 3: Verify the build typechecks**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Manual verification**

Run the dev server in one terminal: `npm run dev`
In another terminal:

```bash
curl -s -A 'curl/8.0' http://localhost:4321/ssh
curl -s -A 'curl/8.0' -o /dev/null -w '%{http_code}\n' http://localhost:4321/ssh
curl -s -A 'Mozilla/5.0' -o /dev/null -w '%{http_code}\n' http://localhost:4321/ssh
```

Expected: first command prints the fake SSH session with cat art; second prints `200`; third prints `404` (browsers get the normal 404). Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: route /ssh to the renderSsh easter egg for terminal clients"
```

---

## Task 4: Create the `CornerOrnaments` component

**Files:**
- Create: `src/components/CornerOrnaments.astro`

- [ ] **Step 1: Create the component**

Create `src/components/CornerOrnaments.astro` with this exact content:

```astro
---
// Decorative ASCII corner ornaments for the homepage top corners. Purely
// visual: aria-hidden and pointer-events:none so they never affect layout,
// selection, or screen readers. The strokes "draw in" once on load via a
// CSS-only clip-path wipe (no JS, so the strict CSP is untouched).
---
<div class="corner-ornament corner-tl" aria-hidden="true">{`┌──\n│`}</div>
<div class="corner-ornament corner-tr" aria-hidden="true">{`──┐\n  │`}</div>

<style>
  .corner-ornament {
    position: absolute;
    top: 0;
    font-family: "Roboto Mono", "JetBrains Mono", "Fira Code", monospace;
    font-size: 1rem;
    line-height: 1.1;
    color: var(--accent);
    opacity: 0.4;
    white-space: pre;
    pointer-events: none;
    user-select: none;
  }

  .corner-tl {
    left: 0;
    animation: draw-in-left 0.7s ease-out both;
  }

  .corner-tr {
    right: 0;
    text-align: right;
    animation: draw-in-right 0.7s ease-out both;
  }

  @keyframes draw-in-left {
    from { clip-path: inset(0 100% 0 0); }
    to   { clip-path: inset(0 0 0 0); }
  }

  @keyframes draw-in-right {
    from { clip-path: inset(0 0 0 100%); }
    to   { clip-path: inset(0 0 0 0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .corner-ornament {
      animation: none;
      clip-path: none;
    }
  }
</style>
```

- [ ] **Step 2: Verify the build compiles the component**

A standalone `.astro` component is not exercised until something imports it.
Verification happens in Task 5 after it is wired into the homepage. No commit
yet — commit together with Task 5.

---

## Task 5: Add corner ornaments to the homepage

**Files:**
- Modify: `src/pages/index.astro` (frontmatter import, markup wrapper, `<style>`)

- [ ] **Step 1: Import the component**

In `src/pages/index.astro`, the frontmatter currently is:

```astro
---
import Page from '../layouts/Page.astro';
import TerminalFrame from '../components/TerminalFrame.astro';
---
```

Add the import:

```astro
---
import Page from '../layouts/Page.astro';
import TerminalFrame from '../components/TerminalFrame.astro';
import CornerOrnaments from '../components/CornerOrnaments.astro';
---
```

- [ ] **Step 2: Wrap the homepage content and add the ornaments**

In `src/pages/index.astro`, the body currently opens with `<Page title="Home" path="/">` directly followed by `<section class="hero">`. Wrap all of `<Page>`'s children in a `<div class="home-main">` and place `<CornerOrnaments />` as its first child.

Change the opening — from:

```astro
<Page title="Home" path="/">
  <section class="hero">
```

to:

```astro
<Page title="Home" path="/">
  <div class="home-main">
    <CornerOrnaments />
    <section class="hero">
```

And change the closing — from:

```astro
  </section>
</Page>
```

to (add the extra `</div>` closing `home-main`):

```astro
  </section>
  </div>
</Page>
```

Note: the existing final `</section>` is the close of `curl-easter-egg`. Only add one `</div>` immediately before `</Page>`.

- [ ] **Step 3: Add the `home-main` style**

In the first `<style>` block of `src/pages/index.astro`, add this rule (anywhere in the block — e.g. just before `.hero`):

```css
  .home-main {
    position: relative;
  }
```

This makes `.home-main` the positioning context for the absolutely-positioned ornaments, so they anchor to the top corners of the homepage content.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds with no errors — this also confirms `CornerOrnaments.astro` (Task 4) compiles.

- [ ] **Step 5: Manual verification**

Run `npm run dev` and open `http://localhost:4321/` in a browser. Expected:
two faint accent-colored box-drawing ornaments in the top-left and top-right
corners of the homepage content; they wipe in on load and do not overlap or
obscure the breadcrumb or palette toggle. Stop the dev server afterward.

- [ ] **Step 6: Commit**

```bash
git add src/components/CornerOrnaments.astro src/pages/index.astro
git commit -m "feat: add animated ASCII corner ornaments to the homepage"
```

---

## Task 6: Install OG dependencies and bundle fonts

**Files:**
- Modify: `package.json` (`devDependencies`)
- Create: `src/assets/fonts/RobotoMono-Regular.ttf`
- Create: `src/assets/fonts/RobotoMono-Bold.ttf`

- [ ] **Step 1: Install the build-only dependencies**

```bash
npm install --save-dev satori @resvg/resvg-js
```

Expected: both packages added to `devDependencies` in `package.json`. They are
build-only — the prerendered endpoint (Task 7) runs at `astro build` time and
is excluded from the edge server bundle, so the native `@resvg/resvg-js` binary
never reaches the Vercel edge runtime.

- [ ] **Step 2: Download the Roboto Mono fonts**

```bash
mkdir -p src/assets/fonts
curl -L -o src/assets/fonts/RobotoMono-Regular.ttf \
  https://github.com/googlefonts/RobotoMono/raw/main/fonts/ttf/RobotoMono-Regular.ttf
curl -L -o src/assets/fonts/RobotoMono-Bold.ttf \
  https://github.com/googlefonts/RobotoMono/raw/main/fonts/ttf/RobotoMono-Bold.ttf
```

- [ ] **Step 3: Verify the fonts downloaded correctly**

Run: `file src/assets/fonts/RobotoMono-Regular.ttf src/assets/fonts/RobotoMono-Bold.ttf`
Expected: both reported as TrueType/OpenType font data (not HTML/text — a failed
download would produce a small HTML error page). Also check the sizes are
plausible (each font is ~80–120 KB):

Run: `ls -l src/assets/fonts/`
Expected: two `.ttf` files, each well over 10 KB.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/assets/fonts/
git commit -m "build: add satori, resvg, and Roboto Mono fonts for OG images"
```

---

## Task 7: Build the OG image template

**Files:**
- Create: `src/lib/og-template.ts`
- Test: `tests/lib/og-template.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/og-template.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildOgTree } from '../../src/lib/og-template';

// Recursively collect every string found in a satori node tree, so tests can
// assert on rendered text without depending on the tree's exact shape.
function collectText(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return props ? collectText(props.children) : [];
  }
  return [];
}

describe('buildOgTree', () => {
  const data = {
    title: 'The curl overhaul',
    date: '2026-05-10',
    tags: ['astro', 'ansi'],
    slug: 'curl-overhaul',
  };

  it('includes the post title', () => {
    expect(collectText(buildOgTree(data)).join(' ')).toContain('The curl overhaul');
  });

  it('includes the date', () => {
    expect(collectText(buildOgTree(data)).join(' ')).toContain('2026-05-10');
  });

  it('includes every tag, hash-prefixed', () => {
    const text = collectText(buildOgTree(data)).join(' ');
    expect(text).toContain('#astro');
    expect(text).toContain('#ansi');
  });

  it('shows a cat-the-file prompt line with the slug', () => {
    expect(collectText(buildOgTree(data)).join(' ')).toContain('$ cat curl-overhaul.md');
  });

  it('includes the site name', () => {
    expect(collectText(buildOgTree(data)).join(' ')).toContain('lsalik.dev');
  });

  it('returns a single root element', () => {
    const tree = buildOgTree(data);
    expect(tree).toHaveProperty('type');
    expect(tree).toHaveProperty('props');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/og-template.test.ts`
Expected: FAIL — `src/lib/og-template.ts` does not exist.

- [ ] **Step 3: Implement the template**

Create `src/lib/og-template.ts`:

```ts
// Build-time Open Graph card for blog posts. Returns a Satori-compatible node
// tree (plain { type, props } objects — Satori accepts these directly, no JSX
// required). Styled as a terminal window: titlebar with traffic-light dots,
// body with a shell prompt, the post title, a rule, and a date/tags meta line.
//
// Pure and dependency-free so it can be unit-tested without Satori or fonts.

export interface OgData {
  readonly title: string;
  readonly date: string;
  readonly tags: readonly string[];
  readonly slug: string;
}

interface OgNode {
  readonly type: string;
  readonly props: {
    readonly style: Record<string, unknown>;
    readonly children?: unknown;
  };
}

const C = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  fg: '#e6edf3',
  muted: '#8b949e',
  green: '#3fb950',
  red: '#ff5f56',
  yellow: '#ffbd2e',
  brightGreen: '#27c93f',
} as const;

const FONT = 'Roboto Mono';

function el(
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
): OgNode {
  return { type, props: { style, children } };
}

function dot(color: string): OgNode {
  return el('div', {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color,
  });
}

export function buildOgTree(data: OgData): OgNode {
  const metaLine = `${data.date}    ${data.tags.map(t => `#${t}`).join('  ')}`;

  const titleBar = el(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      height: 72,
      paddingLeft: 32,
      paddingRight: 32,
      backgroundColor: C.surface,
      borderBottom: `2px solid ${C.border}`,
    },
    [
      el(
        'div',
        { display: 'flex', alignItems: 'center', gap: 14 },
        [dot(C.red), dot(C.yellow), dot(C.brightGreen)],
      ),
      el(
        'div',
        {
          display: 'flex',
          marginLeft: 28,
          fontSize: 28,
          color: C.muted,
        },
        'lsalik.dev',
      ),
    ],
  );

  const body = el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      justifyContent: 'center',
      padding: 72,
    },
    [
      el(
        'div',
        { display: 'flex', fontSize: 32, color: C.green, marginBottom: 28 },
        `$ cat ${data.slug}.md`,
      ),
      el(
        'div',
        {
          display: 'flex',
          fontSize: 68,
          fontWeight: 700,
          color: C.fg,
          lineHeight: 1.15,
        },
        data.title,
      ),
      el('div', {
        display: 'flex',
        height: 2,
        backgroundColor: C.border,
        marginTop: 32,
        marginBottom: 32,
      }),
      el(
        'div',
        { display: 'flex', fontSize: 30, color: C.muted },
        metaLine,
      ),
    ],
  );

  return el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      width: 1200,
      height: 630,
      backgroundColor: C.bg,
      color: C.fg,
      fontFamily: FONT,
    },
    [titleBar, body],
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/og-template.test.ts`
Expected: PASS — all six `buildOgTree` tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/og-template.ts tests/lib/og-template.test.ts
git commit -m "feat(og): add terminal-window OG card template builder"
```

---

## Task 8: Create the prerendered OG image endpoint

**Files:**
- Create: `src/pages/og/[slug].png.ts`

This endpoint imports `astro:content` and runs `satori` + `resvg`, so it is
verified by build (Task 10), not a unit test.

- [ ] **Step 1: Create the endpoint**

Create `src/pages/og/[slug].png.ts`:

```ts
// Build-time Open Graph image endpoint. `prerender = true` makes Astro execute
// this during `astro build` and emit one static PNG per blog post — the native
// `@resvg/resvg-js` binary runs in Node at build time and never ships to the
// Vercel edge runtime. Output: /og/<slug>.png.

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { buildOgTree } from '../../lib/og-template';

export const prerender = true;

const fontDir = new URL('../../assets/fonts/', import.meta.url);
const fontRegular = readFileSync(fileURLToPath(new URL('RobotoMono-Regular.ttf', fontDir)));
const fontBold = readFileSync(fileURLToPath(new URL('RobotoMono-Bold.ttf', fontDir)));

interface OgProps {
  title: string;
  date: string;
  tags: string[];
  slug: string;
}

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map(post => ({
    params: { slug: post.id },
    props: {
      title: post.data.title,
      date: post.data.date.toISOString().slice(0, 10),
      tags: post.data.tags,
      slug: post.id,
    } satisfies OgProps,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, date, tags, slug } = props as OgProps;

  const svg = await satori(buildOgTree({ title, date, tags, slug }) as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Roboto Mono', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Roboto Mono', data: fontBold, weight: 700, style: 'normal' },
    ],
  });

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  }).render().asPng();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
```

- [ ] **Step 2: Verify the build generates the images**

Run: `npm run build`
Expected: build succeeds. The build log shows the `/og/[slug].png` route being
prerendered once per non-draft blog post.

- [ ] **Step 3: Confirm the PNGs exist**

Run: `find .vercel dist -path '*og*' -name '*.png' 2>/dev/null`
Expected: one `.png` file per non-draft blog post (6 posts currently — confirm
the count matches `ls src/content/blog/`). If `find` prints nothing, inspect the
build output directory with `find .vercel dist -name '*.png' 2>/dev/null` and
adjust the path.

- [ ] **Step 4: Spot-check one image**

Open one generated PNG (e.g. via `xdg-open` or by viewing the file) and confirm
it shows the terminal-window card: titlebar with three dots + `lsalik.dev`,
a green `$ cat <slug>.md` line, the post title, a rule, and the date/tags line.

- [ ] **Step 5: Commit**

```bash
git add src/pages/og/
git commit -m "feat(og): prerendered per-post OG image endpoint"
```

---

## Task 9: Wire OG meta tags into blog post pages

**Files:**
- Modify: `src/layouts/Base.astro` (add a `head` named slot)
- Modify: `src/layouts/Page.astro` (forward the `head` slot)
- Modify: `src/pages/blog/[...slug].astro` (frontmatter import + `head` slot content)

- [ ] **Step 1: Add a `head` slot to `Base.astro`**

In `src/layouts/Base.astro`, inside `<head>`, add `<slot name="head" />` immediately before `<ClientRouter />`. The `<head>` section becomes:

```astro
  <link rel="alternate" type="application/rss+xml" title="lsalik.dev blog" href="/rss.xml" />
  <title>lsalik.dev</title>
  {/* Apply the saved palette before first paint so there's no flash.
      Must be an inline head script, not a module import. */}
  <script is:inline>
    (function () {
      try {
        var saved = localStorage.getItem('palette');
        if (saved) document.documentElement.dataset.palette = saved;
      } catch (_) {}
    })();
  </script>
  <slot name="head" />
  <ClientRouter />
</head>
```

- [ ] **Step 2: Forward the `head` slot through `Page.astro`**

In `src/layouts/Page.astro`, the body currently opens with `<Base title={title}>` directly followed by `<div class="page-container">`. Add the slot-forwarding line as the first child of `<Base>`:

```astro
<Base title={title}>
  <slot name="head" slot="head" />
  <div class="page-container">
```

(Leave the rest of `Page.astro` unchanged.)

- [ ] **Step 3: Add the OG meta tags to the blog post page**

In `src/pages/blog/[...slug].astro`, add the `SITE_URL` import to the frontmatter. The frontmatter currently imports:

```ts
import { getCollection, render } from 'astro:content';
import Page from '../../layouts/Page.astro';
import TerminalFrame from '../../components/TerminalFrame.astro';
import { readingTime } from '../../lib/reading-time';
import '../../styles/prose.css';
```

Add:

```ts
import { SITE_URL } from '../../lib/site';
```

Then, in the markup, add a `head`-slotted `<Fragment>` as the first child of `<Page>`. The markup currently opens:

```astro
<Page title={post.data.title} path="/blog">
  <TerminalFrame title={`cat ~/blog/${post.id}.md`}>
```

Change it to:

```astro
<Page title={post.data.title} path="/blog">
  <Fragment slot="head">
    <meta property="og:title" content={post.data.title} />
    <meta property="og:description" content={post.data.description} />
    <meta property="og:type" content="article" />
    <meta property="og:image" content={`${SITE_URL}/og/${post.id}.png`} />
    <meta name="twitter:card" content="summary_large_image" />
  </Fragment>
  <TerminalFrame title={`cat ~/blog/${post.id}.md`}>
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open any blog post (e.g. `http://localhost:4321/blog/curl-overhaul/`), and view page source. Expected: the `<head>` contains the five OG/Twitter meta tags, with `og:image` pointing at `https://lsalik.dev/og/curl-overhaul.png`. Confirm a non-blog page (e.g. the homepage) does NOT contain these tags. Stop the dev server afterward.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Base.astro src/layouts/Page.astro src/pages/blog/[...slug].astro
git commit -m "feat(og): emit per-post OG meta tags via a head slot"
```

---

## Task 10: Final full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new `box`, `renderSsh`, and
`buildOgTree` tests.

- [ ] **Step 2: Run a clean production build**

Run: `npm run build`
Expected: build succeeds; the `/og/[slug].png` route is prerendered once per
non-draft blog post; no TypeScript errors.

- [ ] **Step 3: Smoke-test the running site**

Run `npm run preview` (serves the production build) and verify:

```bash
curl -s -A 'curl/8.0' http://localhost:4321/ssh | head -5
curl -s -A 'curl/8.0' -o /dev/null -w 'ssh curl: %{http_code}\n' http://localhost:4321/ssh
curl -s -o /dev/null -w 'og png: %{http_code} %{content_type}\n' http://localhost:4321/og/curl-overhaul.png
```

Expected: the SSH session renders for the curl client; `/ssh` returns `200` for
curl; `/og/curl-overhaul.png` returns `200` with content-type `image/png`.

Then open `http://localhost:4321/` in a browser and confirm the corner
ornaments animate in. Stop the preview server afterward.

- [ ] **Step 4: Update the README**

In `README.md`, under `## Future plans`, remove the three completed items
(`add logo/images`, `curl -L lsalik.dev/ssh easter egg`, `OG image generation
per post`). Leave the remaining items (`blog pagination`, `live projects github
stats`, `ASCII background reacting to cursor/scroll`, `add different
animations`).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: drop shipped items from the future-plans list"
```

---

## Self-review notes

- **Spec coverage:** Feature 1 → Tasks 1–3; Feature 2 → Tasks 4–5; Feature 3 →
  Tasks 6–9; final verification → Task 10. All three spec features covered.
- **Spec deviations:** (a) The spec's planned middleware unit test for `/ssh` is
  replaced with build + manual curl verification, because `src/middleware.ts`
  imports `astro:` virtual modules and cannot be unit-imported (consistent with
  the existing `tests/middleware.test.ts`, which replicates regexes instead of
  importing the module). (b) The spec's "light component test" for
  `CornerOrnaments` is replaced with build + manual verification, because the
  project has no `.astro` component test harness (Vitest here only runs `.ts`
  files; testing `.astro` would require adding Astro's Vite config). (c) Task 1
  adds a `wrap: false` option to `box()` — not in the spec, but required: `box()`
  strips leading whitespace, which would destroy the cat ASCII art. This is a
  targeted fix for code being used by the feature, not unrelated refactoring.
- **Type consistency:** `renderSsh` (no args, returns `string`) is consistent
  across Tasks 2 and 3. `buildOgTree(OgData)` and the `OgData` shape
  (`title`, `date`, `tags`, `slug`) are consistent across Tasks 7 and 8.
- **No placeholders:** every step contains the actual code or command.
