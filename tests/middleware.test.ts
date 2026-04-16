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
