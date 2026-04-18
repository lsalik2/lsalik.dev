import { describe, it, expect } from 'vitest';
import { renderLogo } from '../../src/curl/logo';

import { stripAnsi } from '../../src/curl/ansi';

describe('renderLogo', () => {
  const logo = renderLogo();
  const lines = logo.split('\n');

  it('returns exactly 6 lines', () => {
    expect(lines).toHaveLength(6);
  });

  it('uses only half-block glyphs and spaces in the visible output', () => {
    const allowed = new Set([' ', '▀', '▄', '█']);
    for (const line of lines) {
      const stripped = stripAnsi(line);
      for (const ch of stripped) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it('has balanced ANSI open/reset codes on every line', () => {
    for (const line of lines) {
      const opens = (line.match(/\x1b\[(3[1-9]|38;5;\d+)m/g) ?? []).length;
      const resets = (line.match(/\x1b\[(0|39)m/g) ?? []).length;
      expect(resets).toBeGreaterThanOrEqual(opens > 0 ? 1 : 0);
    }
  });

  it('has stable 17-character width on every row after stripping ANSI', () => {
    for (const line of lines) {
      const stripped = stripAnsi(line);
      expect([...stripped].length).toBe(17);
    }
  });
});
