import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { AstroIntegration } from 'astro';
import { renderOgPng } from '../lib/og/render';
import type { OgKind, OgTemplateProps } from '../lib/og/template';

export type OgEntry = OgTemplateProps;

export interface GenerateOptions {
  outDir: string;
  entries: OgEntry[];
}

export interface GenerateResult {
  generated: number;
  failed: number;
}

// kind → output subdirectory under `<outDir>/og/`.
const SUBDIR: Record<OgKind, string> = {
  blog: 'blog',
  project: 'projects',
};

// Reject slugs that would escape the output directory. Allow nested slugs
// (Astro's glob loader emits `sub/post` for `src/content/blog/sub/post.md`)
// but block traversal, absolute, and hidden patterns.
//
// The character set is intentionally narrow: lowercase letters, digits,
// hyphen, slash. Files like `MyPost.md` or `my_post.md` will be silently
// skipped — if a future post needs them, expand this regex and ensure
// downstream URL/path code handles the wider character set.
function isSafeSlug(slug: string): boolean {
  if (!slug) return false;
  if (slug.includes('..')) return false;
  if (slug.startsWith('/') || slug.startsWith('.')) return false;
  return /^[a-z0-9][a-z0-9/-]*$/.test(slug);
}

export async function generateOgImages(opts: GenerateOptions): Promise<GenerateResult> {
  let generated = 0;
  let failed = 0;
  for (const entry of opts.entries) {
    try {
      if (!isSafeSlug(entry.slug)) {
        throw new Error(`unsafe slug: ${entry.slug}`);
      }
      const dir = join(opts.outDir, 'og', SUBDIR[entry.kind]);
      await mkdir(dir, { recursive: true });
      const buf = await renderOgPng(entry);
      await writeFile(join(dir, `${entry.slug}.png`), buf);
      generated++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[og-images] failed: ${entry.kind}/${entry.slug}: ${msg}`);
    }
  }
  return { generated, failed };
}

// ---------------------------------------------------------------------------
// Frontmatter helpers — read markdown files directly from the source tree.
// We avoid `astro:content` here because that virtual module is resolved by
// the Vite module runner, which Astro closes before astro:build:done fires.
// ---------------------------------------------------------------------------

// Use createRequire so that this CJS load bypasses Vite's module runner.
// The runner is closed by the time astro:build:done fires, so dynamic ESM
// import('js-yaml') would throw "Vite module runner has been closed".
const _require = createRequire(import.meta.url);

/** Extract YAML frontmatter from a markdown file string. */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = raw.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const { load } = _require('js-yaml') as typeof import('js-yaml');
  const data = (load(match[1]) ?? {}) as Record<string, unknown>;
  return { data, body: match[2] };
}

/** Build the meta line for blog entries. */
function formatBlogMeta(data: Record<string, unknown>, body: string): string {
  const date =
    data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : String(data.date ?? '').slice(0, 10);
  const tags = Array.isArray(data.tags) ? (data.tags as string[]).join(', ') : '';
  // Reading time: ~200 wpm; min 1.
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${date} · ${tags} · ${minutes} min read`;
}

/** Build the meta line for project entries. */
function formatProjectMeta(data: Record<string, unknown>): string {
  const status = String(data.status ?? '');
  const stack = Array.isArray(data.stack) ? (data.stack as string[]).join(', ') : '';
  return `${status} · ${stack}`;
}

/** Read all markdown files from a content directory and return OgEntry list. */
async function readContentEntries(
  contentDir: string,
  kind: OgKind,
  opts: { skipDraft?: boolean } = {},
): Promise<OgEntry[]> {
  // Match the Astro glob loader's `**/*.md` pattern. Returns paths relative
  // to contentDir, so a nested file `sub/post.md` becomes slug `sub/post`.
  let files: string[];
  try {
    files = await readdir(contentDir, { recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const entries: OgEntry[] = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const raw = await readFile(join(contentDir, file), 'utf-8');
    const { data, body } = parseFrontmatter(raw);
    if (opts.skipDraft && data.draft === true) continue;
    // Use forward-slashes regardless of platform so slugs match Astro's id format.
    const slug = file.replace(/\.md$/, '').split(/[\\/]/).join('/');
    const title = String(data.title ?? slug);
    const meta =
      kind === 'blog'
        ? formatBlogMeta(data, body)
        : formatProjectMeta(data);
    entries.push({ kind, slug, title, meta });
  }
  return entries;
}

export default function ogImagesIntegration(): AstroIntegration {
  return {
    name: 'og-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        // We read content files directly from the source tree using fs/promises
        // rather than `astro:content`, because the Vite module runner used to
        // resolve that virtual module is closed before this hook fires.
        // Assumes this file lives at <root>/src/integrations/. Adjust '../..' if moved.
        const root = fileURLToPath(new URL('../..', import.meta.url));
        const blogDir = join(root, 'src', 'content', 'blog');
        const projectsDir = join(root, 'src', 'content', 'projects');

        const [blogEntries, projectEntries] = await Promise.all([
          readContentEntries(blogDir, 'blog', { skipDraft: true }),
          readContentEntries(projectsDir, 'project'),
        ]);

        const entries: OgEntry[] = [...blogEntries, ...projectEntries];

        const outDir = fileURLToPath(dir);
        const result = await generateOgImages({ outDir, entries });

        logger.info(
          `generated ${result.generated} OG image(s); ${result.failed} failed`,
        );
      },
    },
  };
}
