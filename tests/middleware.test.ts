import { describe, it, expect } from 'vitest';
import { BASE_SECURITY_HEADERS, buildCsp, inlineScriptHashes } from '../src/lib/security-headers';

// TERMINAL_UA_RE is not exported; replicate it here to unit-test the anchoring
// logic without importing astro: virtual-module code.
const TERMINAL_UA_RE = /^(curl|wget|httpie|fetch|libfetch)\//i;

describe('BASE_SECURITY_HEADERS', () => {
  it('includes Vary: User-Agent', () => {
    expect(BASE_SECURITY_HEADERS['Vary']).toBe('User-Agent');
  });

  it('is applied to every response via withHeaders (header present on BASE_SECURITY_HEADERS)', () => {
    const keys = Object.keys(BASE_SECURITY_HEADERS);
    expect(keys).toContain('Vary');
  });
});

describe('buildCsp', () => {
  it('always allows same-origin scripts via self', () => {
    expect(buildCsp([])).toMatch(/script-src 'self'/);
  });

  it('appends every supplied inline-script hash to script-src', () => {
    const csp = buildCsp(["'sha256-abc='", "'sha256-def='"]);
    expect(csp).toContain("script-src 'self' 'sha256-abc=' 'sha256-def='");
  });

  it('keeps style-src unsafe-inline for Astro component styles', () => {
    expect(buildCsp([])).toContain("style-src 'self' 'unsafe-inline'");
  });
});

describe('inlineScriptHashes', () => {
  it('returns a hash per inline <script> block', async () => {
    const html = `<html><head><script>var a=1;</script></head><body><script type="module">console.log("x");</script></body></html>`;
    const hashes = await inlineScriptHashes(html);
    expect(hashes).toHaveLength(2);
    for (const h of hashes) expect(h).toMatch(/^'sha256-[A-Za-z0-9+/=]+='$/);
  });

  it('ignores <script src=...> external scripts', async () => {
    const html = `<script src="/foo.js"></script><script>alert(1);</script>`;
    const hashes = await inlineScriptHashes(html);
    expect(hashes).toHaveLength(1);
  });

  it('deduplicates identical inline scripts', async () => {
    const html = `<script>x()</script><script>x()</script>`;
    const hashes = await inlineScriptHashes(html);
    expect(hashes).toHaveLength(1);
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
