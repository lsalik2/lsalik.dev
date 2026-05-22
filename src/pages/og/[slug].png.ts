// Build-time Open Graph image endpoint. `prerender = true` makes Astro execute
// this during `astro build` and emit one static PNG per blog post — the native
// `@resvg/resvg-js` binary runs in Node at build time and never ships to the
// Vercel edge runtime. Output: /og/<slug>.png.

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { buildOgTree, type OgData } from '../../lib/og-template';

export const prerender = true;

// Use process.cwd() (project root) so the path resolves correctly both from
// the source tree and from the bundled prerender output in dist/server/.
const fontDir = join(process.cwd(), 'src', 'assets', 'fonts');
const fontRegular = readFileSync(join(fontDir, 'RobotoMono-Regular.ttf'));
const fontBold = readFileSync(join(fontDir, 'RobotoMono-Bold.ttf'));

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map(post => ({
    params: { slug: post.id },
    props: {
      title: post.data.title,
      date: post.data.date.toISOString().slice(0, 10),
      tags: post.data.tags,
      slug: post.id,
    } satisfies OgData,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, date, tags, slug } = props as OgData;

  const svg = await satori(buildOgTree({ title, date, tags, slug }) as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Roboto Mono', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Roboto Mono', data: fontBold, weight: 700, style: 'normal' },
    ],
  });

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  }).render().asPng();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
