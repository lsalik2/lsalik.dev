import { describe, it, expect } from 'vitest';
import { NAV_LINKS, BROWSER_NAV_LINKS } from '../../src/lib/nav';

describe('NAV_LINKS', () => {
  it('is non-empty', () => {
    expect(NAV_LINKS.length).toBeGreaterThan(0);
  });

  it('every entry has an href that starts with /', () => {
    for (const link of NAV_LINKS) {
      expect(link.href.startsWith('/')).toBe(true);
    }
  });

  it('every entry has a non-empty label', () => {
    for (const link of NAV_LINKS) {
      expect(link.label.length).toBeGreaterThan(0);
    }
  });

  it('contains the expected top-level paths in stable order', () => {
    const hrefs = NAV_LINKS.map(l => l.href);
    expect(hrefs).toEqual(['/', '/projects', '/blog', '/uses', '/contact', '/fun', '/resume']);
  });

  it('shows ~/fun in the browser nav, and no ~/man', () => {
    const labels = BROWSER_NAV_LINKS.map(l => l.label);
    expect(labels).toContain('~/fun');
    expect(labels).not.toContain('~/man');
  });
});
