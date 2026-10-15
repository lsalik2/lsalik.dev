import { describe, it, expect } from 'vitest';
import { STATIC_PATHS } from '../../src/lib/site';

describe('STATIC_PATHS', () => {
  it('lists the fixed pages for the sitemap, including /fun', () => {
    expect(STATIC_PATHS).toEqual(['/', '/blog', '/projects', '/contact', '/fun']);
  });
});
