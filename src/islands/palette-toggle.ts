import { PALETTES, type PaletteName } from '../lib/palettes';

const STORAGE_KEY = 'palette';
const DEFAULT_PALETTE: PaletteName = 'dark-terminal';

function readStoredPalette(): PaletteName {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (PALETTES as readonly string[]).includes(saved)) {
      return saved as PaletteName;
    }
  } catch (_) {}
  return DEFAULT_PALETTE;
}

function applyPalette(name: PaletteName): void {
  document.documentElement.dataset.palette = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch (_) {}
  const select = document.getElementById('palette-select') as HTMLSelectElement | null;
  if (select && select.value !== name) select.value = name;
}

document.addEventListener('astro:before-swap', (event) => {
  const ev = event as Event & { newDocument: Document };
  const saved = readStoredPalette();
  ev.newDocument.documentElement.dataset.palette = saved;
});

document.addEventListener('astro:page-load', () => {
  const select = document.getElementById('palette-select') as HTMLSelectElement | null;
  if (!select) return;

  applyPalette(readStoredPalette());

  select.addEventListener('change', () => {
    const value = select.value;
    if ((PALETTES as readonly string[]).includes(value)) {
      applyPalette(value as PaletteName);
    }
  });
});
