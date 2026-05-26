import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateOgImages } from '../src/integrations/og-images';

// PNG magic bytes
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('generateOgImages', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'og-build-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes one PNG per non-draft blog entry', async () => {
    const result = await generateOgImages({
      outDir: tmpDir,
      // Fixture entries injected directly; production uses getCollection().
      entries: [
        { kind: 'blog', slug: 'post-a', title: 'Post A', meta: '2026-01-01 · a · 1 min read' },
        { kind: 'blog', slug: 'post-b', title: 'Post B', meta: '2026-01-02 · b · 2 min read' },
        { kind: 'project', slug: 'proj-x', title: 'Project X', meta: 'live · TS' },
      ],
    });

    expect(result.generated).toBe(3);
    expect(result.failed).toBe(0);

    const blogPng = await readFile(join(tmpDir, 'og', 'blog', 'post-a.png'));
    expect(blogPng.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
    expect(blogPng.length).toBeGreaterThan(1024);

    const projPng = await stat(join(tmpDir, 'og', 'projects', 'proj-x.png'));
    expect(projPng.size).toBeGreaterThan(1024);

    const blogFiles = await readdir(join(tmpDir, 'og', 'blog'));
    expect(blogFiles.sort()).toEqual(['post-a.png', 'post-b.png']);
  }, 30_000);

  it('skips failing entries without aborting the whole run', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await generateOgImages({
        outDir: tmpDir,
        entries: [
          { kind: 'blog', slug: 'good', title: 'Good', meta: 'ok' },
          // Force a failure by passing a slug containing a path separator —
          // the integration must reject it rather than escaping the outDir.
          { kind: 'blog', slug: '../escape', title: 'Bad', meta: 'no' },
          { kind: 'blog', slug: 'also-good', title: 'Also Good', meta: 'ok' },
        ],
      });

      expect(result.generated).toBe(2);
      expect(result.failed).toBe(1);
      expect(warn).toHaveBeenCalled();
      const warnMsg = warn.mock.calls.map(c => c.join(' ')).join('\n');
      expect(warnMsg).toContain('[og-images]');
      expect(warnMsg).toContain('../escape');
    } finally {
      warn.mockRestore();
    }
  }, 30_000);
});
