import { describe, it, expect } from 'vitest';
import {
  parseRepo,
  repoKey,
  repoApiToStats,
  statsForRepo,
  mergeStats,
  formatStars,
  relativeTime,
  formatStatsText,
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
