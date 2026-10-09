import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatDate,
  renderBigDigits,
  BIG_FONT,
  driftOffset,
  DRIFT_MAX_PX,
} from '../../src/lib/clock';

// Local-time dates (the clock shows local time).
const at = (h: number, m: number) => new Date(2026, 9, 8, h, m);

describe('formatTime', () => {
  it('24h pads hours and minutes', () => {
    expect(formatTime(at(9, 5), true)).toBe('09:05');
    expect(formatTime(at(0, 0), true)).toBe('00:00');
    expect(formatTime(at(23, 59), true)).toBe('23:59');
  });

  it('12h handles midnight, noon, and afternoon', () => {
    expect(formatTime(at(0, 5), false)).toBe('12:05 AM');
    expect(formatTime(at(9, 5), false)).toBe('09:05 AM');
    expect(formatTime(at(12, 0), false)).toBe('12:00 PM');
    expect(formatTime(at(13, 30), false)).toBe('01:30 PM');
  });
});

describe('formatDate', () => {
  it('is weekday + ISO date in local time', () => {
    expect(formatDate(at(9, 5))).toBe('thu 2026-10-08');
  });
});

describe('renderBigDigits', () => {
  it('renders 5 rows of equal width', () => {
    const rows = renderBigDigits('12:34');
    expect(rows).toHaveLength(5);
    const width = [...rows[0]].length;
    for (const r of rows) expect([...r].length).toBe(width);
  });

  it('covers every character formatTime can produce', () => {
    for (const ch of '0123456789: APM') {
      expect(BIG_FONT[ch]).toBeDefined();
      expect(BIG_FONT[ch]).toHaveLength(5);
      const w = [...BIG_FONT[ch][0]].length;
      for (const row of BIG_FONT[ch]) expect([...row].length).toBe(w);
    }
    expect(() => renderBigDigits(formatTime(at(13, 30), false))).not.toThrow();
  });

  it('uses only block glyphs and spaces', () => {
    for (const row of renderBigDigits('08:59 PM')) expect(row).toMatch(/^[█ ]+$/);
  });

  it('throws on characters the font does not cover', () => {
    expect(() => renderBigDigits('12:3x')).toThrow(/x/);
  });
});

describe('driftOffset', () => {
  it('stays within ±DRIFT_MAX_PX on both axes', () => {
    for (let i = 0; i < 2000; i++) {
      const { x, y } = driftOffset(i);
      expect(Math.abs(x)).toBeLessThanOrEqual(DRIFT_MAX_PX);
      expect(Math.abs(y)).toBeLessThanOrEqual(DRIFT_MAX_PX);
    }
  });

  it('is deterministic and actually moves between minutes', () => {
    expect(driftOffset(42)).toEqual(driftOffset(42));
    const distinct = new Set(Array.from({ length: 60 }, (_, i) => JSON.stringify(driftOffset(i))));
    expect(distinct.size).toBeGreaterThan(30);
  });
});
