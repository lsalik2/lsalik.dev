# OG Image Generation + Blog Image Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship per-entry OpenGraph image generation for the `blog` and `projects` content collections (with a shared static fallback for other pages), wire matching `og:*`/`twitter:*` meta tags into the layout, and fix the broken markdown image in `hello-world.md`.

**Architecture:** A custom Astro integration hooks into `astro:build:done`, iterates each collection, and renders one 1200×630 PNG per entry to `dist/og/<kind>/<slug>.png` using Satori + `@resvg/resvg-js`. PNGs ship as static assets served by Vercel's static layer — no edge function ever touches them. A new `<Seo />` component emits the meta tags from layout props. Each blog/project page passes its per-entry image path; static pages fall back to a committed `public/og/default.png`.

**Tech Stack:** Astro 6 (SSR, edge adapter), TypeScript, Satori (JSX-to-SVG), @resvg/resvg-js (SVG-to-PNG), Vitest.

**Spec:** [`docs/superpowers/specs/2026-05-25-og-images-and-blog-image-fix-design.md`](../specs/2026-05-25-og-images-and-blog-image-fix-design.md)

---

## Notes for the implementing engineer

- The project uses `output: 'server'` with `@astrojs/vercel` on the **edge** runtime. Anything that runs at request time must avoid Node built-ins. Build-time code (this plan's integration + script) runs on regular Node during `astro build` — full Node API is fine there.
- `passthroughImageService()` is set in `astro.config.mjs` because Sharp breaks the edge bundle. Don't replace it; the OG images we generate are flat PNGs, not Astro-processed images.
- Per the user's global `CLAUDE.md`: never add `Co-Authored-By: Claude` (or any AI co-author) trailers to commit messages.
- The branch `feat/og-images-and-blog-image-fix` already exists with the design doc committed. Work on this branch.
- Satori accepts either React JSX or a plain element-tree object (`{type, props: {style, children}}`). This project has no React. **Use the plain-object form** — `template.ts`, not `.tsx`. No React, no jsx-runtime, no tsconfig changes.

---

## Task 1: Install dependencies and set site URL

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Install Satori and resvg**

Run:
```bash
npm install --save-dev satori @resvg/resvg-js
```

Expected: both packages added to `devDependencies` in `package.json`. They are dev-only — the integration runs at build time, never at runtime in the edge bundle.

- [ ] **Step 2: Set the canonical site URL in Astro config**

Edit `astro.config.mjs`. Current content:

```js
import { defineConfig, passthroughImageService } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  image: {
    service: passthroughImageService(),
  },
  adapter: vercel({
    // edgeMiddleware: true,
  }),
});
```

Add a `site` field (do NOT touch anything else yet — the integration is registered in Task 4):

```js
import { defineConfig, passthroughImageService } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://lsalik.dev',
  output: 'server',
  image: {
    service: passthroughImageService(),
  },
  adapter: vercel({
    // edgeMiddleware: true,
  }),
});
```

This makes `Astro.site` resolve at build time so the Seo component can emit absolute URLs.

- [ ] **Step 3: Verify the build still works**

Run:
```bash
npm run build
```

Expected: exits 0, builds normally. No new functionality yet — this is a baseline.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json astro.config.mjs
git commit -m "feat(og): install satori/resvg, set canonical site URL"
```

---

## Task 2: Download Roboto Mono TTFs for Satori

**Files:**
- Create: `src/lib/og/fonts/RobotoMono-Regular.ttf`
- Create: `src/lib/og/fonts/RobotoMono-Bold.ttf`
- Create: `src/lib/og/fonts/README.md`

`public/fonts/roboto-mono/` only ships `.woff2` (verified). Satori accepts only TTF/OTF. We need TTFs committed to the repo so the build is hermetic — no fetching at build time.

- [ ] **Step 1: Create the fonts directory**

Run:
```bash
mkdir -p src/lib/og/fonts
```

- [ ] **Step 2: Download the two TTF weights**

Run:
```bash
curl -L -o src/lib/og/fonts/RobotoMono-Regular.ttf \
  https://github.com/googlefonts/RobotoMono/raw/main/fonts/ttf/RobotoMono-Regular.ttf
curl -L -o src/lib/og/fonts/RobotoMono-Bold.ttf \
  https://github.com/googlefonts/RobotoMono/raw/main/fonts/ttf/RobotoMono-Bold.ttf
```

Expected: two files, each > 50 KB. Verify with:
```bash
ls -la src/lib/og/fonts/
file src/lib/og/fonts/RobotoMono-Regular.ttf
```

The `file` command should report `TrueType Font data`. If either curl fails or returns an HTML page, the URL has moved — find the current Google Fonts TTF source and re-download.

- [ ] **Step 3: Write a brief README**

Create `src/lib/og/fonts/README.md`:

```markdown
# OG image fonts

TTF copies of Roboto Mono Regular + Bold used by Satori for OG image generation.

Satori does not accept woff2 (the format shipped under `public/fonts/roboto-mono/` for browser delivery). These files are build-only — they are never served to clients.

Source: https://github.com/googlefonts/RobotoMono
License: Apache-2.0
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/og/fonts/
git commit -m "feat(og): vendor Roboto Mono TTFs for Satori (build-only)"
```

---

## Task 3: Build the OG template (pure function returning Satori tree)

**Files:**
- Create: `src/lib/og/template.ts`
- Test: `src/lib/og/template.test.ts`

The template is a pure function. Given `{kind, slug, title, meta}` it returns a Satori-compatible element tree (plain object, not JSX). Easy to unit-test by walking the tree.

- [ ] **Step 1: Write the failing test**

Create `src/lib/og/template.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { OgTemplate } from './template';

// Walk the element tree and collect every string child (depth-first).
// Satori trees are nested {type, props: {children}} objects; children can be
// a string, an element, or an array of either.
function collectText(node: unknown): string[] {
  if (node == null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (typeof node === 'object' && 'props' in (node as any)) {
    return collectText((node as any).props.children);
  }
  return [];
}

describe('OgTemplate', () => {
  it('includes the titlebar path for blog posts', () => {
    const tree = OgTemplate({
      kind: 'blog',
      slug: 'hello-world',
      title: 'Hello, World!',
      meta: '2026-04-09 · meta, webdev · 1 min read',
    });
    const text = collectText(tree).join(' ');
    expect(text).toContain('cat ~/blog/hello-world.md');
  });

  it('includes the titlebar path for project entries', () => {
    const tree = OgTemplate({
      kind: 'project',
      slug: 'lsalik-dev',
      title: 'lsalik.dev',
      meta: 'live · Astro, TypeScript',
    });
    const text = collectText(tree).join(' ');
    expect(text).toContain('cat ~/projects/lsalik-dev.md');
  });

  it('includes the title and meta text', () => {
    const tree = OgTemplate({
      kind: 'blog',
      slug: 'x',
      title: 'A Specific Title',
      meta: 'some meta line',
    });
    const text = collectText(tree).join(' ');
    expect(text).toContain('A Specific Title');
    expect(text).toContain('some meta line');
    expect(text).toContain('lsalik.dev');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/og/template.test.ts
```

Expected: FAIL — `Cannot find module './template'` or similar.

- [ ] **Step 3: Implement the template**

Create `src/lib/og/template.ts`:

```typescript
// Plain-object Satori tree (no JSX). Satori accepts the same shape React produces.
// Colors hard-coded from the `dark-terminal` palette in src/styles/global.css to
// keep build-time rendering self-contained (no CSS variable resolution at build).

export type OgKind = 'blog' | 'project';

export interface OgTemplateProps {
  kind: OgKind;
  slug: string;
  title: string;
  meta: string;
}

const COLORS = {
  bg: '#0b0c0e',
  fg: '#e6e6e6',
  fgMuted: '#8a8a8a',
  accent: '#f5b041',
  border: '#2a2c30',
};

// Satori expects a plain element object: {type, props: {style, children}}.
// `key` is optional and only matters for list reconciliation, which we don't use.
function el(type: string, props: Record<string, unknown>) {
  return { type, props };
}

export function OgTemplate({ kind, slug, title, meta }: OgTemplateProps) {
  const titlebar = `── cat ~/${kind === 'blog' ? 'blog' : 'projects'}/${slug}.md ──`;

  return el('div', {
    style: {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: COLORS.bg,
      color: COLORS.fg,
      fontFamily: 'Roboto Mono',
      padding: '40px',
    },
    children: [
      // Outer terminal frame
      el('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '4px',
          overflow: 'hidden',
        },
        children: [
          // Titlebar
          el('div', {
            style: {
              padding: '18px 28px',
              borderBottom: `1px solid ${COLORS.border}`,
              backgroundColor: '#15171a',
              color: COLORS.fgMuted,
              fontSize: '28px',
            },
            children: titlebar,
          }),
          // Body
          el('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '60px 56px',
              gap: '32px',
            },
            children: [
              el('div', {
                style: {
                  fontSize: '64px',
                  fontWeight: 700,
                  color: COLORS.fg,
                  lineHeight: 1.15,
                  // Clamp to 3 lines — Satori supports lineClamp via this property.
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                },
                children: title,
              }),
              el('div', {
                style: {
                  fontSize: '28px',
                  color: COLORS.fgMuted,
                },
                children: meta,
              }),
            ],
          }),
          // Footer wordmark
          el('div', {
            style: {
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '18px 28px',
              borderTop: `1px solid ${COLORS.border}`,
              color: COLORS.accent,
              fontSize: '24px',
            },
            children: 'lsalik.dev',
          }),
        ],
      }),
    ],
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/og/template.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/og/template.ts src/lib/og/template.test.ts
git commit -m "feat(og): add Satori template (terminal-frame aesthetic)"
```

---

## Task 4: Build the PNG renderer

**Files:**
- Create: `src/lib/og/render.ts`
- Test: `src/lib/og/render.test.ts`

`renderOgPng` is the only function the integration needs. It loads fonts once (module-scope cache), calls Satori, then pipes the SVG through resvg.

- [ ] **Step 1: Write the failing test**

Create `src/lib/og/render.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderOgPng } from './render';

// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('renderOgPng', () => {
  it('produces a PNG buffer for a blog entry', async () => {
    const buf = await renderOgPng({
      kind: 'blog',
      slug: 'hello-world',
      title: 'Hello, World!',
      meta: '2026-04-09 · meta, webdev · 1 min read',
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
    // A reasonable lower bound — empty/all-transparent renders are typically <1 KB.
    expect(buf.length).toBeGreaterThan(1024);
  }, 15_000);

  it('handles a 200-character title without throwing', async () => {
    const longTitle = 'x'.repeat(200);
    const buf = await renderOgPng({
      kind: 'blog',
      slug: 'long',
      title: longTitle,
      meta: 'some meta',
    });
    expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
  }, 15_000);

  it('handles an empty meta line without throwing', async () => {
    const buf = await renderOgPng({
      kind: 'project',
      slug: 'p',
      title: 'A Project',
      meta: '',
    });
    expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
  }, 15_000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/og/render.test.ts
```

Expected: FAIL — `Cannot find module './render'`.

- [ ] **Step 3: Implement the renderer**

Create `src/lib/og/render.ts`:

```typescript
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { OgTemplate, type OgTemplateProps } from './template';

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fonts');

// Loaded once per process, reused for every render.
let fontCache: Array<{
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
}> | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const [regular, bold] = await Promise.all([
    readFile(join(FONT_DIR, 'RobotoMono-Regular.ttf')),
    readFile(join(FONT_DIR, 'RobotoMono-Bold.ttf')),
  ]);
  fontCache = [
    { name: 'Roboto Mono', data: regular, weight: 400, style: 'normal' },
    { name: 'Roboto Mono', data: bold, weight: 700, style: 'normal' },
  ];
  return fontCache;
}

export async function renderOgPng(props: OgTemplateProps): Promise<Buffer> {
  const fonts = await loadFonts();
  // Satori's types want React.ReactNode; our plain-object tree is structurally
  // compatible. Cast at the boundary to keep the rest of our code React-free.
  const svg = await satori(OgTemplate(props) as never, {
    width: 1200,
    height: 630,
    fonts,
  });
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  })
    .render()
    .asPng();
  return Buffer.from(png);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/og/render.test.ts
```

Expected: 3 tests pass. First test may take a few seconds (font load + render).

- [ ] **Step 5: Commit**

```bash
git add src/lib/og/render.ts src/lib/og/render.test.ts
git commit -m "feat(og): add Satori+resvg PNG renderer"
```

---

## Task 5: Build the Astro integration

**Files:**
- Create: `src/integrations/og-images.ts`
- Test: `tests/og-build.test.ts`
- Modify: `astro.config.mjs`

The integration exposes a `generateOgImages({ outDir })` function plus an Astro integration wrapper. Splitting the generation logic out makes it testable without invoking the full `astro build`.

- [ ] **Step 1: Write the failing integration test**

Create `tests/og-build.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateOgImages } from '../src/integrations/og-images';

// PNG magic bytes
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('generateOgImages', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'og-build-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes one PNG per non-draft blog entry', async () => {
    const result = await generateOgImages({
      outDir: tmpDir,
      // Fixture entries injected directly; production uses getCollection().
      entries: [
        { kind: 'blog', slug: 'post-a', title: 'Post A', meta: '2026-01-01 · a · 1 min read' },
        { kind: 'blog', slug: 'post-b', title: 'Post B', meta: '2026-01-02 · b · 2 min read' },
        { kind: 'project', slug: 'proj-x', title: 'Project X', meta: 'live · TS' },
      ],
    });

    expect(result.generated).toBe(3);
    expect(result.failed).toBe(0);

    const blogPng = await readFile(join(tmpDir, 'og', 'blog', 'post-a.png'));
    expect(blogPng.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
    expect(blogPng.length).toBeGreaterThan(1024);

    const projPng = await stat(join(tmpDir, 'og', 'projects', 'proj-x.png'));
    expect(projPng.size).toBeGreaterThan(1024);

    const blogFiles = await readdir(join(tmpDir, 'og', 'blog'));
    expect(blogFiles.sort()).toEqual(['post-a.png', 'post-b.png']);
  }, 30_000);

  it('skips failing entries without aborting the whole run', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await generateOgImages({
        outDir: tmpDir,
        entries: [
          { kind: 'blog', slug: 'good', title: 'Good', meta: 'ok' },
          // Force a failure by passing a slug containing a path separator —
          // the integration must reject it rather than escaping the outDir.
          { kind: 'blog', slug: '../escape', title: 'Bad', meta: 'no' },
          { kind: 'blog', slug: 'also-good', title: 'Also Good', meta: 'ok' },
        ],
      });

      expect(result.generated).toBe(2);
      expect(result.failed).toBe(1);
      expect(warn).toHaveBeenCalled();
      const warnMsg = warn.mock.calls.map(c => c.join(' ')).join('\n');
      expect(warnMsg).toContain('[og-images]');
      expect(warnMsg).toContain('../escape');
    } finally {
      warn.mockRestore();
    }
  }, 30_000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/og-build.test.ts
```

Expected: FAIL — `Cannot find module '../src/integrations/og-images'`.

- [ ] **Step 3: Implement the integration module**

Create `src/integrations/og-images.ts`:

```typescript
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { AstroIntegration } from 'astro';
import { renderOgPng } from '../lib/og/render';
import type { OgKind, OgTemplateProps } from '../lib/og/template';

export type OgEntry = OgTemplateProps;

export interface GenerateOptions {
  outDir: string;
  entries: OgEntry[];
}

export interface GenerateResult {
  generated: number;
  failed: number;
}

// kind → output subdirectory under `<outDir>/og/`.
const SUBDIR: Record<OgKind, string> = {
  blog: 'blog',
  project: 'projects',
};

// Reject slugs that would escape the output directory. Allow nested slugs
// (Astro's glob loader emits `sub/post` for `src/content/blog/sub/post.md`)
// but block traversal, absolute, and hidden patterns.
function isSafeSlug(slug: string): boolean {
  if (!slug) return false;
  if (slug.includes('..')) return false;
  if (slug.startsWith('/') || slug.startsWith('.')) return false;
  return /^[a-z0-9][a-z0-9/-]*$/.test(slug);
}

export async function generateOgImages(opts: GenerateOptions): Promise<GenerateResult> {
  let generated = 0;
  let failed = 0;
  for (const entry of opts.entries) {
    try {
      if (!isSafeSlug(entry.slug)) {
        throw new Error(`unsafe slug: ${entry.slug}`);
      }
      const dir = join(opts.outDir, 'og', SUBDIR[entry.kind]);
      await mkdir(dir, { recursive: true });
      const buf = await renderOgPng(entry);
      await writeFile(join(dir, `${entry.slug}.png`), buf);
      generated++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[og-images] failed: ${entry.kind}/${entry.slug}: ${msg}`);
    }
  }
  return { generated, failed };
}

// Build the meta line for each entry kind from frontmatter.
// Imports kept inside the integration factory so test code can import
// generateOgImages without pulling astro:content (which only resolves inside a build).
function formatBlogMeta(data: { date: Date; tags: string[] }, body: string): string {
  const date = data.date.toISOString().slice(0, 10);
  const tags = data.tags.join(', ');
  // Reading time: ~200 wpm; min 1.
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${date} · ${tags} · ${minutes} min read`;
}

function formatProjectMeta(data: { status: string; stack: string[] }): string {
  return `${data.status} · ${data.stack.join(', ')}`;
}

export default function ogImagesIntegration(): AstroIntegration {
  return {
    name: 'og-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        // Imported lazily — `astro:content` is only valid inside the build context.
        const { getCollection } = await import('astro:content');
        const blog = await getCollection('blog', e => !e.data.draft);
        const projects = await getCollection('projects');

        const entries: OgEntry[] = [
          ...blog.map(e => ({
            kind: 'blog' as const,
            slug: e.id,
            title: e.data.title,
            meta: formatBlogMeta(e.data, e.body ?? ''),
          })),
          ...projects.map(e => ({
            kind: 'project' as const,
            slug: e.id,
            title: e.data.title,
            meta: formatProjectMeta(e.data),
          })),
        ];

        const outDir = fileURLToPath(dir);
        const result = await generateOgImages({ outDir, entries });

        logger.info(
          `generated ${result.generated} OG image(s); ${result.failed} failed`,
        );
      },
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/og-build.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Register the integration in Astro config**

Edit `astro.config.mjs` to import and register the integration:

```js
import { defineConfig, passthroughImageService } from 'astro/config';
import vercel from '@astrojs/vercel';
import ogImages from './src/integrations/og-images.ts';

export default defineConfig({
  site: 'https://lsalik.dev',
  output: 'server',
  image: {
    service: passthroughImageService(),
  },
  integrations: [ogImages()],
  adapter: vercel({
    // edgeMiddleware: true,
  }),
});
```

- [ ] **Step 6: Run a full build and verify OG images are produced**

Run:
```bash
npm run build
```

Expected: build succeeds. Logs include a line like `[og-images] generated N OG image(s); 0 failed`. Verify with:

```bash
ls dist/og/blog dist/og/projects
file dist/og/blog/hello-world.png
```

The `file` command should report `PNG image data, 1200 x 630`.

- [ ] **Step 7: Commit**

```bash
git add src/integrations/og-images.ts tests/og-build.test.ts astro.config.mjs
git commit -m "feat(og): build-time integration generates per-entry PNGs"
```

---

## Task 6: Generate and commit the default fallback OG image

**Files:**
- Create: `scripts/generate-default-og.mjs`
- Create: `public/og/default.png`

A one-off script. Run once locally, commit the PNG, never run again unless we change the template.

- [ ] **Step 1: Write the script**

Create `scripts/generate-default-og.mjs`:

```js
// One-off generator for the static fallback OG image used by pages
// without a per-entry image (homepage, /man, /uses, /contact, /404,
// /blog index, /projects index).
//
// Run with: node scripts/generate-default-og.mjs
// Commits the resulting public/og/default.png to git.

import { mkdir, writeFile } from 'node:fs/promises';
import { renderOgPng } from '../src/lib/og/render.ts';

const buf = await renderOgPng({
  kind: 'blog',
  slug: 'home',
  title: 'lsalik.dev',
  meta: 'personal site · blog · projects',
});

await mkdir('public/og', { recursive: true });
await writeFile('public/og/default.png', buf);
console.log(`wrote public/og/default.png (${buf.length} bytes)`);
```

Note: the `kind` here is `'blog'` rather than introducing a third kind. The titlebar will read `cat ~/blog/home.md` which is acceptable for a fallback; alternatively we could add a `'home'` kind to the template, but YAGNI — one fallback image, one line of titlebar text users will rarely focus on.

- [ ] **Step 2: Run the script**

This project's `package.json` has `"type": "module"` and the script imports a `.ts` file. Node 22 supports TypeScript imports natively when using the `--experimental-strip-types` flag, but the simpler portable option is to run via `vite-node` (already a transitive dep through Vitest) or just use Vitest's runner as a one-off:

Run:
```bash
npx vite-node scripts/generate-default-og.mjs
```

Expected: prints `wrote public/og/default.png (NNNNN bytes)`. If `vite-node` is unavailable, fall back to:

```bash
node --experimental-strip-types scripts/generate-default-og.mjs
```

- [ ] **Step 3: Verify the output**

Run:
```bash
file public/og/default.png
ls -la public/og/default.png
```

Expected: `PNG image data, 1200 x 630`, file size > 5 KB. Open the file in an image viewer to confirm it looks right (terminal frame with title `lsalik.dev`).

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-default-og.mjs public/og/default.png
git commit -m "feat(og): commit static fallback OG image for non-entry pages"
```

---

## Task 7: Build the Seo component

**Files:**
- Create: `src/components/Seo.astro`

Pure rendering — no logic worth unit-testing in isolation. Verification happens in the next task by viewing built HTML.

- [ ] **Step 1: Create the component**

Create `src/components/Seo.astro`:

```astro
---
interface Props {
  title: string;
  description: string;
  // Absolute or root-relative path; component resolves against Astro.site.
  image: string;
  // OpenGraph type. 'article' for blog posts and project entries, 'website' otherwise.
  type?: 'website' | 'article';
}

const { title, description, image, type = 'website' } = Astro.props;

// Astro.site is set to https://lsalik.dev in astro.config.mjs. Astro.url is the
// current request URL. Both are required for absolute URL construction.
const canonical = new URL(Astro.url.pathname, Astro.site).toString();
const absoluteImage = new URL(image, Astro.site).toString();
const siteName = 'lsalik.dev';
---
<!-- Canonical -->
<link rel="canonical" href={canonical} />

<!-- Standard meta -->
<meta name="description" content={description} />

<!-- OpenGraph -->
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={absoluteImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content={type} />
<meta property="og:url" content={canonical} />
<meta property="og:site_name" content={siteName} />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={absoluteImage} />
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Seo.astro
git commit -m "feat(og): add Seo component emitting og/twitter meta tags"
```

---

## Task 8: Wire Seo into Base and Page layouts

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `src/layouts/Page.astro`

`Base.astro` currently takes only `title`. Add optional `description` and `image` (defaulting to the fallback). `Page.astro` forwards them.

- [ ] **Step 1: Update Base.astro**

Edit `src/layouts/Base.astro`. Replace the frontmatter (`---` block at top) and the `<head>` so it imports and renders `<Seo />`. Current frontmatter:

```astro
---
import '../styles/global.css';
import { ClientRouter } from 'astro:transitions';

interface Props {
  title: string;
}

const { title } = Astro.props;
---
```

Replace with:

```astro
---
import '../styles/global.css';
import { ClientRouter } from 'astro:transitions';
import Seo from '../components/Seo.astro';

interface Props {
  title: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
}

const {
  title,
  description = 'Personal site of Luis Salik — engineer, writer, terminal enthusiast.',
  image = '/og/default.png',
  type = 'website',
} = Astro.props;
---
```

Then in the existing `<head>`, locate the line:

```astro
  <title>lsalik.dev</title>
```

Replace it with:

```astro
  <title>{title}</title>
  <Seo title={title} description={description} image={image} type={type} />
```

The `title` is now used dynamically. The `<Seo />` component handles the rest.

- [ ] **Step 2: Update Page.astro to forward the new props**

Edit `src/layouts/Page.astro`. Replace the frontmatter (lines 1–12). Current:

```astro
---
import Base from './Base.astro';
import Breadcrumb from '../components/Breadcrumb.astro';
import NavLinks from '../components/NavLinks.astro';
import PaletteToggle from '../components/PaletteToggle.astro';
interface Props {
  title: string;
  path: string;
}

const { title, path } = Astro.props;
---
<Base title={title}>
```

Replace with:

```astro
---
import Base from './Base.astro';
import Breadcrumb from '../components/Breadcrumb.astro';
import NavLinks from '../components/NavLinks.astro';
import PaletteToggle from '../components/PaletteToggle.astro';
interface Props {
  title: string;
  path: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
}

const { title, path, description, image, type } = Astro.props;
---
<Base title={title} description={description} image={image} type={type}>
```

Leave everything below that line untouched (page-container, header, slot, footer, styles).

- [ ] **Step 3: Build and verify a static page emits the meta tags**

Run:
```bash
npm run build
```

Then inspect any built static page's HTML — for example the 404 page (always pre-rendered) or use the dev server:

```bash
npm run dev
# In another terminal:
curl -s http://localhost:4321/ | grep -E 'og:|twitter:|description'
```

Expected output contains:
- `<meta name="description" content="Personal site of Luis Salik...">`
- `<meta property="og:image" content="https://lsalik.dev/og/default.png">`
- `<meta property="og:type" content="website">`
- `<meta name="twitter:card" content="summary_large_image">`

(`og:image` is absolute because `Astro.site` is set; `og:url` will reflect the dev host since `Astro.url` is request-derived.)

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Base.astro src/layouts/Page.astro
git commit -m "feat(og): wire Seo component into Base and Page layouts"
```

---

## Task 9: Wire blog post pages to use per-post OG images

**Files:**
- Modify: `src/pages/blog/[...slug].astro`

- [ ] **Step 1: Pass image/description/type to the layout**

Edit `src/pages/blog/[...slug].astro`. Locate the line (around line 24):

```astro
<Page title={post.data.title} path="/blog">
```

Replace with:

```astro
<Page
  title={post.data.title}
  path="/blog"
  description={post.data.description}
  image={`/og/blog/${post.id}.png`}
  type="article"
>
```

No other changes in this file.

- [ ] **Step 2: Build and verify a blog post emits its per-post OG URL**

Run:
```bash
npm run build
npm run dev
# In another terminal:
curl -s http://localhost:4321/blog/hello-world/ | grep -E 'og:image|og:type|description'
```

Expected:
- `<meta property="og:image" content="https://lsalik.dev/og/blog/hello-world.png">`
- `<meta property="og:type" content="article">`
- `<meta name="description" content="First post on lsalik.dev for testing purposes.">`

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/pages/blog/[...slug].astro
git commit -m "feat(og): blog posts emit per-post og:image"
```

---

## Task 10: Wire project pages to use per-entry OG images

**Files:**
- Modify: `src/pages/projects/[...slug].astro`

- [ ] **Step 1: Read the current file to see the prop pattern**

Run:
```bash
cat src/pages/projects/\[...slug\].astro
```

Look for the `<Page>` invocation. Note the variable name used for the project entry (probably `project` or `entry`).

- [ ] **Step 2: Pass image/description/type to the layout**

In `src/pages/projects/[...slug].astro`, locate the `<Page title={...}>` line and add the new props. Substituting the actual variable name (called `<entryVar>` here):

```astro
<Page
  title={<entryVar>.data.title}
  path="/projects"
  description={<entryVar>.data.description}
  image={`/og/projects/${<entryVar>.id}.png`}
  type="article"
>
```

Keep any other existing props (e.g. `path`) intact.

- [ ] **Step 3: Build and verify a project page emits its per-entry OG URL**

Run:
```bash
npm run build
npm run dev
# In another terminal — replace <slug> with any existing project slug:
ls src/content/projects/
curl -s http://localhost:4321/projects/<slug>/ | grep -E 'og:image|og:type'
```

Expected:
- `<meta property="og:image" content="https://lsalik.dev/og/projects/<slug>.png">`
- `<meta property="og:type" content="article">`

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/pages/projects/\[...slug\].astro
git commit -m "feat(og): project pages emit per-entry og:image"
```

---

## Task 11: Fix the broken markdown image in hello-world.md

**Files:**
- Modify: `src/content/blog/hello-world.md`

The current URL `https://github.com/lsalik2/lsalik.dev/blob/main/public/favicon.svg` returns GitHub's HTML repo viewer, not the SVG, so the `<img>` is broken. Replace with the local path `/favicon.svg` — the file already ships in `public/`.

- [ ] **Step 1: Edit the markdown**

In `src/content/blog/hello-world.md`, line 50:

```markdown
![lsalik.dev logo](https://github.com/lsalik2/lsalik.dev/blob/main/public/favicon.svg "lsalik.dev logo")
```

Replace with:

```markdown
![lsalik.dev logo](/favicon.svg "lsalik.dev logo")
```

- [ ] **Step 2: Verify in dev**

Run:
```bash
npm run dev
# In another terminal:
curl -s http://localhost:4321/blog/hello-world/ | grep -o '<img[^>]*src="[^"]*"'
```

Expected output:
```
<img src="/favicon.svg"
```

Open `http://localhost:4321/blog/hello-world/` in a browser and confirm the logo image actually renders (not a broken-image icon). Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/content/blog/hello-world.md
git commit -m "fix(blog): use local /favicon.svg for hello-world image"
```

---

## Task 12: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Clean build from scratch**

Run:
```bash
rm -rf dist
npm run build
```

Expected: build succeeds, integration log line reports N OG images generated with 0 failures.

- [ ] **Step 2: Verify generated PNGs**

Run:
```bash
ls dist/og/blog/ dist/og/projects/
file dist/og/blog/*.png | head -3
```

Expected: one PNG per non-draft blog post and per project. All report `PNG image data, 1200 x 630`.

- [ ] **Step 3: Verify the full test suite passes**

Run:
```bash
npm test
```

Expected: all tests pass — existing + new `template.test.ts`, `render.test.ts`, `og-build.test.ts`.

- [ ] **Step 4: Verify the default fallback is shipped**

Run:
```bash
ls -la public/og/default.png dist/og/default.png 2>&1 || true
```

Expected: `public/og/default.png` exists (committed). Astro copies `public/` into `dist/` during build, so `dist/og/default.png` should also exist post-build.

- [ ] **Step 5: Visual spot-check**

Open one generated post PNG and the default PNG in an image viewer (or via `xdg-open` / file manager). Confirm:
- The terminal-frame chrome renders correctly.
- The title and metadata are legible.
- The `lsalik.dev` wordmark appears in the bottom-right.

- [ ] **Step 6: No commit needed**

This task is verification-only. If any step fails, file a follow-up task; do not push until everything passes.

---

## Out of scope (deliberately not in this plan)

- OG image cache-busting via content-hashed query strings — revisit only if stale Slack/Discord previews become a problem.
- Per-static-page generated images (homepage, /man, /uses) — one fallback is enough.
- Migrating blog markdown to `astro:assets` — the site uses `passthroughImageService` so optimization payoff is limited; defer to a separate plan if/when needed.
- A blog-authoring docs page explaining how to add images going forward — small follow-up README tweak if the fix doesn't make the convention obvious.
