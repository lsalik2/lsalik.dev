import { describe, it, expect } from 'vitest';
import { matchesFilter, type PostMeta } from '../../src/lib/blog-filter';

const post: PostMeta = {
  title: 'Hello, World!',
  description: 'First post on lsalik.dev for testing purposes.',
  tags: ['meta', 'webdev'],
};

describe('matchesFilter', () => {
  it('returns true with empty query and no active tags', () => {
    expect(matchesFilter(post, '', new Set())).toBe(true);
  });

  it('ignores whitespace-only queries', () => {
    expect(matchesFilter(post, '   ', new Set())).toBe(true);
  });

  it('matches a substring of the title (case-insensitive)', () => {
    expect(matchesFilter(post, 'HELLO', new Set())).toBe(true);
  });

  it('matches a substring of the description', () => {
    expect(matchesFilter(post, 'testing', new Set())).toBe(true);
  });

  it('matches a substring of a tag', () => {
    expect(matchesFilter(post, 'web', new Set())).toBe(true);
  });

  it('returns false when the query matches nothing', () => {
    expect(matchesFilter(post, 'kubernetes', new Set())).toBe(false);
  });

  it('returns true when every active tag is on the post', () => {
    expect(matchesFilter(post, '', new Set(['meta']))).toBe(true);
    expect(matchesFilter(post, '', new Set(['meta', 'webdev']))).toBe(true);
  });

  it('returns false when any active tag is missing from the post', () => {
    expect(matchesFilter(post, '', new Set(['security']))).toBe(false);
    expect(matchesFilter(post, '', new Set(['meta', 'security']))).toBe(false);
  });

  it('requires both tag and query conditions to pass', () => {
    expect(matchesFilter(post, 'hello', new Set(['meta']))).toBe(true);
    expect(matchesFilter(post, 'hello', new Set(['security']))).toBe(false);
    expect(matchesFilter(post, 'kubernetes', new Set(['meta']))).toBe(false);
  });
});
