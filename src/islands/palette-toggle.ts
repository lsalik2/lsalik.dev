import { PALETTES, nextPalette, type PaletteName } from '../lib/palettes';

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
  const label = document.getElementById('palette-label');
  if (label) label.textContent = name;
}

// Before ClientRouter swaps the new document in, copy our palette onto it
// so there's no flash of the default theme between pages.
document.addEventListener('astro:before-swap', (event) => {
  const ev = event as Event & { newDocument: Document };
  const saved = readStoredPalette();
  ev.newDocument.documentElement.dataset.palette = saved;
});

document.addEventListener('astro:page-load', () => {
  const btn = document.getElementById('palette-toggle-btn');
  if (!btn) return;

  // Label the current palette (html data-palette is already set by the
  // inline head script or the before-swap handler).
  const current = readStoredPalette();
  applyPalette(current);

  btn.addEventListener('click', () => {
    const next = nextPalette(readStoredPalette());
    applyPalette(next);
  });
});
