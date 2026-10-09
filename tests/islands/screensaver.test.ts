import { describe, it, expect } from 'vitest';
import { copyShareUrl } from '../../src/islands/screensaver/panel';
import { effectiveFont } from '../../src/islands/screensaver/sizing';

describe('copyShareUrl (Review Focus #4)', () => {
  it('copies when the clipboard works', async () => {
    let got = '';
    const result = await copyShareUrl('https://lsalik.dev/screensaver?p=vortex', {
      writeText: async t => { got = t; },
    });
    expect(result).toBe('copied');
    expect(got).toBe('https://lsalik.dev/screensaver?p=vortex');
  });

  it('falls back when there is no clipboard API', async () => {
    expect(await copyShareUrl('u', undefined)).toBe('fallback');
  });

  it('falls back when writeText rejects (permission denied)', async () => {
    expect(await copyShareUrl('u', { writeText: () => Promise.reject(new Error('denied')) })).toBe('fallback');
  });
});

describe('effectiveFont (Review Focus #5)', () => {
  it('uses the chosen cell size when the viewport allows it', () => {
    expect(effectiveFont(11, 1920, 1080)).toEqual({ fontSize: 11, lineHeight: 13 });
  });

  it('raises the font to stay under the cell cap on a 4K screen', () => {
    const f = effectiveFont(8, 3840, 2160);
    expect(f.fontSize).toBeGreaterThan(8);
  });
});
