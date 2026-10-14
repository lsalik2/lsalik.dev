import { describe, it, expect } from 'vitest';
import { FINCH, FINCH_MASK, RAVEN, RAVEN_MASK, FORTUNE_CAT, paintCat } from '../../src/curl/cats';
import { renderFortune, renderSsh } from '../../src/curl/render';
import { stripAnsi } from '../../src/curl/ansi';

const left = (line: string) => line.search(/\S/);
const right = (line: string) => line.trimEnd().length - 1;
// Midpoint of a line's first and last drawn columns.
const centre = (line: string) => (left(line) + right(line)) / 2;

const CATS = { FINCH, RAVEN, FORTUNE_CAT };

describe('cat art', () => {
  for (const [name, art] of Object.entries(CATS)) {
    it(`${name} is centred on a single column`, () => {
      expect(art.map(centre)).toEqual(art.map(() => centre(art[0])));
    });

    it(`${name}'s ears sit one column inside the head`, () => {
      expect(left(art[0])).toBe(left(art[1]) + 1);
      expect(right(art[0])).toBe(right(art[1]) - 1);
    });

    it(`${name} is flush-left`, () => {
      expect(Math.min(...art.map(left))).toBe(0);
    });
  }

  it('/fortune draws the cat unshifted under the bubble tail', () => {
    const lines = stripAnsi(renderFortune('Clear is better than clever.')).split('\n');
    expect(lines.slice(-3).map(l => l.slice(8))).toEqual(FORTUNE_CAT);
    expect(lines.at(-3)!.slice(0, 5)).toBe('    \\');
  });

  it('/ssh sits Raven beside Finch, bottoms aligned', () => {
    const lines = stripAnsi(renderSsh()).split('\n');
    const start = lines.findIndex(l => l.includes(FINCH[0]));
    const offset = FINCH.length - RAVEN.length;
    expect(start).toBeGreaterThan(-1);
    FINCH.forEach((row, i) => {
      const line = lines[start + i];
      expect(line).toContain(`│    ${row}`);
      const rest = line.slice(line.indexOf(row) + row.length);
      if (i < offset) expect(rest.trim()).toBe('│');
      else expect(rest).toContain(RAVEN[i - offset]);
    });
  });
});

describe('cat colours', () => {
  const MASKED = { FINCH: [FINCH, FINCH_MASK], RAVEN: [RAVEN, RAVEN_MASK] } as const;

  for (const [name, [art, mask]] of Object.entries(MASKED)) {
    it(`${name}'s mask only marks drawn characters`, () => {
      expect(mask).toHaveLength(art.length);
      mask.forEach((row, y) => {
        expect(row.length).toBeLessThanOrEqual(art[y].length);
        [...row].forEach((c, x) => {
          expect(' WEN').toContain(c);
          if (c !== ' ') expect(art[y][x]).not.toBe(' ');
        });
      });
    });

    it(`${name}'s eyes are marked as eyes`, () => {
      [...art[1]].forEach((c, x) => { if (c === 'o') expect(mask[1][x]).toBe('E'); });
    });

    it(`painting ${name} keeps the text intact`, () => {
      expect(paintCat(art, mask).map(stripAnsi)).toEqual(art);
    });
  }

  it('paints fur, white fur, eyes and nose in their own colours', () => {
    expect(paintCat(['/o|^'], [' EWN'])).toEqual([
      '\x1b[38;5;243m/\x1b[39m\x1b[38;5;150mo\x1b[39m\x1b[38;5;255m|\x1b[39m\x1b[38;5;218m^\x1b[39m',
    ]);
  });

  it('colours runs once and leaves spaces plain', () => {
    expect(paintCat(['/\\ ::'], ['   WW'])).toEqual(['\x1b[38;5;243m/\\\x1b[39m \x1b[38;5;255m::\x1b[39m']);
  });

  it('/ssh shows Finch in colour', () => {
    const out = renderSsh();
    expect(out).toContain('\x1b[38;5;150mo\x1b[39m');
    expect(out).toContain('\x1b[38;5;218m^\x1b[39m');
  });
});
