import { describe, it, expect } from 'vitest';

import {
  createBrightnessField,
  splatStamp,
  createFieldStamp,
  brightnessToChar,
  stepParticles,
  type Particle,
} from '../../src/islands/ascii-bg';

describe('brightnessToChar', () => {
  const RAMP = ' .`-_:,;^=+/|)\\!?0oOQ#%@';

  it('returns space for zero brightness', () => {
    expect(brightnessToChar(0)).toBe(' ');
  });

  it('returns densest char for max brightness', () => {
    expect(brightnessToChar(1)).toBe('@');
  });

  it('returns a mid-range char for 0.5', () => {
    const ch = brightnessToChar(0.5);
    const idx = RAMP.indexOf(ch);
    expect(idx).toBeGreaterThan(5);
    expect(idx).toBeLessThan(RAMP.length - 1);
  });
});

describe('createFieldStamp', () => {
  it('creates a stamp with correct dimensions', () => {
    const stamp = createFieldStamp(10, 2, 2);
    expect(stamp.radiusX).toBeGreaterThan(0);
    expect(stamp.radiusY).toBeGreaterThan(0);
    expect(stamp.values.length).toBe(stamp.sizeX * stamp.sizeY);
  });

  it('has peak value at center', () => {
    const stamp = createFieldStamp(10, 2, 2);
    const centerIdx = stamp.radiusY * stamp.sizeX + stamp.radiusX;
    const centerVal = stamp.values[centerIdx];
    expect(centerVal).toBeGreaterThan(0);
    for (let i = 0; i < stamp.values.length; i++) {
      expect(centerVal).toBeGreaterThanOrEqual(stamp.values[i]);
    }
  });
});

describe('createBrightnessField', () => {
  it('creates a Float32Array of correct size', () => {
    const field = createBrightnessField(10, 8);
    expect(field).toBeInstanceOf(Float32Array);
    expect(field.length).toBe(10 * 8);
  });
});

describe('splatStamp', () => {
  it('writes stamp values into the field', () => {
    const field = createBrightnessField(20, 20);
    const stamp = createFieldStamp(5, 1, 1);
    splatStamp(field, 20, 20, 10, 10, stamp);
    let hasNonZero = false;
    for (let i = 0; i < field.length; i++) {
      if (field[i] > 0) { hasNonZero = true; break; }
    }
    expect(hasNonZero).toBe(true);
  });

  it('clamps values to 1', () => {
    const field = createBrightnessField(20, 20);
    const stamp = createFieldStamp(5, 1, 1);
    for (let i = 0; i < 100; i++) {
      splatStamp(field, 20, 20, 10, 10, stamp);
    }
    for (let i = 0; i < field.length; i++) {
      expect(field[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('stepParticles', () => {
  it('updates particle positions', () => {
    const particles: Particle[] = [
      { x: 100, y: 100, vx: 0, vy: 0 },
    ];
    const attractor1 = { x: 50, y: 50 };
    const attractor2 = { x: 150, y: 150 };
    stepParticles(particles, attractor1, attractor2, 200, 150);
    expect(particles[0].x).not.toBe(100);
    expect(particles[0].y).not.toBe(100);
  });

  it('wraps particles that go out of bounds', () => {
    const particles: Particle[] = [
      { x: -100, y: -100, vx: -5, vy: -5 },
    ];
    stepParticles(particles, { x: 0, y: 0 }, { x: 200, y: 150 }, 200, 150);
    expect(particles[0].x).toBeGreaterThan(-50);
    expect(particles[0].y).toBeGreaterThan(-50);
  });
});
