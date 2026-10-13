import { describe, it, expect } from 'vitest';
import { FINCH, RAVEN, FORTUNE_CAT } from '../../src/curl/cats';
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

  it('/ssh draws both cats unshifted', () => {
    const out = stripAnsi(renderSsh());
    for (const line of FINCH) expect(out).toContain(`│    ${line}`);
    for (const line of RAVEN) expect(out).toContain(`│   ${line}`);
  });
});
