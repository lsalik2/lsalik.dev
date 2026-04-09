import { describe, it, expect } from 'vitest';
import {
  sample,
  charForBrightness,
  renderLayers,
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
