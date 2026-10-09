import { describe, it, expect } from 'vitest';
import {
  sample,
  charForBrightness,
  renderLayers,
  spotlight,
  applySpotlight,
  RAMP,
  LAYER_PHASES,
  LAYER_COLORS,
  PRESETS,
} from '../../src/islands/ascii-bg';

describe('sample', () => {
  it('returns values within [0, 1] across a grid of inputs', () => {
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 20; y++) {
        for (const t of [0, 1.5, 7.3]) {
          for (const phase of [0, 3.7, 7.2]) {
            const v = sample(x, y, t, phase);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('is deterministic for fixed inputs', () => {
    const a = sample(4, 5, 1.25, 3.7);
    const b = sample(4, 5, 1.25, 3.7);
    expect(a).toBe(b);
  });
});

describe('charForBrightness', () => {
  it('maps 0 to the first ramp glyph', () => {
    expect(charForBrightness(0)).toBe(RAMP[0]);
  });

  it('maps values just under 1 to the last ramp glyph', () => {
    expect(charForBrightness(0.9999)).toBe(RAMP[RAMP.length - 1]);
  });

  it('clamps values above 1 to the last ramp glyph', () => {
    expect(charForBrightness(10)).toBe(RAMP[RAMP.length - 1]);
  });

  it('clamps values below 0 to the first ramp glyph', () => {
    expect(charForBrightness(-5)).toBe(RAMP[0]);
  });
});

describe('spotlight', () => {
  it('returns 1 at the exact center', () => {
    expect(spotlight(5, 5, 5, 5, 10)).toBe(1);
  });

  it('returns 0 at or beyond the radius', () => {
    expect(spotlight(15, 5, 5, 5, 10)).toBe(0); // dist 10 == radius
    expect(spotlight(20, 5, 5, 5, 10)).toBe(0); // dist 15 > radius
  });

  it('returns 0 when radius is non-positive', () => {
    expect(spotlight(5, 5, 5, 5, 0)).toBe(0);
    expect(spotlight(5, 5, 5, 5, -3)).toBe(0);
  });

  it('stays within [0, 1] and is non-increasing with distance', () => {
    let prev = Infinity;
    for (let d = 0; d <= 10; d++) {
      const v = spotlight(5 + d, 5, 5, 5, 10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('applySpotlight', () => {
  it('returns the base unchanged when boost is zero', () => {
    expect(applySpotlight(0.4, 0, 0.5)).toBe(0.4);
  });

  it('only raises brightness, never lowers it', () => {
    expect(applySpotlight(0.4, 1, 0.5)).toBeGreaterThan(0.4);
  });

  it('clamps the result to at most 1', () => {
    expect(applySpotlight(0.9, 1, 0.5)).toBe(1);
  });

  it('never returns a value outside [0, 1]', () => {
    for (const base of [0, 0.3, 0.7, 1]) {
      for (const boost of [0, 0.5, 1]) {
        const v = applySpotlight(base, boost, 0.5);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('renderLayers', () => {
  it('returns one string per phase, each cols*rows + separator newlines', () => {
    const cols = 12;
    const rows = 5;
    const result = renderLayers(cols, rows, 0.5, [0, 3.7, 7.2]);
    expect(result.layers).toHaveLength(3);
    for (const layer of result.layers) {
      const linesInLayer = layer.split('\n');
      expect(linesInLayer).toHaveLength(rows);
      for (const line of linesInLayer) {
        expect([...line]).toHaveLength(cols);
      }
    }
  });

  it('is deterministic for the same inputs', () => {
    const a = renderLayers(10, 4, 1.0, [0, 3.7, 7.2]);
    const b = renderLayers(10, 4, 1.0, [0, 3.7, 7.2]);
    expect(a.layers).toEqual(b.layers);
  });

  it('differs when t changes', () => {
    const a = renderLayers(10, 4, 1.0, [0, 3.7, 7.2]);
    const b = renderLayers(10, 4, 2.0, [0, 3.7, 7.2]);
    expect(a.layers).not.toEqual(b.layers);
  });

  it('produces identical output for default vs explicit no-op options', () => {
    const a = renderLayers(12, 5, 0.5, [0, 3.7, 7.2]);
    const b = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], {
      spotlightRadius: 0,
      spotlightStrength: 0,
      parallaxX: 0,
      parallaxY: 0,
    });
    expect(a.layers).toEqual(b.layers);
  });

  it('changes output when a parallax offset is applied', () => {
    const a = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], { parallaxX: 0 });
    const b = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], { parallaxX: 4 });
    expect(a.layers).not.toEqual(b.layers);
  });

  it('a parallax offset is deterministic', () => {
    const shifted = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], { parallaxX: 3, parallaxY: 2 });
    const again = renderLayers(12, 5, 0.5, [0, 3.7, 7.2], { parallaxX: 3, parallaxY: 2 });
    expect(shifted.layers).toEqual(again.layers);
  });

  it('keeps the correct shape when options are supplied', () => {
    const cols = 10;
    const rows = 4;
    const result = renderLayers(cols, rows, 1.0, [0, 3.7, 7.2], {
      spotlightX: 5,
      spotlightY: 2,
      spotlightRadius: 6,
      spotlightStrength: 0.5,
      parallaxY: 1.5,
    });
    expect(result.layers).toHaveLength(3);
    for (const layer of result.layers) {
      const lines = layer.split('\n');
      expect(lines).toHaveLength(rows);
      for (const line of lines) expect([...line]).toHaveLength(cols);
    }
  });
});

describe('layer constants', () => {
  it('LAYER_PHASES and LAYER_COLORS have the same length', () => {
    expect(LAYER_PHASES.length).toBe(LAYER_COLORS.length);
  });

  it('has at least one layer', () => {
    expect(LAYER_PHASES.length).toBeGreaterThan(0);
  });
});

describe('presets', () => {
  // Reference copy of the original sum-of-sines formula and its three tunings,
  // so the refactor onto per-preset fields can't silently change them.
  const LEGACY = {
    drift: [0.08, 0.11, 0.06, 0.09, 0.6, 0.4, 0.5, 0.3],
    cascade: [0.04, 0.22, 0.18, 0.03, 1.4, 0.15, 1.1, 0.1],
    pulse: [0.03, 0.04, 0.025, 0.035, 0.25, 0.3, 0.2, 0.15],
  } as const;

  function legacy(p: readonly number[], x: number, y: number, t: number, phase: number): number {
    const [nx, ny, nxy, nxmy, tx, ty, txy, txmy] = p;
    const s1 = Math.sin(x * nx + t * tx + phase);
    const s2 = Math.sin(y * ny - t * ty + phase * 1.3);
    const s3 = Math.sin((x + y) * nxy + t * txy);
    const s4 = Math.sin((x - y) * nxmy - t * txmy + phase * 0.7);
    const raw = (s1 + s2 + s3 + s4) * 0.25 + 0.5;
    return raw < 0 ? 0 : raw > 1 ? 1 : raw;
  }

  const ctx = { cols: 120, rows: 40 };

  it('includes the original three plus ripple, vortex, and interference', () => {
    expect(PRESETS.map(p => p.name)).toEqual([
      'drift', 'cascade', 'pulse', 'ripple', 'vortex', 'interference',
    ]);
  });

  it('keeps the original presets bit-for-bit identical', () => {
    for (const [name, params] of Object.entries(LEGACY)) {
      const preset = PRESETS.find(p => p.name === name)!;
      for (const [x, y, t, phase] of [[0, 0, 0, 0], [4, 5, 1.25, 3.7], [37, 12, 9.5, 7.2], [119, 39, 100, 0]]) {
        expect(preset.field(x, y, t, phase, ctx)).toBe(legacy(params, x, y, t, phase));
      }
    }
  });

  it('every preset stays within [0, 1] and is deterministic', () => {
    for (const preset of PRESETS) {
      for (let x = 0; x < ctx.cols; x += 7) {
        for (let y = 0; y < ctx.rows; y += 3) {
          for (const t of [0, 2.5, 61.3]) {
            for (const phase of LAYER_PHASES) {
              const v = preset.field(x, y, t, phase, ctx);
              expect(v).toBeGreaterThanOrEqual(0);
              expect(v).toBeLessThanOrEqual(1);
              expect(preset.field(x, y, t, phase, ctx)).toBe(v);
            }
          }
        }
      }
    }
  });

  it('new presets are not flat and stay near the original brightness spread', () => {
    // Keeps new fields from reading far busier or emptier than the originals,
    // which measure mean 0.54–0.69, sd 0.29–0.33 on this grid.
    function spread(preset: (typeof PRESETS)[number]): { mean: number; sd: number } {
      const vals: number[] = [];
      for (let x = 0; x < ctx.cols; x += 2) {
        for (let y = 0; y < ctx.rows; y++) vals.push(preset.field(x, y, 3.3, 0, ctx));
      }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      return { mean, sd };
    }
    for (const name of ['ripple', 'vortex', 'interference']) {
      const { mean, sd } = spread(PRESETS.find(p => p.name === name)!);
      expect(mean).toBeGreaterThan(0.35);
      expect(mean).toBeLessThan(0.65);
      expect(sd).toBeGreaterThan(0.25);
      expect(sd).toBeLessThan(0.36);
    }
  });
});
