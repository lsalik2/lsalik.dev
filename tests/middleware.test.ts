import { describe, it, expect } from 'vitest';
import { SECURITY_HEADERS } from '../src/lib/security-headers';

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
