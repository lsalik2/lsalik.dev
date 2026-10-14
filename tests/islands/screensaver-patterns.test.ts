import { describe, it, expect } from 'vitest';
import {
  hash01,
  rain,
  drizzle,
  stars,
  dust,
  starOnRay,
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
  // [name, pattern, feature, texture, does the muted layer also carry the feature?]
  ['matrix', matrix, rain, drizzle, true],
  ['starfield', starfield, stars, dust, false],
] as [string, Field, Field, Field, boolean][])('%s, composed', (_, field, feature, texture, mutedFeature) => {
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

  it('draws the texture only on the muted layer', () => {
    for (let x = 0; x < ctx.cols; x += 5) {
      for (let y = 0; y < ctx.rows; y += 3) {
        for (const t of [1.7, 9]) {
          for (const phase of LAYER_PHASES) {
            const f = feature(x, y, t, phase, ctx);
            const tex = texture(x, y, t, phase, ctx);
            const expected = phase !== MUTED ? f : mutedFeature ? Math.max(f, tex) : tex;
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
  const BRIGHT = [LAYER_PHASES[0], LAYER_PHASES[2]]; // the layers starfield draws stars on
  const cx = ctx.cols / 2;
  const cy = ctx.rows / 2;
  // Share of cells with a star (bright layers), overall and within the core.
  const coverage = () => {
    let all = 0, core = 0, n = 0, coreN = 0;
    for (const t of [1, 4.2, 9.9, 30]) {
      for (let y = 0; y < ctx.rows; y++) {
        for (let x = 0; x < ctx.cols; x++) {
          const lit = BRIGHT.some(p => stars(x, y, t, p, ctx) > 0);
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

  it('moves every star outward, never inward', () => {
    // The outer ends of the lit stretches along one ray, finely sampled.
    const heads = (t: number, speed: number, offset: number) => {
      const out: number[] = [];
      let prev = false;
      for (let i = 20; i <= 3000; i++) {
        const r = i / 10;
        const lit = starOnRay(r, t, speed, offset, 1) > 0;
        if (prev && !lit) out.push(r);
        prev = lit;
      }
      return out;
    };
    let checked = 0, moved = 0;
    for (const [speed, offset] of [[0.15, 0.1], [0.25, 0.6], [0.3, 0.33]]) {
      for (const t of [1, 3.7, 8.2]) {
        const now = heads(t, speed, offset);
        const next = heads(t + 0.02, speed, offset);
        for (const h of now) {
          if (h >= 250) continue;
          checked++;
          expect(next.some(h2 => h2 >= h && h2 < h + 40)).toBe(true);
          if (next.some(h2 => h2 > h && h2 < h + 40)) moved++;
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(6);
    expect(moved / checked).toBeGreaterThanOrEqual(0.6);
  });

  it('draws streaks as continuous lines, not dots', () => {
    // Away from the core, lit cells (nearest layer) should sit in 8-connected runs of 3 or more.
    const g = { cols: 160, rows: 50 };
    let inRuns = 0, far = 0;
    for (const t of [3.1, 7.3, 12.9, 20.4]) {
      const lit = new Uint8Array(g.cols * g.rows);
      for (let y = 0; y < g.rows; y++) {
        for (let x = 0; x < g.cols; x++) if (stars(x, y, t, LAYER_PHASES[0], g) > 0) lit[y * g.cols + x] = 1;
      }
      const seen = new Uint8Array(lit.length);
      for (let i = 0; i < lit.length; i++) {
        if (!lit[i] || seen[i]) continue;
        const run: number[] = [];
        const stack = [i];
        seen[i] = 1;
        while (stack.length) {
          const j = stack.pop()!;
          run.push(j);
          const x = j % g.cols, y = Math.floor(j / g.cols);
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              const X = x + ox, Y = y + oy;
              if (X < 0 || Y < 0 || X >= g.cols || Y >= g.rows) continue;
              const k = Y * g.cols + X;
              if (lit[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
            }
          }
        }
        for (const j of run) {
          const x = j % g.cols, y = Math.floor(j / g.cols);
          if (Math.hypot(x - g.cols / 2, (y - g.rows / 2) * 2) > 30) {
            far++;
            if (run.length >= 3) inRuns++;
          }
        }
      }
    }
    expect(far).toBeGreaterThan(100);
    expect(inRuns / far).toBeGreaterThanOrEqual(0.9);
  });

  it('draws plenty of streaks', () => {
    const { all } = coverage();
    expect(all).toBeGreaterThan(0.15);
    expect(all).toBeLessThan(0.4);
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
