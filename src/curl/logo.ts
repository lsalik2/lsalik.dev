// SLK logo using Unicode half-block characters
// Uses basic ANSI color codes so both terminal and browser (ansiToNodes) can render it.
//
// Grid key:
// G → ▄ (lower half block) in green
// g → ▀ (upper half block) in green
// B → ▄ (lower half block) in blue
// b → ▀ (upper half block) in blue
// A → ▄ (lower half block) in amber
// _ → space (transparent)

const LOGO_LINES = [
  '_GG__GGGG_GG_____GG__GG_',
  'GG__GG____GG_____GG_GG__',
  '_GGGG_____GG_____GGGG___',
  '___gGG____GG_____GG_GG__',
  'GGGG______GGGGGG_GG__GG_',
  'BBBBBBBBBBBBBBBBBBBBBBBBB',
  'AAAAAAAAAAAAAAAAAAAAAAAAA',
];

// Basic ANSI color codes (compatible with ansiToNodes parser)
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const AMBER = '\x1b[33m';
const RST = '\x1b[0m';

// Map grid character to its ANSI color and output character
function charInfo(ch: string): { color: string; char: string } {
  switch (ch) {
    case 'G': return { color: GREEN, char: '\u2584' };
    case 'g': return { color: GREEN, char: '\u2580' };
    case 'B': return { color: BLUE, char: '\u2584' };
    case 'b': return { color: BLUE, char: '\u2580' };
    case 'A': return { color: AMBER, char: '\u2584' };
    case '_': return { color: '', char: ' ' };
    default: return { color: '', char: ch };
  }
}

export function renderLogo(): string {
  const result: string[] = [];

  for (const line of LOGO_LINES) {
    let out = '';
    let activeColor = '';

    for (let i = 0; i < line.length; i++) {
      const { color, char } = charInfo(line[i]);

      if (color !== activeColor) {
        if (activeColor) out += RST;
        if (color) out += color;
        activeColor = color;
      }
      out += char;
    }

    if (activeColor) out += RST;
    result.push(out);
  }

  return result.join('\n');
}
