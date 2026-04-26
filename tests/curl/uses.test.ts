import { describe, it, expect } from 'vitest';
import { renderUses } from '../../src/curl/render';
import { stripAnsi } from '../../src/curl/ansi';
import type { Uses } from '../../src/data/uses';

const FIXTURE: Uses = {
  categories: [
    {
      heading: 'system',
      items: [
        { key: 'os', value: 'Ubuntu' },
        { key: 'wm', value: 'i3' },
      ],
    },
    {
      heading: 'shell & editor',
      items: [
        { key: 'shell', value: 'bash' },
        { key: 'editor', value: 'neovim' },
      ],
    },
  ],
};

describe('renderUses', () => {
  it('contains ANSI escape codes', () => {
    expect(renderUses(FIXTURE)).toContain('\x1b[');
  });

  it('includes every category heading and every item key/value', () => {
    const out = stripAnsi(renderUses(FIXTURE));
    for (const cat of FIXTURE.categories) {
      expect(out).toContain(cat.heading);
      for (const item of cat.items) {
        expect(out).toContain(item.key);
        expect(out).toContain(item.value);
      }
    }
  });

  it('frames the output with a ~/uses titled box', () => {
    const out = stripAnsi(renderUses(FIXTURE));
    expect(out).toContain('~/uses');
  });

  it('renders each item line as `key: value`', () => {
    const out = stripAnsi(renderUses(FIXTURE));
    expect(out).toMatch(/os\s*:\s*Ubuntu/);
    expect(out).toMatch(/editor\s*:\s*neovim/);
  });
});
