# Live GitHub Project Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each project's GitHub stars + last-commit recency (`★ 42 · updated 3d ago`) on the project list and detail pages, in both the browser and `curl` terminal views.

**Architecture:** A build-only Astro integration (`astro:build:start`, mirroring the existing `og-images` integration) fetches stars/`pushed_at` per repo and writes a committed `src/data/github-stats.json` map. A pure, fully-tested lib (`src/lib/github-stats.ts`) parses repo URLs and formats the data. The four render surfaces import the JSON and emit a stats line; closed-source projects (no `repo`) show nothing.

**Tech Stack:** TypeScript, Astro 6 (`output: 'server'`), Vitest, `js-yaml` (already a dep), global `fetch` (Node 18+).

---

### Task 1: Pure lib — repo identity, lookup, transform, merge

**Files:**
- Create: `src/lib/github-stats.ts`
- Test: `tests/lib/github-stats.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/github-stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  parseRepo,
  repoKey,
  repoApiToStats,
  statsForRepo,
  mergeStats,
  type StatsMap,
} from '../../src/lib/github-stats';

describe('parseRepo', () => {
  it('parses a standard GitHub URL', () => {
    expect(parseRepo('https://github.com/lsalik2/Chroma')).toEqual({ owner: 'lsalik2', name: 'Chroma' });
  });
  it('tolerates a trailing slash', () => {
    expect(parseRepo('https://github.com/lsalik2/Chroma/')).toEqual({ owner: 'lsalik2', name: 'Chroma' });
  });
  it('strips a .git suffix', () => {
    expect(parseRepo('https://github.com/lsalik2/Chroma.git')).toEqual({ owner: 'lsalik2', name: 'Chroma' });
  });
  it('keeps dots inside the repo name', () => {
    expect(parseRepo('https://github.com/lsalik2/lsalik.dev')).toEqual({ owner: 'lsalik2', name: 'lsalik.dev' });
  });
  it('returns null for non-GitHub hosts', () => {
    expect(parseRepo('https://gitlab.com/a/b')).toBeNull();
  });
  it('returns null for garbage and undefined', () => {
    expect(parseRepo('not a url')).toBeNull();
    expect(parseRepo(undefined)).toBeNull();
  });
});

describe('repoKey', () => {
  it('joins owner/name lowercased', () => {
    expect(repoKey('Lsalik2', 'Chroma')).toBe('lsalik2/chroma');
  });
});

describe('repoApiToStats', () => {
  it('maps the GitHub API fields', () => {
    expect(repoApiToStats({ stargazers_count: 9, pushed_at: '2026-01-01T00:00:00Z' }))
      .toEqual({ stars: 9, pushedAt: '2026-01-01T00:00:00Z' });
  });
});

describe('statsForRepo', () => {
  const map: StatsMap = { 'lsalik2/chroma': { stars: 12, pushedAt: '2026-01-01T00:00:00Z' } };
  it('finds stats for a known repo (case-insensitive)', () => {
    expect(statsForRepo('https://github.com/lsalik2/Chroma', map)).toEqual({ stars: 12, pushedAt: '2026-01-01T00:00:00Z' });
  });
  it('returns null when the repo is absent from the map', () => {
    expect(statsForRepo('https://github.com/lsalik2/Other', map)).toBeNull();
  });
  it('returns null for closed-source (undefined repo)', () => {
    expect(statsForRepo(undefined, map)).toBeNull();
  });
});

describe('mergeStats', () => {
  it('keeps prior entries when fresh omits them (last-known cache)', () => {
    const prev: StatsMap = { a: { stars: 1, pushedAt: 'x' }, b: { stars: 2, pushedAt: 'y' } };
    const fresh: StatsMap = { a: { stars: 5, pushedAt: 'z' } };
    expect(mergeStats(prev, fresh)).toEqual({ a: { stars: 5, pushedAt: 'z' }, b: { stars: 2, pushedAt: 'y' } });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/github-stats.test.ts`
Expected: FAIL — `Failed to resolve import '../../src/lib/github-stats'` / functions not defined.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/github-stats.ts`:

```ts
// Pure helpers for GitHub project stats. No I/O — the build integration does
// the fetching and passes raw API objects through repoApiToStats/mergeStats.

export interface RepoStats {
  stars: number;
  pushedAt: string; // ISO 8601, from the repo's `pushed_at`
}

// Keyed by lowercased "owner/name".
export type StatsMap = Record<string, RepoStats>;

export function parseRepo(
  url: string | undefined,
): { owner: string; name: string } | null {
  if (!url) return null;
  let pathname: string;
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null;
    pathname = u.pathname;
  } catch {
    return null;
  }
  const m = pathname.match(/^\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) return null;
  return { owner: m[1], name: m[2] };
}

export function repoKey(owner: string, name: string): string {
  return `${owner}/${name}`.toLowerCase();
}

export function repoApiToStats(json: {
  stargazers_count: number;
  pushed_at: string;
}): RepoStats {
  return { stars: json.stargazers_count, pushedAt: json.pushed_at };
}

export function statsForRepo(
  repoUrl: string | undefined,
  map: StatsMap,
): RepoStats | null {
  const parsed = parseRepo(repoUrl);
  if (!parsed) return null;
  return map[repoKey(parsed.owner, parsed.name)] ?? null;
}

// Fresh values win; repos absent from `fresh` keep their prior value, so a
// failed/skipped fetch never wipes last-known stats.
export function mergeStats(prev: StatsMap, fresh: StatsMap): StatsMap {
  return { ...prev, ...fresh };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/github-stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github-stats.ts tests/lib/github-stats.test.ts
git commit -m "feat: add github-stats pure lib (parse, lookup, merge)"
```

---

### Task 2: Pure lib — formatting helpers

**Files:**
- Modify: `src/lib/github-stats.ts` (append after `mergeStats`)
- Test: `tests/lib/github-stats.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Add `formatStars`, `relativeTime`, `formatStatsText` to the import block in `tests/lib/github-stats.test.ts`, then append:

```ts
describe('formatStars', () => {
  it('shows small counts verbatim', () => {
    expect(formatStars(0)).toBe('0');
    expect(formatStars(42)).toBe('42');
    expect(formatStars(999)).toBe('999');
  });
  it('compacts thousands with a k suffix', () => {
    expect(formatStars(1000)).toBe('1k');
    expect(formatStars(1234)).toBe('1.2k');
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-06-13T00:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;
  it('says just now under a minute', () => {
    expect(relativeTime(ago(30 * SEC), now)).toBe('just now');
  });
  it('formats minutes, hours, days', () => {
    expect(relativeTime(ago(5 * MIN), now)).toBe('5m ago');
    expect(relativeTime(ago(3 * HOUR), now)).toBe('3h ago');
    expect(relativeTime(ago(3 * DAY), now)).toBe('3d ago');
  });
  it('formats weeks, months, years', () => {
    expect(relativeTime(ago(10 * DAY), now)).toBe('1w ago');
    expect(relativeTime(ago(60 * DAY), now)).toBe('2mo ago');
    expect(relativeTime(ago(400 * DAY), now)).toBe('1y ago');
  });
});

describe('formatStatsText', () => {
  it('composes the stars + relative-time line', () => {
    const now = new Date('2026-06-13T00:00:00Z');
    const pushedAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatStatsText({ stars: 42, pushedAt }, now)).toBe('★ 42 · updated 3d ago');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/github-stats.test.ts`
Expected: FAIL — `formatStars`/`relativeTime`/`formatStatsText` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/github-stats.ts`:

```ts
export function formatStars(n: number): string {
  if (n < 1000) return String(n);
  const s = (n / 1000).toFixed(1);
  return (s.endsWith('.0') ? s.slice(0, -2) : s) + 'k';
}

export function relativeTime(iso: string, now: Date): string {
  const secs = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function formatStatsText(stats: RepoStats, now: Date): string {
  return `★ ${formatStars(stats.stars)} · updated ${relativeTime(stats.pushedAt, now)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/github-stats.test.ts`
Expected: PASS (all Task 1 + Task 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/github-stats.ts tests/lib/github-stats.test.ts
git commit -m "feat: add github-stats formatting helpers"
```

---

### Task 3: Build integration + committed data file

**Files:**
- Create: `src/integrations/github-stats.ts`
- Create: `src/data/github-stats.json`
- Modify: `astro.config.mjs`

No unit test (network/fs I/O shell, like `og-images.ts`); the pure pieces it uses are already tested. Verified by a successful build that populates the JSON.

- [ ] **Step 1: Create the initial (empty) data file**

Create `src/data/github-stats.json` so the static imports in later tasks resolve even before the first successful fetch:

```json
{}
```

- [ ] **Step 2: Write the integration**

Create `src/integrations/github-stats.ts`:

```ts
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { AstroIntegration } from 'astro';
import {
  parseRepo,
  repoKey,
  repoApiToStats,
  mergeStats,
  type RepoStats,
  type StatsMap,
} from '../lib/github-stats';

// createRequire so js-yaml loads via CJS; the Vite module runner that would
// resolve a dynamic ESM import is not guaranteed available inside this hook.
const _require = createRequire(import.meta.url);

function frontmatter(raw: string): Record<string, unknown> {
  const match = raw.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!match) return {};
  const { load } = _require('js-yaml') as typeof import('js-yaml');
  return (load(match[1]) ?? {}) as Record<string, unknown>;
}

async function collectRepos(projectsDir: string): Promise<string[]> {
  let files: string[];
  try {
    files = await readdir(projectsDir, { recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const repos: string[] = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const data = frontmatter(await readFile(join(projectsDir, file), 'utf-8'));
    if (typeof data.repo === 'string') repos.push(data.repo);
  }
  return repos;
}

async function fetchOne(repoUrl: string): Promise<{ key: string; stats: RepoStats } | null> {
  const parsed = parseRepo(repoUrl);
  if (!parsed) return null;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'lsalik.dev-build',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.name}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { stargazers_count: number; pushed_at: string };
  return { key: repoKey(parsed.owner, parsed.name), stats: repoApiToStats(json) };
}

export default function githubStats(): AstroIntegration {
  return {
    name: 'github-stats',
    hooks: {
      // build-only: dev reads the committed JSON, no network on `astro dev`.
      'astro:build:start': async ({ logger }) => {
        const root = fileURLToPath(new URL('../..', import.meta.url));
        const projectsDir = join(root, 'src', 'content', 'projects');
        const dataFile = join(root, 'src', 'data', 'github-stats.json');

        let existing: StatsMap = {};
        try {
          existing = JSON.parse(await readFile(dataFile, 'utf-8')) as StatsMap;
        } catch {
          // missing/unparseable → start from empty
        }

        const repos = await collectRepos(projectsDir);
        const fresh: StatsMap = {};
        let ok = 0;
        let failed = 0;
        for (const repo of repos) {
          try {
            const r = await fetchOne(repo);
            if (r) {
              fresh[r.key] = r.stats;
              ok++;
            }
          } catch (err) {
            failed++;
            logger.warn(`failed: ${repo}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        const merged = mergeStats(existing, fresh);
        const sorted: StatsMap = {};
        for (const k of Object.keys(merged).sort()) sorted[k] = merged[k];
        await writeFile(dataFile, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
        logger.info(`fetched ${ok} repo stat(s); ${failed} failed; ${Object.keys(sorted).length} total`);
      },
    },
  };
}
```

- [ ] **Step 3: Register the integration**

In `astro.config.mjs`, add the import and include it:

```js
import ogImages from './src/integrations/og-images.ts';
import githubStats from './src/integrations/github-stats.ts';
```

and change the integrations array to:

```js
  integrations: [ogImages(), githubStats()],
```

- [ ] **Step 4: Build to populate the data file**

Run: `npm run build`
Expected: build completes; log line `fetched N repo stat(s); 0 failed; N total`. Then confirm the file is populated:

Run: `cat src/data/github-stats.json`
Expected: a JSON object with keys for the public repos, e.g. `"lsalik2/chroma"`, `"lsalik2/lsalik.dev"`, `"lsalik2/flipperanimationswitcher"`, `"lsalik2/synergy"`, each with numeric `stars` and an ISO `pushedAt`.

Note: if the build environment has no outbound network to `api.github.com`, the log will show failures and the JSON stays `{}`. In that case, seed real values manually so local verification of Tasks 4–6 is meaningful:
`curl -s https://api.github.com/repos/lsalik2/Chroma | grep -E 'stargazers_count|pushed_at'` and write the map by hand (keys lowercased `owner/name`). Vercel's build will refresh it regardless.

- [ ] **Step 5: Verify the existing suite still passes**

Run: `npm test`
Expected: PASS (unchanged count + the new github-stats tests).

- [ ] **Step 6: Commit**

```bash
git add src/integrations/github-stats.ts src/data/github-stats.json astro.config.mjs
git commit -m "feat: fetch GitHub project stats at build via integration"
```

---

### Task 4: Terminal renderer + middleware wiring

**Files:**
- Modify: `src/curl/render.ts` (`ProjectSummary`, `ProjectPostFull`, `renderProjectsIndex`, `renderProjectPost`)
- Modify: `src/middleware.ts` (project index + detail blocks)
- Test: `tests/curl/render.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/curl/render.test.ts`, add two tests inside the existing `describe('renderProjectsIndex', ...)` block (the `projects` fixture and `stripAnsi` are already in scope there):

```ts
  it('includes the stats line when provided', () => {
    const withStats: ProjectSummary[] = [{ ...projects[0], stats: '★ 42 · updated 3d ago' }];
    expect(stripAnsi(renderProjectsIndex(withStats))).toContain('★ 42 · updated 3d ago');
  });

  it('omits the star glyph when stats are absent', () => {
    expect(stripAnsi(renderProjectsIndex(projects))).not.toContain('★');
  });
```

And add one test inside the existing `describe('renderProjectPost', ...)` block (the `project` fixture is in scope):

```ts
  it('includes the stats line when provided', () => {
    const out = stripAnsi(renderProjectPost({ ...project, stats: '★ 7 · updated 1w ago' }));
    expect(out).toContain('★ 7 · updated 1w ago');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/curl/render.test.ts`
Expected: FAIL — `stats` not on the type / star glyph not rendered.

- [ ] **Step 3: Implement renderer changes**

In `src/curl/render.ts`, add `stats?: string;` to both interfaces:

```ts
export interface ProjectPostFull {
  title: string;
  status: string;
  stack: string[];
  content: string;
  stats?: string;
}
```

```ts
export interface ProjectSummary {
  slug: string;
  title: string;
  date: string;
  stack: string[];
  status: string;
  description: string;
  permissions: string;
  repo?: string;
  url?: string;
  stats?: string;
}
```

Replace `renderProjectPost`:

```ts
export function renderProjectPost(project: ProjectPostFull): string {
  const meta = `${dim(project.status)} · ${project.stack.join(' · ')}`;
  const headerLines = [bold(project.title), meta];
  if (project.stats) headerLines.push(dim(project.stats));
  const headerBox = box(headerLines, { title: project.title });
  return [headerBox, '', project.content].join('\n');
}
```

In `renderProjectsIndex`, replace the per-project `return box([...])` so the stats line sits between the stack and repo lines:

```ts
    const stack = dim(project.stack.join(' · '));
    const repoLink = project.repo ? `${cyan('→')} ${project.repo}` : dim('→ closed source');
    const url = cyan(`curl -L lsalik.dev/projects/${project.slug}`);
    const lines = [topLine, project.description, stack];
    if (project.stats) lines.push(dim(project.stats));
    lines.push(repoLink, url);
    return box(lines);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/curl/render.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire stats into middleware**

In `src/middleware.ts`, add imports near the other render imports at the top of the file:

```ts
import statsMap from './data/github-stats.json';
import { statsForRepo, formatStatsText, type StatsMap } from './lib/github-stats';
```

In the `/projects` index block, set `stats` on each mapped object (add the field after `url`):

```ts
      .map(project => {
        const s = statsForRepo(project.data.repo, statsMap as StatsMap);
        return {
          slug: project.id,
          title: project.data.title,
          date: project.data.date.toISOString().slice(0, 10),
          stack: project.data.stack,
          status: project.data.status,
          description: stripDangerousEscapes(project.data.description),
          permissions: project.data.permissions,
          repo: project.data.repo,
          url: project.data.url,
          stats: s ? formatStatsText(s, new Date()) : undefined,
        };
      });
```

In the project detail block, add `stats` to the `renderProjectPost({ ... })` call:

```ts
    const s = statsForRepo(entry.data.repo, statsMap as StatsMap);
    return textResponse(
      renderProjectPost({
        title: entry.data.title,
        status: entry.data.status,
        stack: entry.data.stack,
        content,
        stats: s ? formatStatsText(s, new Date()) : undefined,
      })
    );
```

- [ ] **Step 6: Verify the terminal view end-to-end**

Run: `npm run build` then in a second shell `npm run dev`, and:
`curl -s localhost:4321/projects | grep -o '★ [0-9].*ago' | head` — expect at least one stats line (assuming the JSON was populated in Task 3).
`curl -s localhost:4321/projects/slkbot | grep -o '★ [0-9].*ago'` — expect the SLKBOT repo's stats line.

- [ ] **Step 7: Commit**

```bash
git add src/curl/render.ts src/middleware.ts tests/curl/render.test.ts
git commit -m "feat: show GitHub stats in terminal project views"
```

---

### Task 5: Browser detail page

**Files:**
- Modify: `src/pages/projects/[...slug].astro`

No unit test (`.astro` template); verified by SSR output.

- [ ] **Step 1: Add the lookup in frontmatter**

In `src/pages/projects/[...slug].astro`, add imports and the lookup in the frontmatter fence (after the existing `import` lines and the `stackStr` line):

```ts
import statsMap from '../../data/github-stats.json';
import { statsForRepo, formatStars, relativeTime, type StatsMap } from '../../lib/github-stats';
```

```ts
const repoStats = statsForRepo(project.data.repo, statsMap as StatsMap);
```

- [ ] **Step 2: Render the stats row**

Immediately after the Repo `meta-row` block in the template, add:

```astro
      {repoStats && (
        <div class="meta-row">
          <span class="meta-key">GitHub</span>
          <span class="meta-value muted">★ {formatStars(repoStats.stars)} · updated {relativeTime(repoStats.pushedAt, new Date())}</span>
        </div>
      )}
```

- [ ] **Step 3: Verify SSR output**

Run: `npm run build` then `npm run dev`, then:
`curl -s -A "Mozilla/5.0" localhost:4321/projects/slkbot | grep -o '★ [0-9][^<]*'`
Expected: a `★ N · updated …` string in the meta block (browser/HTML response). A closed-source project (e.g. `/projects/slkards`) should show no `★`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/projects/[...slug].astro
git commit -m "feat: show GitHub stats on project detail page"
```

---

### Task 6: Browser project list

**Files:**
- Modify: `src/pages/projects/index.astro`

No unit test (`.astro` template); verified by SSR output.

- [ ] **Step 1: Add imports**

In `src/pages/projects/index.astro` frontmatter, after the existing imports:

```ts
import statsMap from '../../data/github-stats.json';
import { statsForRepo, formatStars, relativeTime, type StatsMap } from '../../lib/github-stats';
```

- [ ] **Step 2: Render a per-card stats line**

In the template, inside the `projects.map(project => (...))` card, add this block immediately after the `<div class="project-status">…</div>` line:

```astro
          {(() => {
            const s = statsForRepo(project.data.repo, statsMap as StatsMap);
            return s ? (
              <div class="project-stats">★ {formatStars(s.stars)} · updated {relativeTime(s.pushedAt, new Date())}</div>
            ) : null;
          })()}
```

- [ ] **Step 3: Add the card stats style**

In the `<style>` block, add:

```css
  .project-stats {
    font-size: 0.8rem;
    color: var(--fg-muted);
    margin-bottom: 0.5rem;
  }
```

- [ ] **Step 4: Verify SSR output**

Run: `npm run build` then `npm run dev`, then:
`curl -s -A "Mozilla/5.0" localhost:4321/projects | grep -o '★ [0-9][^<]*' | head`
Expected: one stats line per open-source project; closed-source projects render no `★`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/projects/index.astro
git commit -m "feat: show GitHub stats on project list cards"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full suite + build**

Run: `npm test`
Expected: PASS (all suites).

Run: `npm run build`
Expected: build completes; integration logs `fetched N repo stat(s)`.

- [ ] **Step 2: Confirm no uncommitted changes besides the (possibly refreshed) data file**

Run: `git status --short`
Expected: clean, or only `src/data/github-stats.json` if the final build refreshed values — if so, `git add` it and amend/commit:

```bash
git add src/data/github-stats.json
git commit -m "chore: refresh github-stats data" --no-edit || true
```

---

## Self-Review

**Spec coverage:**
- Build-time fetch via integration (`astro:build:start`) → Task 3. ✓
- Committed `github-stats.json` as last-known cache → Task 3 (file) + `mergeStats` (Tasks 1/3). ✓
- Optional `GITHUB_TOKEN` → Task 3 `fetchOne`. ✓
- Stars + last commit, `★ 42 · updated 3d ago` → Task 2 (`formatStatsText`) + Tasks 4–6. ✓
- All four surfaces: terminal index/post (Task 4), browser detail (Task 5), browser list (Task 6). ✓
- Closed-source omitted → `statsForRepo` returns null; every consumer guards on it (Tasks 4–6). ✓
- Graceful degrade / never fail build → Task 3 per-repo try/catch, `mergeStats`, no throw. ✓
- Pure helpers fully tested → Tasks 1–2; renderer stats tested → Task 4. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `RepoStats {stars, pushedAt}`, `StatsMap`, `parseRepo`, `repoKey`, `repoApiToStats`, `statsForRepo`, `mergeStats`, `formatStars`, `relativeTime`, `formatStatsText`, and the `ProjectSummary.stats` / `ProjectPostFull.stats` fields are named identically across the lib (Tasks 1–2), the integration (Task 3), the renderer/middleware (Task 4), and the pages (Tasks 5–6). The middleware/pages cast the imported JSON as `StatsMap`. ✓

**Note:** Tasks 5–6 are not unit-tested because `.astro` templates aren't exercised by Vitest; they're verified via SSR `curl` output, and all of their non-trivial logic (lookup + formatting) lives in the unit-tested lib.
