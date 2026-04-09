import { describe, it, expect } from 'vitest';
import { PALETTES, nextPalette } from '../../src/lib/palettes';

describe('PALETTES', () => {
  it('contains all 5 expected palette ids in stable order', () => {
    expect(PALETTES).toEqual([
      'dark-terminal',
      'amber-crt',
      'green-phosphor',
      'synthwave',
      'mocha',
    ]);
  });

  it('has no duplicates', () => {
    expect(new Set(PALETTES).size).toBe(PALETTES.length);
  });
});

describe('nextPalette', () => {
  it('cycles forward through the list and wraps', () => {
    expect(nextPalette('dark-terminal')).toBe('amber-crt');
    expect(nextPalette('amber-crt')).toBe('green-phosphor');
    expect(nextPalette('green-phosphor')).toBe('synthwave');
    expect(nextPalette('synthwave')).toBe('mocha');
    expect(nextPalette('mocha')).toBe('dark-terminal');
  });
});
