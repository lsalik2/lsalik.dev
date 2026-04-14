import { describe, it, expect } from 'vitest';
import { readingTime } from '../../src/lib/reading-time';

describe('readingTime', () => {
  it('returns at least 1 minute for short or empty input', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime('hello world')).toBe(1);
  });

  it('rounds to the nearest minute at 200 wpm', () => {
    const words = (n: number) => Array(n).fill('word').join(' ');
    expect(readingTime(words(200))).toBe(1);
    expect(readingTime(words(400))).toBe(2);
    expect(readingTime(words(500))).toBe(3);
  });

  it('handles multiple whitespace characters as single separators', () => {
    expect(readingTime('one   two\ttree\n\nfour')).toBe(1);
  });
});
