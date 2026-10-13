// Terminal width for curl responses: `curl "lsalik.dev/blog?cols=$COLUMNS"`
// sizes boxes, headers and two-column rows to the caller's terminal. Anything
// that isn't a plain integer falls back to the classic 80 columns.

export const DEFAULT_COLS = 80;
export const MIN_COLS = 40;
export const MAX_COLS = 160;

export function parseCols(search: string): number {
  const raw = new URLSearchParams(search).get('cols');
  if (raw === null || !/^\d+$/.test(raw)) return DEFAULT_COLS;
  return Math.min(MAX_COLS, Math.max(MIN_COLS, Number(raw)));
}
