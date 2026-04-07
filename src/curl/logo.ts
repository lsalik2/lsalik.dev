import { green, blue, amber, cyan, red } from './ansi';

const LOGO_LINES = [
  'AA  AA  AAAA     AAA   AAAAA ',
  'CC  CC CC  BB  ACB BCA CC  CC',
  ' BCCB   BBBBCA CCAAACC CCAACB',
  '  CC   BCAAACB CC   CC CC    ',
];

const COLOR_MAP: Record<string, (text: string) => string> = {
  A: green,
  B: blue,
  C: amber,
};

function colorizeLogo(lines: string[]): string[] {
  return lines.map(line => {
    let result = '';
    for (const ch of line) {
      const colorFn = COLOR_MAP[ch];
      if (colorFn) {
        result += colorFn(ch);
      } else if (ch === ' ') {
        result += ' ';
      } else {
        result += ch;
      }
    }
    return result;
  });
}

export function renderLogo(): string {
  const colored = colorizeLogo(LOGO_LINES);
  const separator1 = red('D'.repeat(29));
  const separator2 = cyan('E'.repeat(29));
  return [...colored, separator1, separator2].join('\n');
}
