// Curl logo: a random, mirrored 8×17 pixel mark (identicon-style), different
// on every request. Packed into 4 text rows using half-block glyphs (▀ ▄ █)
// plus space. Two colored underline rows follow.
//
// Pixel mapping per cell (top, bottom):
//   (0,0) -> ' '   (0,1) -> '▄'   (1,0) -> '▀'   (1,1) -> '█'

const RST = '\x1b[39m';

const WIDTH = 17;

// 256-color palette of light foreground colors that stay legible on a black
// terminal background. The mark + each underline bar pick from this pool per
// render.
const LIGHT_COLORS: readonly number[] = [
  87,  // bright cyan
  120, // light green
  159, // pale cyan
  189, // pale lavender
  195, // pale blue
  210, // salmon
  211, // pink
  215, // peach
  218, // light pink
  219, // magenta pink
  222, // wheat
  223, // cream
  228, // pale yellow
  229, // parchment
];

function fgCode(idx: number): string {
  return `\x1b[38;5;${idx}m`;
}

// Pick `n` distinct color codes from the palette so the mark and its two bars
// read as three separate stripes rather than collapsing visually.
function pickDistinctColors(n: number, rng: () => number): string[] {
  const pool = [...LIGHT_COLORS];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const j = Math.floor(rng() * pool.length);
    out.push(fgCode(pool[j]));
    pool.splice(j, 1);
  }
  return out;
}

export const LOGO_HEIGHT = 8;
export const LOGO_WIDTH = WIDTH;

const HALF = (WIDTH - 1) / 2; // columns left of the mirror axis
const CENTER = HALF;
const MIN_FILL = 0.35;
const MAX_FILL = 0.65;
const MIN_CENTER = 2;
const MAX_ATTEMPTS = 20;

// Rejects patterns that read badly at this size: near-blank smudges, solid
// blocks, rows with a hole straight through, or a bare center column that
// splits the mirror into two unrelated shapes.
export function isAcceptable(pattern: readonly string[]): boolean {
  let on = 0;
  for (const row of pattern) {
    if (!row.includes('#')) return false;
    for (const ch of row) if (ch === '#') on++;
  }
  const fill = on / (LOGO_WIDTH * LOGO_HEIGHT);
  if (fill < MIN_FILL || fill > MAX_FILL) return false;
  const center = pattern.filter(row => row[CENTER] === '#').length;
  return center >= MIN_CENTER;
}

function randomPattern(rng: () => number): string[] {
  const rows: string[] = [];
  for (let r = 0; r < LOGO_HEIGHT; r++) {
    let left = '';
    for (let c = 0; c < HALF; c++) left += rng() < 0.5 ? '#' : '.';
    const mid = rng() < 0.5 ? '#' : '.';
    rows.push(left + mid + [...left].reverse().join(''));
  }
  return rows;
}

// Identicon-style mark: random left half, mirrored onto the right. Retries
// until the pattern passes isAcceptable(), falling back to the last attempt
// so a degenerate rng can never hang the request.
export function generatePattern(rng: () => number = Math.random): string[] {
  let pattern = randomPattern(rng);
  for (let i = 1; i < MAX_ATTEMPTS && !isAcceptable(pattern); i++) {
    pattern = randomPattern(rng);
  }
  return pattern;
}

function pixel(pattern: readonly string[], row: number, col: number): boolean {
  return pattern[row][col] === '#';
}

function packPair(top: boolean, bot: boolean): string {
  if (top && bot) return '\u2588'; // █
  if (top) return '\u2580'; // ▀
  if (bot) return '\u2584'; // ▄
  return ' ';
}

function renderPatternRows(pattern: readonly string[], colorCode: string): string[] {
  // Pack pixel rows in pairs: (0,1), (2,3), (4,5), (6,7) -> 4 text rows.
  const rows: string[] = [];
  for (let textRow = 0; textRow < 4; textRow++) {
    const topRow = textRow * 2;
    const botRow = textRow * 2 + 1;
    let line = '';
    for (let col = 0; col < WIDTH; col++) {
      line += packPair(pixel(pattern, topRow, col), pixel(pattern, botRow, col));
    }
    rows.push(`${colorCode}${line}${RST}`);
  }
  return rows;
}

function renderUnderline(colorCode: string): string {
  return `${colorCode}${'\u2584'.repeat(WIDTH)}${RST}`;
}

// A fresh mark on every call. The pattern is drawn from `rng` before the
// colors so a seeded rng reproduces the same shape in tests.
export function renderLogo(rng: () => number = Math.random): string {
  const pattern = generatePattern(rng);
  const [markColor, bar1Color, bar2Color] = pickDistinctColors(3, rng);
  const rows = renderPatternRows(pattern, markColor);
  return [...rows, renderUnderline(bar1Color), renderUnderline(bar2Color)].join('\n');
}
