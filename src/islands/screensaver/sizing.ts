import { minFontForViewport, lineHeightFor } from '../ascii-bg';

// The user's cell size, raised if needed so a large screen stays under the
// engine's per-layer cell cap. The saved setting itself is never changed.
export function effectiveFont(cellSize: number, width: number, height: number): { fontSize: number; lineHeight: number } {
  const fontSize = Math.max(cellSize, minFontForViewport(width, height));
  return { fontSize, lineHeight: lineHeightFor(fontSize) };
}
