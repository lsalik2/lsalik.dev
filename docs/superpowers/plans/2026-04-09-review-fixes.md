# review-fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear every item in `docs/REVIEW.md` plus a small set of local optimizations, landing on the `review-fixes` branch as focused commits.

**Architecture:** Astro 6 SSR site with a dual-rendering contract — browsers get HTML, terminal clients (curl/wget/httpie/fetch) get ANSI plaintext via `src/middleware.ts` and `src/curl/render.ts`. Work in this plan is entirely local refactoring and polish; no architectural changes.

**Tech Stack:** Astro 6, TypeScript, Vitest. No UI framework. No CSS preprocessor.

**Spec:** `docs/superpowers/specs/2026-04-09-review-fixes-design.md`

**Preconditions:**
- Currently on branch `review-fixes` (already cut from `main`).
- Working tree clean.
- Commits must **not** include a `Co-Authored-By` line (user preference).

---

## File Structure

**New files:**
- `src/styles/prose.css` — shared markdown styling, used by all four markdown-rendering pages.
- `src/lib/nav.ts` — single source of truth for the top-level nav list.
- `src/data/contact.ts` — contact sections data, shared between browser contact page and terminal contact handler.
- `src/curl/markdown.ts` — pure markdown-to-terminal cleanup utility.
- `tests/curl/markdown.test.ts` — unit tests for `stripMarkdownForTerminal`.
- `tests/lib/nav.test.ts` — sanity tests for `NAV_LINKS`.

**Modified files:**
- `src/pages/blog/[...slug].astro` — import `prose.css`, wrap content, delete local `<style>` rules.
- `src/pages/projects/[...slug].astro` — same treatment.
- `src/pages/about.astro` — same treatment.
- `src/pages/resume.astro` — same treatment (but keep `.download-link` and `.resume-actions` styles, they're page-specific).
- `src/components/Nav.astro` — import `NAV_LINKS`, tighten active-state match.
- `src/curl/render.ts` — import `NAV_LINKS`, add `renderProjectPost`, call `stripMarkdownForTerminal` in `renderAbout`, wire `renderResume` content usage unchanged.
- `src/middleware.ts` — use `CONTACT_SECTIONS`, use `NAV_LINKS` in 404, pass `resumeRaw`, drop dead `isTerminalClient` re-checks, remove `as any` casts, fix `textResponse` double-newline, call `renderProjectPost`.
- `src/islands/ascii-bg.ts` — parity assertion, move container check before `started` flag, store/cancel rAF handle.
- `src/lib/palettes.ts` — delete `PALETTE_LABELS` export.
- `src/pages/contact.astro` — import `CONTACT_SECTIONS`, delete local arrays.

**Deleted files:**
- `src/data/sources.md`

---

## Task 1: Delete orphaned `sources.md` and unused `PALETTE_LABELS`

Trivial cleanup first. Two unrelated dead-code deletions that share a commit.

**Files:**
- Delete: `src/data/sources.md`
- Modify: `src/lib/palettes.ts` (remove `PALETTE_LABELS` export)

- [ ] **Step 1: Run the existing palettes test to establish baseline**

Run: `npx vitest run tests/lib/palettes.test.ts`
Expected: PASS.

- [ ] **Step 2: Verify `PALETTE_LABELS` has no consumers**

Run: `grep -rn PALETTE_LABELS src/ tests/`
Expected output: only the declaration in `src/lib/palettes.ts`. If there's any other hit, stop and flag.

- [ ] **Step 3: Delete the orphan markdown file**

```bash
rm src/data/sources.md
```

- [ ] **Step 4: Remove `PALETTE_LABELS` from `src/lib/palettes.ts`**

Delete lines 15-21 of `src/lib/palettes.ts` (the `export const PALETTE_LABELS: Record<PaletteName, string> = { … }` block). The file should end after `nextPalette` returns.

Final file contents should be exactly:

```typescript
export const PALETTES = [
  'dark-terminal',
  'amber-crt',
  'green-phosphor',
  'synthwave',
  'mocha',
] as const;
export type PaletteName = typeof PALETTES[number];

export function nextPalette(current: PaletteName): PaletteName {
  const index = PALETTES.indexOf(current);
  return PALETTES[(index + 1) % PALETTES.length];
}
```

- [ ] **Step 5: Run tests and build**

Run: `npx vitest run && npx astro check`
Expected: all tests PASS, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/sources.md src/lib/palettes.ts
git commit -m "chore: delete sources.md orphan and unused PALETTE_LABELS"
```

---

## Task 2: Extract shared prose styles into `src/styles/prose.css`

Biggest refactor. The `<style>` blocks in `src/pages/blog/[...slug].astro` and `src/pages/projects/[...slug].astro` are byte-identical except for the wrapper class name (`.post-content` vs `.project-content`). We're consolidating onto a single `.prose` class.

**Files:**
- Create: `src/styles/prose.css`
- Modify: `src/pages/blog/[...slug].astro`
- Modify: `src/pages/projects/[...slug].astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/resume.astro`

- [ ] **Step 1: Create `src/styles/prose.css`**

Create this exact file. It's the union of styles from the slug pages, with selectors scoped to `.prose`. No `:global` needed — it's a plain stylesheet.

```css
.prose {
  line-height: 1.65;
}

/* Headings */
.prose h1,
.prose h2,
.prose h3,
.prose h4,
.prose h5,
.prose h6 {
  color: var(--accent);
  font-weight: bold;
  line-height: 1.3;
}

.prose h1 { font-size: 1.6rem; margin: 2rem 0 1rem; }
.prose h2 { font-size: 1.35rem; margin: 1.75rem 0 0.85rem; }
.prose h3 { font-size: 1.15rem; margin: 1.5rem 0 0.7rem; }
.prose h4 { font-size: 1rem; margin: 1.25rem 0 0.5rem; }
.prose h5 { font-size: 0.95rem; margin: 1.15rem 0 0.45rem; }
.prose h6 { font-size: 0.9rem; margin: 1rem 0 0.4rem; color: var(--fg-muted); }

.prose h1:first-child,
.prose h2:first-child,
.prose h3:first-child,
.prose h4:first-child {
  margin-top: 0;
}

/* Paragraphs */
.prose p {
  margin: 0 0 1rem;
}

/* Inline emphasis */
.prose strong {
  color: var(--fg);
  font-weight: bold;
}

.prose em {
  color: var(--fg);
  font-style: italic;
}

.prose del {
  color: var(--fg-muted);
}

/* Lists — reset global zeroing and give markers breathing room */
.prose ul,
.prose ol {
  margin: 0 0 1rem;
  padding-left: 2rem;
}

.prose ul { list-style: disc outside; }
.prose ol { list-style: decimal outside; }

.prose li {
  margin-bottom: 0.5rem;
}

.prose li:last-child {
  margin-bottom: 0;
}

.prose li > p {
  margin-bottom: 0.5rem;
}

.prose li::marker {
  color: var(--fg-muted);
}

/* Nested lists */
.prose ul ul,
.prose ul ol,
.prose ol ul,
.prose ol ol {
  margin: 0.5rem 0 0;
}

/* GFM task lists */
.prose ul.contains-task-list {
  list-style: none;
  padding-left: 0.5rem;
}

.prose .task-list-item {
  padding-left: 0;
}

.prose .task-list-item input[type="checkbox"] {
  margin-right: 0.5rem;
  accent-color: var(--accent);
  transform: translateY(1px);
}

/* Blockquote */
.prose blockquote {
  border-left: 3px solid var(--accent);
  padding: 0.75rem 1rem;
  margin: 1rem 0;
  color: var(--fg-muted);
  background-color: color-mix(in srgb, var(--bg-surface) 60%, transparent);
  border-radius: 0 3px 3px 0;
}

.prose blockquote p {
  margin-bottom: 0.5rem;
}

.prose blockquote p:last-child {
  margin-bottom: 0;
}

/* Tables */
.prose table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
  font-size: 0.9rem;
  display: block;
  overflow-x: auto;
}

.prose th,
.prose td {
  border: 1px solid var(--border);
  padding: 0.55rem 0.85rem;
  text-align: left;
}

.prose th {
  background-color: var(--bg-surface);
  color: var(--accent);
  font-weight: bold;
}

.prose tbody tr:nth-child(even) {
  background-color: color-mix(in srgb, var(--bg-surface) 40%, transparent);
}

/* Horizontal rule */
.prose hr {
  border: none;
  border-top: 1px dashed var(--border);
  margin: 2rem 0;
}

/* Links */
.prose a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.prose a:hover {
  color: var(--accent-bright);
}

/* Images */
.prose img {
  max-width: 100%;
  height: auto;
  border-radius: 3px;
  margin: 1rem 0;
  display: block;
}

/* Code */
.prose code {
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0.1em 0.35em;
  font-family: inherit;
  font-size: 0.9em;
  color: var(--accent);
}

.prose pre {
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1rem;
  overflow-x: auto;
  margin: 0 0 1rem;
  line-height: 1.5;
  font-size: 0.9rem;
}

.prose pre code {
  padding: 0;
  background: none;
  border: none;
  color: inherit;
  font-size: inherit;
}

/* Footnotes (GFM) */
.prose .footnotes {
  margin-top: 2.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
  color: var(--fg-muted);
}

.prose .footnotes ol {
  padding-left: 1.5rem;
}

.prose .footnotes li {
  margin-bottom: 0.4rem;
}
```

- [ ] **Step 2: Update `src/pages/blog/[...slug].astro`**

Replace the frontmatter/body/style with exactly this content:

```astro
---
import { getCollection, render } from 'astro:content';
import Page from '../../layouts/Page.astro';
import TerminalFrame from '../../components/TerminalFrame.astro';
import '../../styles/prose.css';

const slug = Astro.params.slug;
const posts = await getCollection('blog', ({ data }) => !data.draft);
const post = posts.find(p => p.id === slug);
if (!post) return Astro.redirect('/blog');
const { Content } = await render(post);
const dateStr = post.data.date.toISOString().slice(0, 10);
const tagsStr = post.data.tags.join(', ');
---
<Page title={post.data.title} path="/blog">
  <TerminalFrame title={`cat ~/blog/${post.id}.md`}>
    <p class="post-meta">{dateStr} · {tagsStr}</p>
    <div class="prose">
      <Content />
    </div>
  </TerminalFrame>
</Page>

<style>
  .post-meta {
    font-size: 0.85rem;
    color: var(--fg-muted);
    margin: 0 0 1.5rem;
  }
</style>
```

- [ ] **Step 3: Update `src/pages/projects/[...slug].astro`**

Keep the `.project-meta` / `.meta-row` / `.divider` styles (those are page-specific UI chrome, not markdown styling). Only delete the `.project-content` `:global(...)` rules and wrap the content in `.prose`.

Replace the file with exactly:

```astro
---
import { getCollection, render } from 'astro:content';
import Page from '../../layouts/Page.astro';
import TerminalFrame from '../../components/TerminalFrame.astro';
import '../../styles/prose.css';

const slug = Astro.params.slug;
const projects = await getCollection('projects');
const project = projects.find(p => p.id === slug);
if (!project) return Astro.redirect('/projects');
const { Content } = await render(project);
const dateStr = project.data.date.toISOString().slice(0, 10);
const stackStr = project.data.stack.join(' · ');
---
<Page title={project.data.title} path="/projects">
  <TerminalFrame title={`cat ~/projects/${project.id}/README.md`}>
    <div class="project-meta">
      <div class="meta-row">
        <span class="meta-key">Status</span>
        <span class="meta-value status">{project.data.status}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Stack</span>
        <span class="meta-value muted">{stackStr}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Updated</span>
        <span class="meta-value muted">{dateStr}</span>
      </div>
      {project.data.url && (
        <div class="meta-row">
          <span class="meta-key">URL</span>
          <a class="meta-value link" href={project.data.url} target="_blank" rel="noopener noreferrer">{project.data.url}</a>
        </div>
      )}
      <div class="meta-row">
        <span class="meta-key">Repo</span>
        {project.data.repo
          ? <a class="meta-value link" href={project.data.repo} target="_blank" rel="noopener noreferrer">{project.data.repo}</a>
          : <span class="meta-value muted">closed source</span>
        }
      </div>
    </div>
    <hr class="divider" />
    <div class="prose">
      <Content />
    </div>
  </TerminalFrame>
</Page>

<style>
  .project-meta {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }

  .meta-row {
    display: flex;
    gap: 1rem;
  }

  .meta-key {
    color: var(--fg-muted);
    min-width: 6rem;
  }

  .meta-value {
    color: var(--fg);
  }

  .meta-value.status {
    color: var(--amber);
  }

  .meta-value.muted {
    color: var(--fg-muted);
  }

  .meta-value.link,
  a.meta-value {
    color: var(--accent);
    text-decoration: none;
  }

  .meta-value.link:hover,
  a.meta-value:hover {
    text-decoration: underline;
  }

  .divider {
    border: none;
    border-top: 1px solid var(--fg-muted);
    margin: 1rem 0;
    opacity: 0.3;
  }
</style>
```

- [ ] **Step 4: Update `src/pages/about.astro`**

Replace the file with:

```astro
---
import Page from '../layouts/Page.astro';
import PageHeader from '../components/PageHeader.astro';
import '../styles/prose.css';

const aboutModule = await import('../data/about.md');
const AboutContent = aboutModule.default;
---
<Page title="About" path="/about">
  <PageHeader heading="~/about" description="cat about.md — who I am, what I build, what I'm into." />
  <div class="prose">
    <AboutContent />
  </div>
</Page>
```

(No local `<style>` block needed — the old `::before` bullet hack is replaced by the shared prose list styling.)

- [ ] **Step 5: Update `src/pages/resume.astro`**

Keep `.resume-actions` and `.download-link` — those style the PDF download button, not markdown. Replace the file with:

```astro
---
import Page from '../layouts/Page.astro';
import PageHeader from '../components/PageHeader.astro';
import TerminalFrame from '../components/TerminalFrame.astro';
import '../styles/print.css';
import '../styles/prose.css';

const resumeModule = await import('../data/resume.md');
const ResumeContent = resumeModule.default;
---
<Page title="Resume" path="/resume">
  <PageHeader heading="~/resume" description="less ~/resume — my CV, feel free to download it." />
  <TerminalFrame title="cat ~/resume.md">
    <div class="prose">
      <ResumeContent />
    </div>
  </TerminalFrame>

  <div class="resume-actions">
    <a href="/resume.pdf" class="download-link" download>Download PDF</a>
  </div>
</Page>

<style>
  .resume-actions {
    margin-top: 1rem;
  }

  .download-link {
    color: var(--accent);
    text-decoration: none;
    border: 1px solid var(--accent);
    padding: 0.4rem 0.9rem;
    border-radius: 3px;
    font-size: 0.85rem;
    transition: background-color 0.15s, color 0.15s;
  }

  .download-link:hover {
    background-color: var(--accent);
    color: var(--bg);
  }
</style>
```

- [ ] **Step 6: Build the site to verify all four pages still render**

Run: `npx astro build`
Expected: build succeeds with no errors.

- [ ] **Step 7: Start dev server and spot-check pages in the browser**

Run: `npx astro dev` (background), then visit `/about`, `/resume`, one blog post (`/blog/<any-slug>`), and one project (`/projects/<any-slug>`). Confirm: headings are accented, lists have disc markers, links are underlined, paragraphs have spacing. Kill the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/styles/prose.css src/pages/blog/'[...slug].astro' src/pages/projects/'[...slug].astro' src/pages/about.astro src/pages/resume.astro
git commit -m "refactor: extract shared prose styles into src/styles/prose.css"
```

---

## Task 3: Fix `Nav.astro` active-state prefix match

Five-character change. The current `path.startsWith(link.href)` would match `/about` against a hypothetical `/aboutfoo`.

**Files:**
- Modify: `src/components/Nav.astro:32`

- [ ] **Step 1: Edit the active-state check in `src/components/Nav.astro`**

Change line 32 from:

```astro
        class:list={['nav-link', { active: path.startsWith(link.href) }]}
```

to:

```astro
        class:list={['nav-link', { active: path === link.href || path.startsWith(link.href + '/') }]}
```

- [ ] **Step 2: Build and verify**

Run: `npx astro check && npx astro build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Nav.astro
git commit -m "fix: tighten Nav active-state matching to segment boundary"
```

---

## Task 4: Fix `textResponse` double-newline

One-character fix in middleware.

**Files:**
- Modify: `src/middleware.ts:29`

- [ ] **Step 1: Edit `src/middleware.ts`**

Change line 29 from:

```typescript
  return new Response('\n' + body.trimEnd() + '\n\n', {
```

to:

```typescript
  return new Response('\n' + body.trimEnd() + '\n', {
```

- [ ] **Step 2: Run middleware-related tests**

Run: `npx vitest run`
Expected: all tests PASS. (No test asserts on the trailing newline count, so this should be a no-op for the test suite.)

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "fix: drop trailing double-newline from textResponse"
```

---

## Task 5: Extract `NAV_LINKS` into `src/lib/nav.ts`

Single source of truth for the nav list. Three current consumers: `Nav.astro`, `curl/render.ts` (`renderHome`), and `middleware.ts` (`notFoundResponse`).

**Files:**
- Create: `src/lib/nav.ts`
- Create: `tests/lib/nav.test.ts`
- Modify: `src/components/Nav.astro`
- Modify: `src/curl/render.ts`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/nav.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { NAV_LINKS } from '../../src/lib/nav';

describe('NAV_LINKS', () => {
  it('is non-empty', () => {
    expect(NAV_LINKS.length).toBeGreaterThan(0);
  });

  it('every entry has an href that starts with /', () => {
    for (const link of NAV_LINKS) {
      expect(link.href.startsWith('/')).toBe(true);
    }
  });

  it('every entry has a non-empty label', () => {
    for (const link of NAV_LINKS) {
      expect(link.label.length).toBeGreaterThan(0);
    }
  });

  it('contains the five expected top-level paths', () => {
    const hrefs = NAV_LINKS.map(l => l.href);
    expect(hrefs).toEqual(['/about', '/projects', '/blog', '/resume', '/contact']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/nav.test.ts`
Expected: FAIL — module `../../src/lib/nav` not found.

- [ ] **Step 3: Create `src/lib/nav.ts`**

```typescript
export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/about', label: 'about' },
  { href: '/projects', label: 'projects' },
  { href: '/blog', label: 'blog' },
  { href: '/resume', label: 'resume' },
  { href: '/contact', label: 'contact' },
] as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/nav.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Update `src/components/Nav.astro` to consume `NAV_LINKS`**

Replace the frontmatter block with:

```astro
---
import { NAV_LINKS } from '../lib/nav';

interface Props {
  path: string;
}

const { path } = Astro.props;

const segments = path === '/' ? [] : path.split('/').filter(Boolean);
---
```

And update the `.map` at line 29 (the existing markup) to iterate `NAV_LINKS` instead of the now-removed `navLinks` local:

```astro
  <div class="nav-links">
    {NAV_LINKS.map(link => (
      <a
        href={link.href}
        class:list={['nav-link', { active: path === link.href || path.startsWith(link.href + '/') }]}
      >
        {link.label}
      </a>
    ))}
  </div>
```

(Leave the breadcrumb block and `<style>` block untouched.)

- [ ] **Step 6: Update `src/curl/render.ts` `renderHome` to consume `NAV_LINKS`**

At the top of the file add:

```typescript
import { NAV_LINKS } from '../lib/nav';
```

Replace the `renderHome` function body (currently lines 31-46) with:

```typescript
export function renderHome(): string {
  const logo = renderLogo();
  const title = bold('lsalik.dev');
  const description = dim('terminal-inspired personal website');
  const navLines = NAV_LINKS.map(link => `  curl lsalik.dev${link.href}`);
  const nav = [dim('navigate:'), ...navLines].join('\n');
  const source = dim('source: https://github.com/lsalik2/lsalik.dev');

  return [logo, '', title, description, '', nav, '', source].join('\n');
}
```

- [ ] **Step 7: Update `src/middleware.ts` `notFoundResponse` to consume `NAV_LINKS`**

Add to the existing import block at the top of the file:

```typescript
import { NAV_LINKS } from './lib/nav';
```

Replace the `notFoundResponse` function (currently lines 38-54) with:

```typescript
function notFoundResponse(pathname: string): Response {
  const navLines = NAV_LINKS.map(link => `  curl lsalik.dev${link.href}`);
  const body = [
    `404: ${pathname} — not found`,
    '',
    'navigate:',
    '  curl lsalik.dev',
    ...navLines,
  ].join('\n');
  return new Response('\n' + body + '\n', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

(Note the `\n` instead of `\n\n` at the end — matches Task 4's fix.)

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS. The existing `renderHome` drift test asserts the five `curl lsalik.dev/<path>` lines are present; they will be.

- [ ] **Step 9: Build the site**

Run: `npx astro build`
Expected: build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/lib/nav.ts tests/lib/nav.test.ts src/components/Nav.astro src/curl/render.ts src/middleware.ts
git commit -m "refactor: extract NAV_LINKS and consume from nav, curl, 404"
```

---

## Task 6: Extract contact data into `src/data/contact.ts`

Single source of truth for both the browser contact page and the terminal contact handler.

**Files:**
- Create: `src/data/contact.ts`
- Modify: `src/pages/contact.astro`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Create `src/data/contact.ts`**

```typescript
export interface ContactLink {
  readonly label: string;
  readonly url: string;
}

export interface ContactSection {
  readonly heading: string;
  readonly links: readonly ContactLink[];
}

export const CONTACT_SECTIONS: readonly ContactSection[] = [
  {
    heading: 'professional',
    links: [
      { label: 'GitHub', url: 'https://github.com/lsalik2' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/luis-salik' },
      { label: 'Discord User Link', url: 'https://discord.gg/6zdHqY7h' },
    ],
  },
  {
    heading: 'esports',
    links: [
      { label: 'Liquipedia', url: 'https://liquipedia.net/rocketleague/SLK' },
      { label: 'X', url: 'https://x.com/slkrl_' },
      { label: 'Twitch', url: 'https://twitch.tv/slkrl' },
      { label: 'YouTube', url: 'https://youtube.com/@slk-rl' },
      { label: 'Steam', url: 'https://steamcommunity.com/id/SlkRL' },
      { label: 'Discord Server', url: 'https://discord.gg/dsUfTqmE4d' },
    ],
  },
] as const;
```

- [ ] **Step 2: Update `src/curl/render.ts` to re-export the shared type**

In `src/curl/render.ts`, replace the local `ContactSection` interface (currently lines 97-100) with a re-export. Remove the existing `export interface ContactSection { ... }` block and add near the top of the file (after the existing imports):

```typescript
import type { ContactSection } from '../data/contact';
export type { ContactSection };
```

The `renderContact` function signature stays the same; it now uses the type imported from `src/data/contact`.

- [ ] **Step 3: Update `src/pages/contact.astro` to consume the shared data**

Replace the file with:

```astro
---
import Page from '../layouts/Page.astro';
import PageHeader from '../components/PageHeader.astro';
import { CONTACT_SECTIONS } from '../data/contact';

const sectionSubtitles: Record<string, string> = {
  professional: 'professional; feel free to DM me on any platforms below! ',
  esports: "esports; i'm also a professional rocket league player!",
};
---
<Page title="Contact" path="/contact">
  <PageHeader heading="~/contact" description="cat ~/contact — how to reach me, socials included." />

  {CONTACT_SECTIONS.map(section => (
    <section class="link-section">
      <h2 class="section-heading">{sectionSubtitles[section.heading] ?? section.heading}</h2>
      <div class="links-list">
        {section.links.map(link => (
          <a href={link.url} class="link-entry" target="_blank" rel="noopener noreferrer">
            <span class="link-arrow">→</span>
            <span class="link-url">{link.url.replace('https://', '')}</span>
            <span class="link-label">{link.label}</span>
          </a>
        ))}
      </div>
    </section>
  ))}
</Page>

<style>
  .link-section {
    margin-bottom: 2rem;
  }

  .section-heading {
    color: var(--fg-muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.75rem;
    opacity: 0.7;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .link-entry {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: inherit;
    padding: 0.4rem 0;
    transition: opacity 0.15s;
  }

  .link-entry:hover {
    opacity: 0.8;
  }

  .link-arrow {
    color: var(--green);
    flex-shrink: 0;
  }

  .link-url {
    color: var(--accent);
  }

  .link-label {
    color: var(--fg-muted);
    font-size: 0.85rem;
  }
</style>
```

(The `sectionSubtitles` map preserves the exact original long-form headings on the browser page without hard-coding them in the data file.)

- [ ] **Step 4: Update `src/middleware.ts` `/contact` handler**

In the existing import block add:

```typescript
import { CONTACT_SECTIONS } from './data/contact';
```

Replace the `/contact` handler block (currently lines 143-166) with:

```typescript
  if (pathname === '/contact' || pathname === '/contact/') {
    return textResponse(renderContact(CONTACT_SECTIONS));
  }
```

Also remove the now-unused `type ContactSection` from the import of `./curl/render` at the top of the file (leave the other named imports in place).

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: all tests PASS. `renderContact` tests still cover the shape using locally-constructed sections.

- [ ] **Step 6: Build and spot-check the contact page**

Run: `npx astro build`
Expected: build succeeds.

Optional: `npx astro dev` → visit `/contact` → confirm both section headings and all nine links still render. Kill dev server.

- [ ] **Step 7: Commit**

```bash
git add src/data/contact.ts src/curl/render.ts src/pages/contact.astro src/middleware.ts
git commit -m "refactor: extract CONTACT_SECTIONS to single source of truth"
```

---

## Task 7: Wire `resumeRaw` through `renderResume`

Three-line fix to stop the `/resume` terminal handler returning a stub.

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add the import**

Near the existing `import aboutRaw from './data/about.md?raw';` line in `src/middleware.ts`, add:

```typescript
import resumeRaw from './data/resume.md?raw';
```

- [ ] **Step 2: Update the `/resume` handler**

Replace:

```typescript
  if (pathname === '/resume' || pathname === '/resume/') {
    return textResponse(renderResume('Visit lsalik.dev/resume for full resume content.'));
  }
```

with:

```typescript
  if (pathname === '/resume' || pathname === '/resume/') {
    return textResponse(renderResume(resumeRaw));
  }
```

- [ ] **Step 3: Build to confirm `?raw` import resolves**

Run: `npx astro build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "fix: pass resumeRaw through renderResume instead of stub"
```

---

## Task 8: Add `renderProjectPost` and tidy middleware

Symmetry with `renderBlogPost`, plus removing dead `isTerminalClient` re-checks and `as any` casts.

**Files:**
- Modify: `src/curl/render.ts`
- Modify: `src/middleware.ts`
- Modify: `tests/curl/render.test.ts`

- [ ] **Step 1: Write the failing test for `renderProjectPost`**

Append to `tests/curl/render.test.ts` (before the last closing line):

```typescript
describe('renderProjectPost', () => {
  const project = {
    title: 'My Project',
    status: 'Alpha',
    stack: ['Astro', 'TypeScript'],
    content: 'Project README body.',
  };

  it('includes the project title', () => {
    const out = stripAnsi(renderProjectPost(project));
    expect(out).toContain('My Project');
  });

  it('includes the status', () => {
    const out = stripAnsi(renderProjectPost(project));
    expect(out).toContain('Alpha');
  });

  it('includes every stack entry', () => {
    const out = stripAnsi(renderProjectPost(project));
    expect(out).toContain('Astro');
    expect(out).toContain('TypeScript');
  });

  it('includes the body content', () => {
    const out = stripAnsi(renderProjectPost(project));
    expect(out).toContain('Project README body.');
  });
});
```

Add `renderProjectPost` to the existing `import { … }` block at the top of the same test file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/curl/render.test.ts`
Expected: FAIL — `renderProjectPost` is not exported.

- [ ] **Step 3: Add `ProjectPostFull` type and `renderProjectPost` to `src/curl/render.ts`**

After the existing `BlogPostFull` interface, add:

```typescript
export interface ProjectPostFull {
  title: string;
  status: string;
  stack: string[];
  content: string;
}
```

After the existing `renderBlogPost` function, add:

```typescript
export function renderProjectPost(project: ProjectPostFull): string {
  const title = bold(project.title);
  const meta = `${dim(project.status)} · ${project.stack.join(' · ')}`;
  return [title, meta, '', project.content].join('\n');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/curl/render.test.ts`
Expected: PASS (4 new assertions, all existing ones still green).

- [ ] **Step 5: Update `src/middleware.ts` to call `renderProjectPost`**

Add `renderProjectPost` to the existing named imports from `./curl/render`.

Replace the `/projects/:slug` handler block (currently lines 125-137) with:

```typescript
  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/?$/);
  if (projectMatch) {
    const slug = projectMatch[1];
    const entries = await getCollection('projects');
    const entry = entries.find(p => p.id === slug);
    if (!entry) return notFoundResponse(pathname);
    const content = entry.body ?? entry.data.description;
    return textResponse(
      renderProjectPost({
        title: entry.data.title,
        status: entry.data.status,
        stack: entry.data.stack,
        content,
      })
    );
  }
```

Note the three improvements in this block:
1. `entry.body` instead of `(entry as any).body` — Astro's content collection entries expose `body` on the entry type.
2. `return notFoundResponse(pathname)` directly instead of `return isTerminalClient(ua) ? notFoundResponse(pathname) : next()` — the early return at line 68 already guarantees terminal client.
3. Uses `renderProjectPost` instead of the inline `bold`/`dim` template.

- [ ] **Step 6: Apply the same `isTerminalClient` cleanup to the blog slug handler**

In the `/blog/:slug` handler (currently lines 91-105), replace:

```typescript
    if (!entry) return isTerminalClient(ua) ? notFoundResponse(pathname) : next();
    return textResponse(
      renderBlogPost({
        title: entry.data.title,
        date: entry.data.date.toISOString().slice(0, 10),
        tags: entry.data.tags,
        content: (entry as any).body ?? entry.data.description,
      })
    );
```

with:

```typescript
    if (!entry) return notFoundResponse(pathname);
    return textResponse(
      renderBlogPost({
        title: entry.data.title,
        date: entry.data.date.toISOString().slice(0, 10),
        tags: entry.data.tags,
        content: entry.body ?? entry.data.description,
      })
    );
```

- [ ] **Step 7: Remove the final dead `isTerminalClient` check at the bottom of the handler**

Replace the last block of the middleware (currently lines 172-177):

```typescript
  if (isTerminalClient(ua)) {
    return notFoundResponse(pathname);
  }

  return next();
```

with just:

```typescript
  return notFoundResponse(pathname);
```

Because we early-returned at line 68 for non-terminal clients, any request reaching this point is already a terminal client.

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 9: Typecheck and build**

Run: `npx astro check && npx astro build`
Expected: no errors. If `entry.body` gives a TypeScript error (older versions of Astro content collections may not expose it on the raw entry type), narrow via `'body' in entry ? (entry as { body: string }).body : undefined` — a single typed cast instead of the blanket `as any`. Do NOT revert to `as any`.

- [ ] **Step 10: Commit**

```bash
git add src/curl/render.ts src/middleware.ts tests/curl/render.test.ts
git commit -m "refactor: add renderProjectPost and tidy middleware dead checks"
```

---

## Task 9: Curl markdown cleanup for `/about`

Introduce `stripMarkdownForTerminal` as a pure function with unit tests, then call it from `renderAbout`.

**Files:**
- Create: `src/curl/markdown.ts`
- Create: `tests/curl/markdown.test.ts`
- Modify: `src/curl/render.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/curl/markdown.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { stripMarkdownForTerminal } from '../../src/curl/markdown';

describe('stripMarkdownForTerminal', () => {
  it('returns empty input unchanged', () => {
    expect(stripMarkdownForTerminal('')).toBe('');
  });

  it('leaves plain prose unchanged', () => {
    expect(stripMarkdownForTerminal('just a sentence.')).toBe('just a sentence.');
  });

  it('converts [text](url) to text (url)', () => {
    expect(stripMarkdownForTerminal('see [my site](https://example.com) for more'))
      .toBe('see my site (https://example.com) for more');
  });

  it('handles multiple links in one line', () => {
    expect(stripMarkdownForTerminal('[a](https://a.test) and [b](https://b.test)'))
      .toBe('a (https://a.test) and b (https://b.test)');
  });

  it('strips leading # from h1 headings', () => {
    expect(stripMarkdownForTerminal('# about me')).toBe('about me');
  });

  it('strips leading ## from h2 headings', () => {
    expect(stripMarkdownForTerminal('## interests')).toBe('interests');
  });

  it('strips leading ### from h3 headings', () => {
    expect(stripMarkdownForTerminal('### subsection')).toBe('subsection');
  });

  it('converts leading "- " bullet markers to "• "', () => {
    expect(stripMarkdownForTerminal('- first item\n- second item'))
      .toBe('• first item\n• second item');
  });

  it('preserves indented content that is not a bullet', () => {
    expect(stripMarkdownForTerminal('  indented line')).toBe('  indented line');
  });

  it('handles a multi-line mixed document', () => {
    const input = '# about me\n\nhi [i am here](https://example.com).\n\n## things\n\n- one\n- two';
    const expected = 'about me\n\nhi i am here (https://example.com).\n\nthings\n\n• one\n• two';
    expect(stripMarkdownForTerminal(input)).toBe(expected);
  });

  it('does not alter text that looks like a heading but is not at line start', () => {
    expect(stripMarkdownForTerminal('tag: #hashtag in the middle')).toBe('tag: #hashtag in the middle');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/curl/markdown.test.ts`
Expected: FAIL — module `../../src/curl/markdown` not found.

- [ ] **Step 3: Create `src/curl/markdown.ts`**

```typescript
// Minimal markdown → terminal cleanup for bodies shipped to curl clients.
// Does NOT aim to be a full markdown parser; only handles the cases the
// `/about` page exercises today (headings, links, bullet markers).

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const HEADING_PATTERN = /^#{1,6}\s+(.*)$/;
const BULLET_PATTERN = /^- (.*)$/;

export function stripMarkdownForTerminal(body: string): string {
  if (body.length === 0) return body;

  return body
    .split('\n')
    .map(line => {
      // Heading: strip leading #'s and surrounding whitespace.
      const headingMatch = line.match(HEADING_PATTERN);
      if (headingMatch) return headingMatch[1];

      // Bullet at start of line: - item → • item
      const bulletMatch = line.match(BULLET_PATTERN);
      if (bulletMatch) return `• ${bulletMatch[1]}`;

      // Inline links anywhere in the line.
      return line.replace(LINK_PATTERN, (_m, text, url) => `${text} (${url})`);
    })
    .join('\n');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/curl/markdown.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Wire into `renderAbout`**

In `src/curl/render.ts`, add the import near the top (below the existing imports):

```typescript
import { stripMarkdownForTerminal } from './markdown';
```

Replace the `renderAbout` function (currently lines 112-115) with:

```typescript
export function renderAbout(content: string): string {
  const header = bold('~/about');
  return [header, '', stripMarkdownForTerminal(content)].join('\n');
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS. The existing `renderAbout` test uses the literal string `'hi there'` which contains no markdown syntax, so it will continue to pass.

- [ ] **Step 7: Build and spot-check**

Run: `npx astro build`
Expected: build succeeds.

Optional manual check: `npx astro preview` in one terminal, then in another:

```bash
curl localhost:4322/about
```

Expected: headings like `about me` and `interests` appear without `#`/`##`; the `~/contact` and `~/resume` inline code spans (`` ` `` chars) remain as-is (not stripped); no `[text](url)` syntax visible. Kill preview.

- [ ] **Step 8: Commit**

```bash
git add src/curl/markdown.ts tests/curl/markdown.test.ts src/curl/render.ts
git commit -m "feat: strip markdown syntax from curl /about output"
```

---

## Task 10: ascii-bg parity guard, init ordering, rAF cancel

Three small hardenings in `src/islands/ascii-bg.ts`. The "Resize rebuild is implicit" REVIEW item is already fixed (`measureCharWidth` + `+1` overscan) so no code change for that one.

**Files:**
- Modify: `src/islands/ascii-bg.ts`
- Modify: `tests/islands/ascii-bg.test.ts`

- [ ] **Step 1: Expose `LAYER_PHASES` and `LAYER_COLORS` and add a parity test**

First edit `src/islands/ascii-bg.ts` to export both constants (drop `const` → `export const` on lines 15 and 16). This is needed so the test can assert their lengths directly. This is a minimal visibility change, no behavior change.

Then append to `tests/islands/ascii-bg.test.ts`:

```typescript
import { LAYER_PHASES, LAYER_COLORS } from '../../src/islands/ascii-bg';

describe('layer constants', () => {
  it('LAYER_PHASES and LAYER_COLORS have the same length', () => {
    expect(LAYER_PHASES.length).toBe(LAYER_COLORS.length);
  });

  it('has at least one layer', () => {
    expect(LAYER_PHASES.length).toBeGreaterThan(0);
  });
});
```

(Merge the new `import` with the existing `import` statement at the top of the file if you prefer; two imports from the same module also work.)

- [ ] **Step 2: Run tests to establish baseline**

Run: `npx vitest run tests/islands/ascii-bg.test.ts`
Expected: PASS (no changes yet, but the new parity test should also pass since the arrays are currently in sync).

- [ ] **Step 3: Add the parity assertion in `src/islands/ascii-bg.ts`**

After the `LAYER_COLORS` constant declaration (currently line 20), add:

```typescript
if (LAYER_PHASES.length !== LAYER_COLORS.length) {
  throw new Error(
    `ascii-bg: LAYER_PHASES (${LAYER_PHASES.length}) and LAYER_COLORS (${LAYER_COLORS.length}) must have the same length`,
  );
}
```

- [ ] **Step 4: Store the rAF handle and cancel on re-init**

At the top of `initBackground()` (just inside the function, after the early `container` return), add a handle variable. Then make `frame` update it, and `start` cancel any previous handle before kicking off a new loop.

Replace the current `initBackground` function (currently lines 96-177) with:

```typescript
function initBackground(): void {
  const container = document.getElementById('ascii-bg');
  if (!container) return;

  const FONT_SIZE = 14;
  const LINE_HEIGHT = 16;

  let cols = 0;
  let rows = 0;
  let rafHandle: number | null = null;

  // Pre-build one <pre> per layer; reuse across frames.
  const layerPres: HTMLPreElement[] = LAYER_COLORS.map((color) => {
    const pre = document.createElement('pre');
    pre.style.cssText = [
      'position:absolute',
      'inset:0',
      'margin:0',
      'white-space:pre',
      'font-family:monospace',
      `font-size:${FONT_SIZE}px`,
      `line-height:${LINE_HEIGHT}px`,
      `color:${color}`,
      'pointer-events:none',
    ].join(';');
    return pre;
  });

  function measureCharWidth(): number {
    // Measure the real rendered width of a monospace glyph rather than
    // guessing FONT_SIZE * 0.6. Under-guessing leaves a right-edge gap.
    const probe = document.createElement('span');
    probe.textContent = 'M'.repeat(80);
    probe.style.cssText = [
      'position:absolute',
      'visibility:hidden',
      'white-space:pre',
      'font-family:monospace',
      `font-size:${FONT_SIZE}px`,
      `line-height:${LINE_HEIGHT}px`,
    ].join(';');
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width / 80;
    probe.remove();
    return w > 0 ? w : FONT_SIZE * 0.6;
  }

  function measure(): void {
    const charW = measureCharWidth();
    // +1 cell overscan to absorb subpixel rounding at the right edge.
    cols = Math.max(1, Math.ceil(window.innerWidth / charW) + 1);
    rows = Math.max(1, Math.ceil(window.innerHeight / LINE_HEIGHT) + 1);
  }

  function buildDOM(): void {
    container.textContent = '';
    for (const pre of layerPres) {
      container.appendChild(pre);
    }
  }

  function frame(now: number): void {
    const t = now / 1000;
    const { layers } = renderLayers(cols, rows, t, LAYER_PHASES);
    for (let li = 0; li < layerPres.length; li++) {
      layerPres[li].textContent = layers[li];
    }
    rafHandle = requestAnimationFrame(frame);
  }

  function start(): void {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    measure();
    buildDOM();
    rafHandle = requestAnimationFrame(frame);
  }

  function handleResize(): void {
    measure();
  }

  window.addEventListener('resize', handleResize);
  start();
}
```

- [ ] **Step 5: Fix the `started` flag ordering**

Replace the bottom of `src/islands/ascii-bg.ts` (currently lines 179-185):

```typescript
if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', () => {
    if (started) return;
    started = true;
    initBackground();
  });
}
```

with:

```typescript
if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', () => {
    if (started) return;
    // Don't mark as started until we've confirmed the container exists on
    // this page. Otherwise a visitor landing on a future layout without
    // `#ascii-bg` would permanently block init on subsequent navigations.
    if (!document.getElementById('ascii-bg')) return;
    started = true;
    initBackground();
  });
}
```

- [ ] **Step 6: Run the test suite**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 7: Build**

Run: `npx astro build`
Expected: build succeeds.

- [ ] **Step 8: Manual browser check**

Start the dev server, visit `/`, confirm the ascii background still animates. Open the console — no errors, no warnings about cancelAnimationFrame or multiple rAF loops. Kill dev server.

- [ ] **Step 9: Commit**

```bash
git add src/islands/ascii-bg.ts tests/islands/ascii-bg.test.ts
git commit -m "fix: ascii-bg parity guard, init ordering, rAF cancellation"
```

---

## Task 11: Final verification and REVIEW.md cleanup

Full sweep to confirm every bullet is addressed, then delete (or trim) `docs/REVIEW.md`.

**Files:**
- Modify: `docs/REVIEW.md`

- [ ] **Step 1: Run the full test suite once more**

Run: `npx vitest run`
Expected: all tests PASS, zero failures.

- [ ] **Step 2: Run typecheck and build**

Run: `npx astro check && npx astro build`
Expected: zero TypeScript errors, clean build.

- [ ] **Step 3: Cross-reference every `docs/REVIEW.md` bullet**

Walk through `docs/REVIEW.md` and confirm every bullet is addressed:

| Bullet | Status |
|---|---|
| Markdown-prose CSS duplicated | Task 2 |
| about/resume minimal style | Task 2 (inherits full set) |
| `renderResume` stub | Task 7 |
| `PALETTE_LABELS` unused | Task 1 |
| Nav list in two places | Task 5 (also fixed third copy in 404) |
| Contact-link list in two places | Task 6 |
| `Nav.astro` active state | Task 3 |
| `sources.md` orphan | Task 1 |
| `LAYER_PHASES`/`LAYER_COLORS` parity | Task 10 |
| `started` flag regression vector | Task 10 |
| rAF loop has no cancellation | Task 10 |
| Resize rebuild implicit | Already fixed pre-branch (`measureCharWidth` + `+1` overscan) |
| `textResponse` double-newline | Task 4 |
| `about` curl leaks markdown | Task 9 |

If any row is not actually addressed in the branch, stop and fix before continuing.

- [ ] **Step 4: Empty `docs/REVIEW.md`**

Replace the contents of `docs/REVIEW.md` with:

```markdown
# Deferred Review Items

No items currently deferred. The previous backlog was addressed on branch `review-fixes` (merged 2026-04-09).
```

- [ ] **Step 5: Commit the REVIEW.md update**

```bash
git add docs/REVIEW.md
git commit -m "docs: clear REVIEW backlog after review-fixes branch"
```

- [ ] **Step 6: Show the full commit log for the branch**

Run: `git log main..review-fixes --oneline`
Expected: ~11 commits, one per task, each with a clear prefix (`chore:`, `refactor:`, `fix:`, `feat:`, `docs:`).

- [ ] **Step 7: Hand off**

Report to the user: branch `review-fixes` is ready, all tests pass, build is clean, REVIEW.md is cleared. Ask whether they want to merge, open a PR, or continue iterating.

---

## Self-Review Checklist

- **Spec coverage:** Every section of the spec maps to a task (see Task 11 cross-reference table).
- **Placeholder scan:** No TBDs, no "handle edge cases", no "similar to Task N" without repeated code.
- **Type consistency:** `NavLink`, `ContactSection`, `ContactLink`, `ProjectPostFull`, `stripMarkdownForTerminal` are each defined in exactly one place and referenced consistently afterwards.
- **Commit hygiene:** No Co-Authored-By lines (per user preference).
