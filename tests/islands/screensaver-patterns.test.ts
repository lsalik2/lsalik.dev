import { describe, it, expect } from 'vitest';
import {
  hash01,
  rain,
  drizzle,
  stars,
  dust,
  matrix,
  starfield,
  AMBIENT_MIN,
  AMBIENT_MAX,
  SCREENSAVER_PRESETS,
} from '../../src/islands/screensaver/patterns';
import { LAYER_PHASES, PRESETS, RAMP, type Field } from '../../src/islands/ascii-bg';
import { PATTERN_NAMES } from '../../src/lib/screensaver-settings';

const ctx = { cols: 120, rows: 40 };
const inRange = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1;
const MUTED = LAYER_PHASES[1];

describe('hash01', () => {
  it('is deterministic, in [0, 1), and spread out', () => {
    expect(hash01(3, 7)).toBe(hash01(3, 7));
    expect(hash01(3, 7)).not.toBe(hash01(7, 3));
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      const h = hash01(i, 7);
      expect(h >= 0 && h < 1).toBe(true);
      sum += h;
    }
    expect(Math.abs(sum / 1000 - 0.5)).toBeLessThan(0.05);
  });
});

const FIELDS: [string, Field][] = [
  ['matrix', matrix], ['starfield', starfield], ['rain', rain], ['drizzle', drizzle], ['stars', stars], ['dust', dust],
];

describe.each(FIELDS)('%s', (_, field) => {
  it('stays within [0, 1] and is deterministic', () => {
    for (let x = 0; x < ctx.cols; x += 3) {
      for (let y = 0; y < ctx.rows; y += 2) {
        for (const t of [0, 2.5, 61.3]) {
          for (const phase of LAYER_PHASES) {
            const v = field(x, y, t, phase, ctx);
            expect(inRange(v)).toBe(true);
            expect(field(x, y, t, phase, ctx)).toBe(v);
          }
        }
      }
    }
  });

  it('handles odd inputs: negative and fractional coordinates (cursor parallax), long uptime', () => {
    for (const [x, y] of [[-3.5, 2.25], [0.4, -1.7], [119.9, 39.9]]) {
      for (const t of [0, 1e7]) {
        for (const phase of LAYER_PHASES) expect(inRange(field(x, y, t, phase, ctx))).toBe(true);
      }
    }
  });

  it('handles odd grids (resize, zoom)', () => {
    for (const g of [{ cols: 1, rows: 1 }, { cols: 2, rows: 200 }, { cols: 400, rows: 1 }]) {
      for (let x = 0; x < g.cols; x += Math.max(1, g.cols >> 3)) {
        for (let y = 0; y < g.rows; y += Math.max(1, g.rows >> 3)) {
          for (const phase of LAYER_PHASES) expect(inRange(field(x, y, 5, phase, g))).toBe(true);
        }
      }
    }
  });
});

describe.each([
  ['matrix', matrix, rain, drizzle],
  ['starfield', starfield, stars, dust],
] as [string, Field, Field, Field][])('%s, composed', (_, field, feature, texture) => {
  it('never leaves a cell blank', () => {
    for (const t of [0, 3.3, 61]) {
      for (let y = 0; y < ctx.rows; y++) {
        for (let x = 0; x < ctx.cols; x++) {
          const v = Math.max(...LAYER_PHASES.map(p => field(x, y, t, p, ctx)));
          expect(v).toBeGreaterThanOrEqual(1 / RAMP.length);
        }
      }
    }
  });

  it('draws the texture only on the muted layer, under the feature', () => {
    for (let x = 0; x < ctx.cols; x += 5) {
      for (let y = 0; y < ctx.rows; y += 3) {
        for (const t of [1.7, 9]) {
          for (const phase of LAYER_PHASES) {
            const f = feature(x, y, t, phase, ctx);
            const expected = phase === MUTED ? Math.max(f, texture(x, y, t, phase, ctx)) : f;
            expect(field(x, y, t, phase, ctx)).toBe(expected);
          }
        }
      }
    }
  });

  it('keeps the texture to the smallest glyphs (- _ : , ;)', () => {
    expect(AMBIENT_MIN).toBeGreaterThanOrEqual(1 / RAMP.length);
    expect(Math.floor(AMBIENT_MAX * RAMP.length)).toBeLessThanOrEqual(5);
    for (let x = 0; x < ctx.cols; x += 2) {
      for (let y = 0; y < ctx.rows; y++) {
        for (const t of [0, 4.4, 300]) {
          const v = texture(x, y, t, MUTED, ctx);
          expect(v).toBeGreaterThanOrEqual(AMBIENT_MIN);
          expect(v).toBeLessThanOrEqual(AMBIENT_MAX);
        }
      }
    }
  });

  it('moves the texture over time', () => {
    let changed = 0;
    let total = 0;
    for (let x = 0; x < ctx.cols; x += 2) {
      for (let y = 0; y < ctx.rows; y++) {
        total++;
        if (texture(x, y, 4, MUTED, ctx) !== texture(x, y, 4.5, MUTED, ctx)) changed++;
      }
    }
    expect(changed / total).toBeGreaterThan(0.3);
  });
});

describe('rain', () => {
  // The nearest layer (phase 0) draws its stream head at exactly 1.
  const headRow = (c: number, t: number) => {
    for (let y = 0; y < ctx.rows; y++) if (rain(c, y, t, 0, ctx) === 1) return y;
    return -1;
  };

  it('moves each stream head down', () => {
    let checked = 0;
    for (let c = 0; c < ctx.cols; c++) {
      const a = headRow(c, 3.3);
      const b = headRow(c, 3.8);
      if (a >= 0 && b >= 0) {
        checked++;
        expect(b).toBeGreaterThan(a);
      }
    }
    expect(checked).toBeGreaterThanOrEqual(5);
  });

  it('still moves after days of uptime', () => {
    let checked = 0;
    for (let c = 0; c < ctx.cols; c++) {
      const a = headRow(c, 1e7);
      const b = headRow(c, 1e7 + 0.5);
      if (a >= 0 && b >= 0) {
        checked++;
        expect(b).toBeGreaterThan(a);
      }
    }
    expect(checked).toBeGreaterThanOrEqual(3);
  });

  it('fades the tail behind the head', () => {
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    let checked = 0;
    for (let c = 0; c < ctx.cols; c++) {
      const h = headRow(c, 3.3);
      if (h < 8) continue;
      checked++;
      const near = [1, 2, 3].map(k => rain(c, h - k, 3.3, 0, ctx));
      const far = [6, 7].map(k => rain(c, h - k, 3.3, 0, ctx));
      expect(avg(near)).toBeGreaterThan(avg(far));
    }
    expect(checked).toBeGreaterThanOrEqual(3);
  });

  it('rains in most columns, with a few gaps', () => {
    let raining = 0;
    for (let c = 0; c < ctx.cols; c++) {
      let any = false;
      for (let t = 0; t <= 40 && !any; t += 2) {
        for (let y = 0; y < ctx.rows && !any; y++) if (rain(c, y, t, 0, ctx) > 0) any = true;
      }
      if (any) raining++;
    }
    expect(raining / ctx.cols).toBeGreaterThanOrEqual(0.6);
    expect(raining / ctx.cols).toBeLessThanOrEqual(0.85);
  });
});

describe('stars', () => {
  const cx = ctx.cols / 2;
  const cy = ctx.rows / 2;
  const AXES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // Distance (vertical counts double) of the outermost lit cell along an axis from the centre.
  const outermost = (ax: number, ay: number, t: number, phase: number) => {
    let best = -1;
    for (let k = 2; ; k++) {
      const x = cx + ax * k;
      const y = cy + ay * k;
      if (x < 0 || x >= ctx.cols || y < 0 || y >= ctx.rows) break;
      if (stars(x, y, t, phase, ctx) > 0) best = Math.max(best, Math.hypot(x - cx, (y - cy) * 2));
    }
    return best;
  };
  // Share of cells (all layers) with a star, overall and within the core.
  const coverage = () => {
    let all = 0, core = 0, n = 0, coreN = 0;
    for (const t of [1, 4.2, 9.9, 30]) {
      for (let y = 0; y < ctx.rows; y++) {
        for (let x = 0; x < ctx.cols; x++) {
          const lit = LAYER_PHASES.some(p => stars(x, y, t, p, ctx) > 0);
          n++;
          if (lit) all++;
          if (Math.hypot(x - cx, (y - cy) * 2) < 15) {
            coreN++;
            if (lit) core++;
          }
        }
      }
    }
    return { all: all / n, core: core / coreN };
  };

  it('moves stars outward, only jumping back when a new star starts near the centre', () => {
    let increased = 0;
    for (const phase of LAYER_PHASES) {
      for (const [ax, ay] of AXES) {
        let prev = outermost(ax, ay, 4.2, phase);
        for (let k = 1; k <= 40; k++) {
          const r = outermost(ax, ay, 4.2 + k * 0.05, phase);
          if (prev > 0 && r > 0) {
            if (r < prev) expect(r).toBeLessThanOrEqual(6);
            if (r > prev) increased++;
          }
          prev = r;
        }
      }
    }
    expect(increased).toBeGreaterThan(5);
  });

  it('draws a busy field: about a tenth of the cells', () => {
    const { all } = coverage();
    expect(all).toBeGreaterThan(0.08);
    expect(all).toBeLessThan(0.25);
  });

  it('fills the core', () => {
    expect(coverage().core).toBeGreaterThanOrEqual(0.22);
  });
});

describe('SCREENSAVER_PRESETS', () => {
  it('has a preset for every pattern name, in picker order', () => {
    expect(SCREENSAVER_PRESETS.map(p => p.name)).toEqual([...PATTERN_NAMES]);
  });

  it('adds only the two new patterns to the site six', () => {
    expect(SCREENSAVER_PRESETS.slice(0, PRESETS.length)).toEqual(PRESETS);
    expect(PRESETS).toHaveLength(6);
  });
});
