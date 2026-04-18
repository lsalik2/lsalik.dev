// SLK logo rendered at 8×17 pixel resolution, packed into 4 text rows using
// half-block glyphs (▀ ▄ █) plus space. Two colored underline rows follow.
//
// Pixel mapping per cell (top, bottom):
//   (0,0) -> ' '   (0,1) -> '▄'   (1,0) -> '▀'   (1,1) -> '█'

const RST = '\x1b[39m';

const WIDTH = 17;

// 256-color palette of light foreground colors that stay legible on a black
// terminal background. The word + each underline bar pick from this pool per
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

// Pick `n` distinct color codes from the palette so the word and its two bars
// read as three separate stripes rather than collapsing visually.
function pickDistinctColors(n: number): string[] {
  const pool = [...LIGHT_COLORS];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const j = Math.floor(Math.random() * pool.length);
    out.push(fgCode(pool[j]));
    pool.splice(j, 1);
  }
  return out;
}

// 8 pixel rows × 17 columns. '#' = on, '.' = off.
// Layout: S (cols 0-4), gap (col 5), L (cols 6-10), gap (col 11), K (cols 12-16).
const BITMAP: readonly string[] = [
  '.####.#.....#...#',
  '#.....#.....#..#.',
  '#.....#.....#.#..',
  '.###..#.....##...',
  '....#.#.....##...',
  '....#.#.....#.#..',
  '#...#.#.....#..#.',
  '.###..#####.#...#',
];

function pixel(row: number, col: number): boolean {
  return BITMAP[row][col] === '#';
}

function packPair(top: boolean, bot: boolean): string {
  if (top && bot) return '\u2588'; // █
  if (top) return '\u2580'; // ▀
  if (bot) return '\u2584'; // ▄
  return ' ';
}

function renderLetterRows(colorCode: string): string[] {
  // Pack pixel rows in pairs: (0,1), (2,3), (4,5), (6,7) -> 4 text rows.
  const rows: string[] = [];
  for (let textRow = 0; textRow < 4; textRow++) {
    const topRow = textRow * 2;
    const botRow = textRow * 2 + 1;
    let line = '';
    for (let col = 0; col < WIDTH; col++) {
      line += packPair(pixel(topRow, col), pixel(botRow, col));
    }
    rows.push(`${colorCode}${line}${RST}`);
  }
  return rows;
}

function renderUnderline(colorCode: string): string {
  return `${colorCode}${'\u2584'.repeat(WIDTH)}${RST}`;
}

export function renderLogo(): string {
  const [wordColor, bar1Color, bar2Color] = pickDistinctColors(3);
  const letters = renderLetterRows(wordColor);
  const accentBar = renderUnderline(bar1Color);
  const amberBar = renderUnderline(bar2Color);
  return [...letters, accentBar, amberBar].join('\n');
}
