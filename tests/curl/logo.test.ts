import { describe, it, expect } from 'vitest';
import { renderLogo } from '../../src/curl/logo';

describe('renderLogo', () => {
  it('returns a non-empty string', () => {
    const result = renderLogo();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('contains ANSI escape codes', () => {
    const result = renderLogo();
    expect(result).toContain('\x1b[');
  });

  it('has at least 6 lines', () => {
    const result = renderLogo();
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(6);
  });
});
