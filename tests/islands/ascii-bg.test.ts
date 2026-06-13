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
});

describe('layer constants', () => {
  it('LAYER_PHASES and LAYER_COLORS have the same length', () => {
    expect(LAYER_PHASES.length).toBe(LAYER_COLORS.length);
  });

  it('has at least one layer', () => {
    expect(LAYER_PHASES.length).toBeGreaterThan(0);
  });
});
