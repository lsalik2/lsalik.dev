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
