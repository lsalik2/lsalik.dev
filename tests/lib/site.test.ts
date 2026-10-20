import { describe, it, expect } from 'vitest';
import { SITE_DESCRIPTION, STATIC_PATHS } from '../../src/lib/site';

describe('STATIC_PATHS', () => {
  it('lists the fixed pages for the sitemap, including /fun', () => {
    expect(STATIC_PATHS).toEqual(['/', '/blog', '/projects', '/contact', '/fun']);
  });
});

describe('SITE_DESCRIPTION', () => {
  it('names the site by its owner\'s handle', () => {
    expect(SITE_DESCRIPTION).toBe('Personal site and blog of lsalik2.');
  });
});
