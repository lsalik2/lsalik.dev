import { describe, it, expect } from 'vitest';
import { clockText, manPreview, screensaverFrame } from '../../src/lib/fun-previews';
import { RAMP } from '../../src/islands/ascii-bg';
import { formatTime, renderBigDigits } from '../../src/lib/clock';

describe('manPreview', () => {
  it('opens with the man header, NAME and SYNOPSIS, within the width', () => {
    const out = manPreview(56, 9);
    const lines = out.split('\n');
    expect(lines).toHaveLength(9);
    expect(lines[0]).toMatch(/^LSALIK\(1\)/);
    expect(out).toContain('NAME');
    expect(out).toContain('SYNOPSIS');
    expect(out).toContain('curl -L lsalik.dev[/route]');
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(56);
  });
});

describe('screensaverFrame', () => {
  it('is rows lines of cols ramp characters, the same every time', () => {
    const frame = screensaverFrame(60, 12);
    const lines = frame.split('\n');
    expect(lines).toHaveLength(12);
    for (const l of lines) {
      expect(l).toHaveLength(60);
      for (const c of l) expect(RAMP).toContain(c);
    }
    expect(screensaverFrame(60, 12)).toBe(frame);
  });
});

describe('clockText', () => {
  it('draws the 12-hour time in the screensaver block digits', () => {
    const d = new Date(2026, 9, 21, 13, 52);
    expect(clockText(d)).toBe(renderBigDigits(formatTime(d, false)).join('\n'));
  });
});
