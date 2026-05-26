import { defineConfig, passthroughImageService } from 'astro/config';
import vercel from '@astrojs/vercel';
import ogImages from './src/integrations/og-images.ts';

export default defineConfig({
  site: 'https://lsalik.dev',
  output: 'server',
  // Skip sharp-based image optimization: the Vercel edge middleware bundle
  // rejects Node built-ins that sharp pulls in, and we don't need
  // server-side image processing for this site anyway.
  image: {
    service: passthroughImageService(),
  },
  integrations: [ogImages()],
  adapter: vercel({
    // edgeMiddleware: true,
  }),
});
