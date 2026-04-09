import { describe, it, expect } from 'vitest';
import { stripMarkdownForTerminal } from '../../src/curl/markdown';

describe('stripMarkdownForTerminal', () => {
  it('returns empty input unchanged', () => {
    expect(stripMarkdownForTerminal('')).toBe('');
  });

  it('leaves plain prose unchanged', () => {
    expect(stripMarkdownForTerminal('just a sentence.')).toBe('just a sentence.');
  });

  it('converts [text](url) to text (url)', () => {
    expect(stripMarkdownForTerminal('see [my site](https://example.com) for more'))
      .toBe('see my site (https://example.com) for more');
  });

  it('handles multiple links in one line', () => {
    expect(stripMarkdownForTerminal('[a](https://a.test) and [b](https://b.test)'))
      .toBe('a (https://a.test) and b (https://b.test)');
  });

  it('strips leading # from h1 headings', () => {
    expect(stripMarkdownForTerminal('# about me')).toBe('about me');
  });

  it('strips leading ## from h2 headings', () => {
    expect(stripMarkdownForTerminal('## interests')).toBe('interests');
  });

  it('strips leading ### from h3 headings', () => {
    expect(stripMarkdownForTerminal('### subsection')).toBe('subsection');
  });

  it('converts leading "- " bullet markers to "• "', () => {
    expect(stripMarkdownForTerminal('- first item\n- second item'))
      .toBe('• first item\n• second item');
  });

  it('preserves indented content that is not a bullet', () => {
    expect(stripMarkdownForTerminal('  indented line')).toBe('  indented line');
  });

  it('handles a multi-line mixed document', () => {
    const input = '# about me\n\nhi [i am here](https://example.com).\n\n## things\n\n- one\n- two';
    const expected = 'about me\n\nhi i am here (https://example.com).\n\nthings\n\n• one\n• two';
    expect(stripMarkdownForTerminal(input)).toBe(expected);
  });

  it('does not alter text that looks like a heading but is not at line start', () => {
    expect(stripMarkdownForTerminal('tag: #hashtag in the middle')).toBe('tag: #hashtag in the middle');
  });

  it('does not convert a dash in the middle of a paragraph to a bullet', () => {
    expect(stripMarkdownForTerminal('a sentence - with a dash in it'))
      .toBe('a sentence - with a dash in it');
  });

  it('preserves and converts a link inside a heading line', () => {
    expect(stripMarkdownForTerminal('## See [docs](https://example.com)'))
      .toBe('See docs (https://example.com)');
  });

  it('preserves and converts a link inside a bullet line', () => {
    expect(stripMarkdownForTerminal('- see [my site](https://example.com)'))
      .toBe('• see my site (https://example.com)');
  });
});
