import { describe, it, expect } from 'vitest';
import { hueAngle, shiftHue, gradientAngle, rainbowOffset } from '../../src/lib/color-anim';

describe('hueAngle', () => {
  it('sweeps 0→360 once per period and wraps', () => {
    expect(hueAngle(0, 60)).toBe(0);
    expect(hueAngle(15, 60)).toBeCloseTo(90);
    expect(hueAngle(60, 60)).toBeCloseTo(0);
    expect(hueAngle(75, 60)).toBeCloseTo(90);
  });

  it('stays in [0, 360) for any t', () => {
    for (const t of [0, 0.1, 59.999, 1e6, 123456.789]) {
      const a = hueAngle(t, 37);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(360);
    }
  });
});

describe('shiftHue', () => {
  it('rotates primary colours', () => {
    expect(shiftHue('#ff0000', 120)).toBe('#00ff00');
    expect(shiftHue('#ff0000', 240)).toBe('#0000ff');
    expect(shiftHue('#ff0000', -120)).toBe('#0000ff');
  });

  it('is identity at 0 and 360 (within rounding)', () => {
    expect(shiftHue('#58a6ff', 0)).toBe('#58a6ff');
    expect(shiftHue('#58a6ff', 360)).toBe('#58a6ff');
  });

  it('leaves greys unchanged', () => {
    expect(shiftHue('#808080', 90)).toBe('#808080');
  });

  it('accepts uppercase input and returns lowercase', () => {
    expect(shiftHue('#FF0000', 120)).toBe('#00ff00');
  });
});

describe('gradientAngle', () => {
  it('turns once every four periods', () => {
    expect(gradientAngle(0, 10)).toBe(0);
    expect(gradientAngle(10, 10)).toBeCloseTo(90);
    expect(gradientAngle(40, 10)).toBeCloseTo(0);
  });
});

describe('rainbowOffset', () => {
  it('slides 0→100% once per period and wraps', () => {
    expect(rainbowOffset(0, 20)).toBe(0);
    expect(rainbowOffset(5, 20)).toBeCloseTo(25);
    expect(rainbowOffset(20, 20)).toBeCloseTo(0);
    for (const t of [3, 19.99, 1e5]) {
      const o = rainbowOffset(t, 20);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(100);
    }
  });
});
