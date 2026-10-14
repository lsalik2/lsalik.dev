import { describe, it, expect } from 'vitest';
import { MAINTAINERS, maintainerLines } from '../../src/data/maintainers';

const DAY = 86_400_000;
const at = (iso: string) => new Date(iso);

describe('MAINTAINERS', () => {
  it('has the approved lines, no duplicates, no empties', () => {
    expect(MAINTAINERS.finch).toHaveLength(10);
    expect(MAINTAINERS.raven).toHaveLength(9);
    for (const lines of [MAINTAINERS.finch, MAINTAINERS.raven]) {
      expect(new Set(lines).size).toBe(lines.length);
      for (const l of lines) expect(l.trim().length).toBeGreaterThan(0);
    }
  });

  it('is plain text that fits on one line at 80 columns', () => {
    for (const l of [...MAINTAINERS.finch, ...MAINTAINERS.raven]) {
      expect(l).not.toMatch(/[`*_]/);
      expect(l.length).toBeLessThanOrEqual(60);
    }
  });
});

describe('maintainerLines', () => {
  it('is the same all day, and changes at midnight UTC', () => {
    const morning = maintainerLines(at('2026-10-14T00:00:00Z'));
    expect(maintainerLines(at('2026-10-14T23:59:59Z'))).toEqual(morning);
    expect(maintainerLines(at('2026-10-15T00:00:00Z'))).not.toEqual(morning);
  });

  it('walks each list in order, wrapping at the end', () => {
    const start = at('2026-10-14T12:00:00Z').getTime();
    const i = MAINTAINERS.finch.indexOf(maintainerLines(new Date(start)).finch);
    const j = MAINTAINERS.raven.indexOf(maintainerLines(new Date(start)).raven);
    for (let d = 1; d <= 20; d++) {
      const today = maintainerLines(new Date(start + d * DAY));
      expect(today.finch).toBe(MAINTAINERS.finch[(i + d) % MAINTAINERS.finch.length]);
      expect(today.raven).toBe(MAINTAINERS.raven[(j + d) % MAINTAINERS.raven.length]);
    }
  });

  it('shows every line once per cycle', () => {
    const start = at('2026-10-14T12:00:00Z').getTime();
    const seen = { finch: new Set<string>(), raven: new Set<string>() };
    const days = Math.max(MAINTAINERS.finch.length, MAINTAINERS.raven.length);
    for (let d = 0; d < days; d++) {
      const today = maintainerLines(new Date(start + d * DAY));
      seen.finch.add(today.finch);
      seen.raven.add(today.raven);
    }
    expect(seen.finch.size).toBe(MAINTAINERS.finch.length);
    expect(seen.raven.size).toBe(MAINTAINERS.raven.length);
  });
});
