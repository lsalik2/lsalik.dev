// SLK logo rendered at 8×17 pixel resolution, packed into 4 text rows using
// half-block glyphs (▀ ▄ █) plus space. Two colored underline rows follow.
//
// Pixel mapping per cell (top, bottom):
//   (0,0) -> ' '   (0,1) -> '▄'   (1,0) -> '▀'   (1,1) -> '█'

const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const AMBER = '\x1b[33m';
const RST = '\x1b[0m';

const WIDTH = 17;

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

function renderLetterRows(): string[] {
  // Pack pixel rows in pairs: (0,1), (2,3), (4,5), (6,7) -> 4 text rows.
  const rows: string[] = [];
  for (let textRow = 0; textRow < 4; textRow++) {
    const topRow = textRow * 2;
    const botRow = textRow * 2 + 1;
    let line = '';
    for (let col = 0; col < WIDTH; col++) {
      line += packPair(pixel(topRow, col), pixel(botRow, col));
    }
    rows.push(`${GREEN}${line}${RST}`);
  }
  return rows;
}

function renderUnderline(colorCode: string): string {
  return `${colorCode}${'\u2584'.repeat(WIDTH)}${RST}`;
}

export function renderLogo(): string {
  const letters = renderLetterRows();
  const accentBar = renderUnderline(BLUE);
  const amberBar = renderUnderline(AMBER);
  return [...letters, accentBar, amberBar].join('\n');
}
