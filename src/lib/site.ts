export const SITE_URL = 'https://lsalik.dev';
export const SITE_TITLE = 'lsalik.dev';
export const SITE_DESCRIPTION = 'Personal site and blog of lsalik2.';

// Fixed pages listed in /sitemap.xml; blog posts and projects are added from
// their collections. Lives here so it can be tested (the sitemap route
// imports astro:content, which Vitest can't load).
export const STATIC_PATHS: readonly string[] = ['/', '/blog', '/projects', '/contact', '/fun'];
