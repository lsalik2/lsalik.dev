import { PALETTES, nextPalette, type PaletteName } from '../lib/palettes';

let current: PaletteName = 'dark-terminal';

function applyPalette(name: PaletteName): void {
  document.documentElement.dataset.palette = name;
  current = name;
  const label = document.getElementById('palette-label');
  if (label) {
    label.textContent = name;
  }
}

document.addEventListener('astro:page-load', () => {
  const btn = document.getElementById('palette-toggle-btn');
  if (!btn) return;

  // Reapply current palette after View Transition navigation
  applyPalette(current);

  btn.addEventListener('click', () => {
    applyPalette(nextPalette(current));
  });
});
