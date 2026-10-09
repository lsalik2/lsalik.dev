import { describe, it, expect } from 'vitest';
import {
  renderLayers,
  PRESETS,
  LAYER_PHASES,
  advanceTime,
  MAX_DT_SECONDS,
  minFontForViewport,
  lineHeightFor,
  MAX_CELLS_PER_LAYER,
} from '../../src/islands/ascii-bg';

describe('renderLayers with an explicit field', () => {
  it('matches the default (module preset) path for the same preset', () => {
    // The module's active preset starts as PRESETS[0] (drift).
    const viaModule = renderLayers(20, 6, 3.3, LAYER_PHASES);
    const viaField = renderLayers(20, 6, 3.3, LAYER_PHASES, { field: PRESETS[0].field });
    expect(viaField.layers).toEqual(viaModule.layers);
  });

  it('renders a different picture for a different field', () => {
    const drift = renderLayers(20, 6, 3.3, LAYER_PHASES, { field: PRESETS[0].field });
    const vortex = renderLayers(20, 6, 3.3, LAYER_PHASES, {
      field: PRESETS.find(p => p.name === 'vortex')!.field,
    });
    expect(vortex.layers).not.toEqual(drift.layers);
  });
});

describe('advanceTime', () => {
  it('advances by dt × speed', () => {
    expect(advanceTime(10, 0.016, 1)).toBeCloseTo(10.016);
    expect(advanceTime(10, 0.016, 2)).toBeCloseTo(10.032);
  });

  it('clamps long gaps (hidden tab) to MAX_DT_SECONDS', () => {
    expect(advanceTime(5, 3600, 1)).toBeCloseTo(5 + MAX_DT_SECONDS);
    expect(advanceTime(5, 3600, 3)).toBeCloseTo(5 + MAX_DT_SECONDS * 3);
  });

  it('never goes backwards on a negative dt', () => {
    expect(advanceTime(5, -1, 1)).toBe(5);
  });
});

describe('minFontForViewport', () => {
  function cells(w: number, h: number, font: number): number {
    return (w / (font * 0.6)) * (h / lineHeightFor(font));
  }

  it('keeps a 4K screen under the cell cap', () => {
    const f = minFontForViewport(3840, 2160);
    expect(f).toBeGreaterThan(8);
    expect(cells(3840, 2160, f)).toBeLessThanOrEqual(MAX_CELLS_PER_LAYER * 1.05);
  });

  it('allows the 8px minimum on a 1080p screen', () => {
    expect(minFontForViewport(1920, 1080)).toBeLessThanOrEqual(8);
  });

  it('handles zero or negative sizes', () => {
    expect(minFontForViewport(0, 0)).toBe(0);
    expect(minFontForViewport(-5, 100)).toBe(0);
  });
});

describe('lineHeightFor', () => {
  it('keeps the site ratio (11px → 13px)', () => {
    expect(lineHeightFor(11)).toBe(13);
    expect(lineHeightFor(22)).toBe(26);
  });
});
