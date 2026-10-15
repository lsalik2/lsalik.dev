// Sizing for the browser curl demo: how many columns to render, and at what
// font size, so the output fits its box the way it would fit a terminal of
// that width. Pure; the curl-demo island measures and applies.

import { MIN_COLS, DEFAULT_COLS } from './terminal-width';

export const DEMO_MIN_COLS = MIN_COLS;     // the narrowest width the renderer supports
export const DEMO_MAX_COLS = DEFAULT_COLS; // what a real `curl lsalik.dev` gets

export function fitDemo(availablePx: number, charPx: number, basePx: number): { cols: number; fontPx: number } {
  const fit = Math.floor(availablePx / charPx);
  if (fit >= DEMO_MIN_COLS) return { cols: Math.min(fit, DEMO_MAX_COLS), fontPx: basePx };
  // Too narrow even for the minimum: shrink the font until it fits, rounded
  // down to a tenth of a pixel so rounding can't tip it over the edge.
  const fontPx = Math.floor(((basePx * availablePx) / (DEMO_MIN_COLS * charPx)) * 10) / 10;
  return { cols: DEMO_MIN_COLS, fontPx };
}
