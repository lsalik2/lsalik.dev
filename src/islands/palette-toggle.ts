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
  document.querySelectorAll('.palette-dot').forEach(dot => {
    dot.classList.toggle('active', (dot as HTMLElement).dataset.palette === name);
  });
}

document.addEventListener('astro:before-swap', (event) => {
  const ev = event as Event & { newDocument: Document };
  const saved = readStoredPalette();
  ev.newDocument.documentElement.dataset.palette = saved;
});

document.addEventListener('astro:page-load', () => {
  const dots = document.querySelectorAll('.palette-dot');
  if (!dots.length) return;

  const current = readStoredPalette();
  applyPalette(current);

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const palette = (dot as HTMLElement).dataset.palette as PaletteName;
      if (palette) applyPalette(palette);
    });
  });
});
