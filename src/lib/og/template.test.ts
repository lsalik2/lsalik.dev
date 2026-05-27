import { describe, it, expect } from 'vitest';
import { OgTemplate } from './template';

// Walk the element tree and collect every string child (depth-first).
// Satori trees are nested {type, props: {children}} objects; children can be
// a string, an element, or an array of either.
function collectText(node: unknown): string[] {
  if (node == null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (typeof node === 'object' && 'props' in (node as any)) {
    return collectText((node as any).props.children);
  }
  return [];
}

describe('OgTemplate', () => {
  it('includes the titlebar path for blog posts', () => {
    const tree = OgTemplate({
      kind: 'blog',
      slug: 'hello-world',
      title: 'Hello, World!',
      meta: '2026-04-09 · meta, webdev · 1 min read',
    });
    const text = collectText(tree).join(' ');
    expect(text).toContain('cat ~/blog/hello-world.md');
  });

  it('includes the titlebar path for project entries', () => {
    const tree = OgTemplate({
      kind: 'project',
      slug: 'lsalik-dev',
      title: 'lsalik.dev',
      meta: 'live · Astro, TypeScript',
    });
    const text = collectText(tree).join(' ');
    expect(text).toContain('cat ~/projects/lsalik-dev.md');
  });

  it('includes the title and meta text', () => {
    const tree = OgTemplate({
      kind: 'blog',
      slug: 'x',
      title: 'A Specific Title',
      meta: 'some meta line',
    });
    const text = collectText(tree).join(' ');
    expect(text).toContain('A Specific Title');
    expect(text).toContain('some meta line');
    expect(text).toContain('lsalik.dev');
  });
});
