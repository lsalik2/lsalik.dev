import { describe, it, expect } from 'vitest';
import { FORTUNES, pickFortune } from '../../src/data/fortunes';
import { renderFortune } from '../../src/curl/render';
import { visibleWidth } from '../../src/curl/ansi';

describe('FORTUNES', () => {
  it('has the 43 approved lines, no duplicates, no empties', () => {
    expect(FORTUNES).toHaveLength(43);
    expect(new Set(FORTUNES).size).toBe(FORTUNES.length);
    for (const f of FORTUNES) expect(f.trim().length).toBeGreaterThan(0);
  });

  it('is plain text (no markdown) and short enough for a speech bubble', () => {
    for (const f of FORTUNES) {
      expect(f).not.toMatch(/[`*_]/);
      expect(f.length).toBeLessThanOrEqual(90);
    }
  });

  it('never names the cats (too specific for strangers)', () => {
    for (const f of FORTUNES) expect(f).not.toMatch(/finch|raven/i);
  });
});

describe('pickFortune', () => {
  it('is driven by the rng and always returns a fortune', () => {
    expect(pickFortune(() => 0)).toBe(FORTUNES[0]);
    expect(pickFortune(() => 0.999999)).toBe(FORTUNES[FORTUNES.length - 1]);
    for (let i = 0; i < 50; i++) expect(FORTUNES).toContain(pickFortune());
  });
});

describe('every fortune in its bubble', () => {
  it('fits the homepage widths (40 columns, 26 on phones) and the default 80', () => {
    for (const f of FORTUNES) {
      for (const width of [26, 40, 80]) {
        for (const line of renderFortune(f, width).split('\n')) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
      }
    }
  });
});
