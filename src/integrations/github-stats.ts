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
