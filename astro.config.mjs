import { defineConfig, passthroughImageService } from 'astro/config';
import vercel from '@astrojs/vercel';
import ogImages from './src/integrations/og-images.ts';
import githubStats from './src/integrations/github-stats.ts';

export default defineConfig({
  site: 'https://lsalik.dev',
  output: 'server',
  // Astro 7 defaults to JSX-style whitespace stripping ('jsx'), which glues
  // inline elements written on separate lines (e.g. the project card name and
  // dates, /man definitions). Keep the HTML-aware behaviour the site was
  // built against.
  compressHTML: true,
  // Skip sharp-based image optimization: the Vercel edge middleware bundle
  // rejects Node built-ins that sharp pulls in, and we don't need
  // server-side image processing for this site anyway.
  image: {
    service: passthroughImageService(),
  },
  integrations: [ogImages(), githubStats()],
  adapter: vercel({
    // edgeMiddleware: true,
  }),
});
