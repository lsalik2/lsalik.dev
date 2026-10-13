import { describe, it, expect } from 'vitest';
import { FORTUNES, pickFortune } from '../../src/data/fortunes';

describe('FORTUNES', () => {
  it('has the 19 approved lines, no duplicates, no empties', () => {
    expect(FORTUNES).toHaveLength(19);
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
