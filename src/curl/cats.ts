// Cat art for the terminal views, flush-left (the widest line starts at
// column 0). Callers indent it.

import { color256 } from './ansi';

// Finch — tuxedo Maine Coon (/ssh). Drawn tall, with a white bib and paws.
export const FINCH: readonly string[] = [
  '   /\\_____/\\',
  '  /  o | o  \\',
  ' ( ==  ^  == )',
  '  )  \\:::/  (',
  ' /    \\:/    \\',
  '(      v      )',
  ' \\  |     |  /',
  '  ) |     | (',
  ' (_(_)___(_)_)',
];

// Raven — small Bombay (/ssh). Drawn compact and black all over.
export const RAVEN: readonly string[] = [
  '  /\\_/\\',
  ' ( o.o )',
  '  > ^ <',
  ' /     \\',
  '(  | |  )',
  '(__|_|__)',
];

// Colour masks, same shape as the art: W white fur, E eyes, N nose. Any
// other drawn character is black fur.
export const FINCH_MASK: readonly string[] = [
  '',
  '     E W E',
  '   WW  N  WW',
  '     WWWWW',
  '      WWW',
  '       W',
  '',
  '',
  '   WWW   WWW',
];

export const RAVEN_MASK: readonly string[] = [
  '',
  '   E E',
  '',
  '',
  '',
  '',
];

// Taken from a photo of the cats. Black fur is grey so it shows on a dark
// terminal.
const CAT_COLOURS: Readonly<Record<string, number>> = { W: 255, E: 150, N: 218 };
const FUR = 243;

// Colour each row by its mask, one escape per run of same-coloured
// characters; spaces stay plain.
export function paintCat(rows: readonly string[], mask: readonly string[]): string[] {
  return rows.map((row, y) => {
    let out = '';
    let run = '';
    let colour: number | null = null;
    const flush = () => {
      if (run) out += colour === null ? run : color256(colour, run);
      run = '';
    };
    [...row].forEach((ch, x) => {
      const c = ch === ' ' ? null : CAT_COLOURS[mask[y]?.[x] ?? ''] ?? FUR;
      if (c !== colour) {
        flush();
        colour = c;
      }
      run += ch;
    });
    flush();
    return out;
  });
}

// The cat under the /fortune speech bubble.
export const FORTUNE_CAT: readonly string[] = [
  ' /\\_/\\',
  '( o.o )',
  ' > ^ <',
];
