import { describe, it, expect } from 'vitest';
import { fitDemo, DEMO_MIN_COLS, DEMO_MAX_COLS } from '../../src/lib/demo-layout';

// Measured in Chromium: the demo's 16px monospace is 9.63px per column.
const CHAR = 9.63;
const BASE = 16;

describe('fitDemo', () => {
  it('keeps 80 columns at the normal size when they fit (desktop)', () => {
    expect(fitDemo(878, CHAR, BASE)).toEqual({ cols: 80, fontPx: 16 });
  });

  it('uses as many columns as fit, at the normal size, between 40 and 80 (tablet)', () => {
    expect(fitDemo(686, CHAR, BASE)).toEqual({ cols: 71, fontPx: 16 });
  });

  it('shrinks the font so 40 columns fit when fewer would (phones)', () => {
    for (const available of [308, 238]) {
      const { cols, fontPx } = fitDemo(available, CHAR, BASE);
      expect(cols).toBe(40);
      expect(fontPx).toBeLessThan(BASE);
      expect(40 * CHAR * (fontPx / BASE)).toBeLessThanOrEqual(available);
    }
  });

  it('always lands between the limits, and always fits', () => {
    for (let available = 120; available <= 2000; available += 37) {
      const { cols, fontPx } = fitDemo(available, CHAR, BASE);
      expect(cols).toBeGreaterThanOrEqual(DEMO_MIN_COLS);
      expect(cols).toBeLessThanOrEqual(DEMO_MAX_COLS);
      expect(fontPx).toBeLessThanOrEqual(BASE);
      expect(cols * CHAR * (fontPx / BASE)).toBeLessThanOrEqual(available);
    }
  });
});
