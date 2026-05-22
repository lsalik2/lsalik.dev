import { describe, it, expect } from 'vitest';
import { buildOgTree } from '../../src/lib/og-template';

// Recursively collect every string found in a satori node tree, so tests can
// assert on rendered text without depending on the tree's exact shape.
function collectText(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return props ? collectText(props.children) : [];
  }
  return [];
}

describe('buildOgTree', () => {
  const data = {
    title: 'The curl overhaul',
    date: '2026-05-10',
    tags: ['astro', 'ansi'],
    slug: 'curl-overhaul',
  };

  it('includes the post title', () => {
    expect(collectText(buildOgTree(data)).join(' ')).toContain('The curl overhaul');
  });

  it('includes the date', () => {
    expect(collectText(buildOgTree(data)).join(' ')).toContain('2026-05-10');
  });

  it('includes every tag, hash-prefixed', () => {
    const text = collectText(buildOgTree(data)).join(' ');
    expect(text).toContain('#astro');
    expect(text).toContain('#ansi');
  });

  it('shows a cat-the-file prompt line with the slug', () => {
    expect(collectText(buildOgTree(data)).join(' ')).toContain('$ cat curl-overhaul.md');
  });

  it('includes the site name', () => {
    expect(collectText(buildOgTree(data)).join(' ')).toContain('lsalik.dev');
  });

  it('returns a single root element', () => {
    const tree = buildOgTree(data);
    expect(tree).toHaveProperty('type');
    expect(tree).toHaveProperty('props');
  });

  it('formats the date+tags meta line with the documented spacing', () => {
    // Pin the contract: date, then 4 spaces, then hash-tags joined by 2 space.
    // Without this, a regression in metaLine's whitespace would not be caught
    // by the individual token assertions above.
    const text = collectText(buildOgTree(data)).join(' ');
    expect(text).toContain('2026-05-10    #astro  #ansi');
  });
});
