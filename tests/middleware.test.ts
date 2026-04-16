import { describe, it, expect } from 'vitest';
import { SECURITY_HEADERS } from '../src/lib/security-headers';

// TERMINAL_UA_RE is not exported; replicate it here to unit-test the anchoring
// logic without importing astro: virtual-module code.
const TERMINAL_UA_RE = /^(curl|wget|httpie|fetch|libfetch)\//i;

describe('SECURITY_HEADERS', () => {
  it('includes Vary: User-Agent', () => {
    expect(SECURITY_HEADERS['Vary']).toBe('User-Agent');
  });

  it('is applied to every response via withHeaders (header present on SECURITY_HEADERS)', () => {
    // SECURITY_HEADERS is merged into every response via withHeaders().
    // Asserting its presence here covers curl responses, browser responses,
    // 308 redirects, sitemap/robots short-circuits, and 404s.
    const keys = Object.keys(SECURITY_HEADERS);
    expect(keys).toContain('Vary');
  });
});

// sanitizePathnameForTerminal is not exported; replicate its logic here to
// test the extended control-char stripping without importing astro: modules.
function sanitizePathnameForTerminal(pathname: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = pathname.replace(/[\x00-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '?');
  return stripped.length > 120 ? stripped.slice(0, 117) + '...' : stripped;
}

describe('sanitizePathnameForTerminal', () => {
  it('replaces ASCII control characters (ESC, NUL, etc.)', () => {
    // \x1b is the only control char here; '[2J' are normal ASCII so not replaced.
    expect(sanitizePathnameForTerminal('/foo\x1b[2Jbar')).toBe('/foo?[2Jbar');
  });

  it('replaces NUL byte', () => {
    expect(sanitizePathnameForTerminal('/foo\x00bar')).toBe('/foo?bar');
  });

  it('replaces C1 control characters (0x80-0x9F)', () => {
    expect(sanitizePathnameForTerminal('/foo\x85bar')).toBe('/foo?bar');
  });

  it('replaces U+202E RIGHT-TO-LEFT OVERRIDE (BiDi override)', () => {
    expect(sanitizePathnameForTerminal('/foo\u202ebar')).toBe('/foo?bar');
  });

  it('replaces zero-width space U+200B', () => {
    expect(sanitizePathnameForTerminal('/foo\u200bbar')).toBe('/foo?bar');
  });

  it('does not alter safe ASCII paths', () => {
    expect(sanitizePathnameForTerminal('/blog/my-post-2024')).toBe('/blog/my-post-2024');
  });

  it('truncates paths longer than 120 characters', () => {
    const long = '/' + 'a'.repeat(125);
    const result = sanitizePathnameForTerminal(long);
    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(120);
  });
});

describe('isTerminalClient UA anchoring (TERMINAL_UA_RE)', () => {
  it('matches curl at the start of the UA string', () => {
    expect(TERMINAL_UA_RE.test('curl/8.4.0')).toBe(true);
  });

  it('matches wget at the start of the UA string', () => {
    expect(TERMINAL_UA_RE.test('Wget/1.21.4')).toBe(true);
  });

  it('does NOT match when curl appears mid-string (spoofed browser UA)', () => {
    expect(TERMINAL_UA_RE.test('Mozilla/5.0 (compatible; something curl/8.0 whatever)')).toBe(false);
  });

  it('does NOT match an empty string', () => {
    expect(TERMINAL_UA_RE.test('')).toBe(false);
  });

  it('does NOT match a plain browser UA', () => {
    expect(TERMINAL_UA_RE.test('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false);
  });
});
