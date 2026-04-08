export const PALETTES = [
  'dark-terminal',
  'amber-crt',
  'green-phosphor',
  'synthwave',
  'paper',
] as const;
export type PaletteName = typeof PALETTES[number];

export function nextPalette(current: PaletteName): PaletteName {
  const index = PALETTES.indexOf(current);
  return PALETTES[(index + 1) % PALETTES.length];
}

export const PALETTE_LABELS: Record<PaletteName, string> = {
  'dark-terminal': 'Dark Terminal',
  'amber-crt': 'Amber CRT',
  'green-phosphor': 'Green Phosphor',
  'synthwave': 'Synthwave',
  'paper': 'Paper',
};
