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
