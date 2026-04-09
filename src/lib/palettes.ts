export const PALETTES = [
  'dark-terminal',
  'amber-crt',
  'green-phosphor',
  'synthwave',
  'mocha',
] as const;
export type PaletteName = typeof PALETTES[number];

export function nextPalette(current: PaletteName): PaletteName {
  const index = PALETTES.indexOf(current);
  return PALETTES[(index + 1) % PALETTES.length];
}
