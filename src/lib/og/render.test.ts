import { describe, it, expect } from 'vitest';
import { renderOgPng } from './render';

// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('renderOgPng', () => {
  it('produces a PNG buffer for a blog entry', async () => {
    const buf = await renderOgPng({
      kind: 'blog',
      slug: 'hello-world',
      title: 'Hello, World!',
      meta: '2026-04-09 · meta, webdev · 1 min read',
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
    // A reasonable lower bound — empty/all-transparent renders are typically <1 KB.
    expect(buf.length).toBeGreaterThan(1024);
  }, 15_000);

  it('handles a 200-character title without throwing', async () => {
    const longTitle = 'x'.repeat(200);
    const buf = await renderOgPng({
      kind: 'blog',
      slug: 'long',
      title: longTitle,
      meta: 'some meta',
    });
    expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
  }, 15_000);

  it('handles an empty meta line without throwing', async () => {
    const buf = await renderOgPng({
      kind: 'project',
      slug: 'p',
      title: 'A Project',
      meta: '',
    });
    expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
  }, 15_000);
});
