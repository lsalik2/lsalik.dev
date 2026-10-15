// Boots the built Vercel function the way Vercel runs it, then requests the
// key routes. `npm run build` and the dev server use the full local
// node_modules, so they can't catch a function that only breaks once it's
// packaged (the Astro 7 + @astrojs/vercel 11.0.13 outage: a bundled
// `import "rolldown"` with no native binding, 500 on every page).
//
// The function directory is copied outside the repo first, so module
// resolution can only see the function's own bundled node_modules.
//
// Usage: npm run build && npm run check:function [-- <path to .func dir>]

import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = resolve(process.argv[2] ?? '.vercel/output/functions/_render.func');

// [path, user agent, expected status]
const ROUTES = [
  ['/', 'Mozilla/5.0', 200],
  ['/blog', 'Mozilla/5.0', 200],
  ['/projects', 'Mozilla/5.0', 200],
  ['/screensaver', 'Mozilla/5.0', 200],
  ['/sitemap.xml', 'Mozilla/5.0', 200],
  ['/definitely-not-a-page', 'Mozilla/5.0', 404],
  ['/', 'curl/8.0', 200],
  ['/ssh', 'curl/8.0', 200],
  ['/fun', 'curl/8.0', 200],
];

const dir = await mkdtemp(join(tmpdir(), 'lsalik-func-'));
let failures = 0;
try {
  await cp(source, dir, { recursive: true, dereference: true });

  let app;
  try {
    ({ default: app } = await import(pathToFileURL(join(dir, 'dist/server/entry.mjs')).href));
  } catch (err) {
    console.error(`FAIL  function does not boot: ${String(err?.message ?? err).split('\n')[0]}`);
    process.exit(1);
  }

  for (const [path, ua, expected] of ROUTES) {
    try {
      const res = await app.fetch(new Request(`https://lsalik.dev${path}`, { headers: { 'user-agent': ua } }));
      const body = await res.text();
      const ok = res.status === expected && body.length > 0;
      if (!ok) failures++;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${res.status} ${path} (${ua})`);
    } catch (err) {
      failures++;
      console.log(`FAIL  ${path} (${ua}) threw: ${String(err?.message ?? err).split('\n')[0]}`);
    }
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`${failures} route(s) failed`);
  process.exit(1);
}
console.log('packaged function OK');
