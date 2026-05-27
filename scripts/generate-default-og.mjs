// One-off generator for the static fallback OG image used by pages
// without a per-entry image (homepage, /man, /uses, /contact, /404,
// /blog index, /projects index).
//
// Run with: node scripts/generate-default-og.mjs
// Commits the resulting public/og/default.png to git.

import { mkdir, writeFile } from 'node:fs/promises';
import { renderOgPng } from '../src/lib/og/render.ts';

const buf = await renderOgPng({
  kind: 'blog',
  slug: 'home',
  title: 'lsalik.dev',
  meta: 'personal site · blog · projects',
});

await mkdir('public/og', { recursive: true });
await writeFile('public/og/default.png', buf);
console.log(`wrote public/og/default.png (${buf.length} bytes)`);
