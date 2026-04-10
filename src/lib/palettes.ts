export const PALETTES = [
  'dark-terminal',
  'amber-crt',
  'green-phosphor',
  'synthwave',
  'mocha',
] as const;
export type PaletteName = typeof PALETTES[number];
