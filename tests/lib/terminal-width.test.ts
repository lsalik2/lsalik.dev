import { describe, it, expect } from 'vitest';
import { parseCols, MIN_COLS, MAX_COLS, DEFAULT_COLS } from '../../src/lib/terminal-width';

describe('parseCols', () => {
  it('defaults to 80 without a cols param', () => {
    expect(DEFAULT_COLS).toBe(80);
    expect(parseCols('')).toBe(80);
    expect(parseCols('?page=2')).toBe(80);
  });

  it('reads an integer cols param', () => {
    expect(parseCols('?cols=120')).toBe(120);
    expect(parseCols('?x=1&cols=60')).toBe(60);
  });

  it('clamps to the supported range', () => {
    expect(parseCols('?cols=10')).toBe(MIN_COLS);
    expect(parseCols('?cols=9999')).toBe(MAX_COLS);
    expect(MIN_COLS).toBe(40);
    expect(MAX_COLS).toBe(160);
  });

  it('ignores junk, empty, fractional or negative values', () => {
    for (const q of ['?cols=', '?cols=abc', '?cols=12.5', '?cols=-50', '?cols=80px', '?cols=$COLUMNS']) {
      expect(parseCols(q)).toBe(80);
    }
  });
});
