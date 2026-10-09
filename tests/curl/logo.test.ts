import { describe, it, expect } from 'vitest';
import {
  renderLogo,
  generatePattern,
  isAcceptable,
  LOGO_WIDTH,
  LOGO_HEIGHT,
} from '../../src/curl/logo';

import { stripAnsi } from '../../src/curl/ansi';

// Small deterministic PRNG (mulberry32) so seeded runs are reproducible.
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fill(pattern: readonly string[]): number {
  const on = pattern.join('').split('').filter(ch => ch === '#').length;
  return on / (LOGO_WIDTH * LOGO_HEIGHT);
}

describe('generatePattern', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => i + 1);

  it('produces an 8×17 grid of # and .', () => {
    const p = generatePattern(seeded(1));
    expect(p).toHaveLength(LOGO_HEIGHT);
    for (const row of p) expect(row).toMatch(/^[#.]{17}$/);
  });

  it('is horizontally mirrored', () => {
    for (const seed of seeds) {
      for (const row of generatePattern(seeded(seed))) {
        expect(row).toBe([...row].reverse().join(''));
      }
    }
  });

  it('keeps fill within bounds, no empty rows, and a populated center column', () => {
    for (const seed of seeds) {
      const p = generatePattern(seeded(seed));
      const f = fill(p);
      expect(f).toBeGreaterThanOrEqual(0.35);
      expect(f).toBeLessThanOrEqual(0.65);
      for (const row of p) expect(row).toContain('#');
      const center = p.filter(row => row[(LOGO_WIDTH - 1) / 2] === '#').length;
      expect(center).toBeGreaterThanOrEqual(2);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(generatePattern(seeded(42))).toEqual(generatePattern(seeded(42)));
  });

  it('varies across seeds', () => {
    const unique = new Set(seeds.map(s => generatePattern(seeded(s)).join('/')));
    expect(unique.size).toBe(seeds.length);
  });

  it('returns the last attempt rather than looping forever on a hostile rng', () => {
    // An rng stuck at 0 fills every cell — never acceptable — but must still return.
    const p = generatePattern(() => 0);
    expect(p).toHaveLength(LOGO_HEIGHT);
  });
});

describe('isAcceptable', () => {
  const full = Array.from({ length: LOGO_HEIGHT }, () => '#'.repeat(LOGO_WIDTH));
  const empty = Array.from({ length: LOGO_HEIGHT }, () => '.'.repeat(LOGO_WIDTH));

  it('rejects solid and blank grids', () => {
    expect(isAcceptable(full)).toBe(false);
    expect(isAcceptable(empty)).toBe(false);
  });
});

describe('renderLogo', () => {
  const logo = renderLogo(seeded(7));
  const lines = logo.split('\n');

  it('returns exactly 6 lines (4 pattern rows + 2 bars)', () => {
    expect(lines).toHaveLength(6);
  });

  it('uses only half-block glyphs and spaces in the visible output', () => {
    const allowed = new Set([' ', '▀', '▄', '█']);
    for (const line of lines) {
      for (const ch of stripAnsi(line)) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it('has balanced ANSI open/reset codes on every line', () => {
    for (const line of lines) {
      const opens = (line.match(/\x1b\[(3[1-9]|38;5;\d+)m/g) ?? []).length;
      const resets = (line.match(/\x1b\[(0|39)m/g) ?? []).length;
      expect(resets).toBeGreaterThanOrEqual(opens > 0 ? 1 : 0);
    }
  });

  it('has stable 17-character width on every row after stripping ANSI', () => {
    for (const line of lines) {
      expect([...stripAnsi(line)].length).toBe(17);
    }
  });

  it('packs the pattern rows in pairs into half-blocks', () => {
    const rng = seeded(99);
    const pattern = generatePattern(seeded(99));
    const top = stripAnsi(renderLogo(rng).split('\n')[0]);
    const expected = [...pattern[0]].map((t, i) => {
      const b = pattern[1][i];
      if (t === '#' && b === '#') return '█';
      if (t === '#') return '▀';
      if (b === '#') return '▄';
      return ' ';
    }).join('');
    expect(top).toBe(expected);
  });

  it('defaults to Math.random and differs between calls', () => {
    const a = new Set(Array.from({ length: 10 }, () => stripAnsi(renderLogo())));
    expect(a.size).toBeGreaterThan(1);
  });
});
