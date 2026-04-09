import { defineConfig, passthroughImageService } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  // Skip sharp-based image optimization: the Vercel edge middleware bundle
  // rejects Node built-ins that sharp pulls in, and we don't need
  // server-side image processing for this site anyway.
  image: {
    service: passthroughImageService(),
  },
  adapter: vercel({
    edgeMiddleware: true,
  }),
});
