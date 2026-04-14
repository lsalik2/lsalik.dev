import { describe, it, expect } from 'vitest';
import { PALETTES } from '../../src/lib/palettes';

describe('PALETTES', () => {
  it('contains all expected palette ids in stable order', () => {
    expect(PALETTES).toEqual([
      'dark-terminal',
      'amber-crt',
      'green-phosphor',
      'synthwave',
      'mocha',
      'solarized',
      'gruvbox',
      'nord',
    ]);
  });

  it('has no duplicates', () => {
    expect(new Set(PALETTES).size).toBe(PALETTES.length);
  });
});
