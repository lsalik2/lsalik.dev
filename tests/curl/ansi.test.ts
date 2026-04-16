import { describe, it, expect } from 'vitest';
import {
  bold, dim, underline, green, blue, amber, red, cyan, reset,
  borderDim, titleBright, bodyWarm, accentMagenta, accentGreen,
  stripAnsi, visibleWidth, stripDangerousEscapes,
} from '../../src/curl/ansi';

describe('bold', () => {
  it('wraps text with bold ANSI codes', () => {
    expect(bold('hello')).toBe('\x1b[1mhello\x1b[22m');
  });
});

describe('dim', () => {
  it('wraps text with dim ANSI codes', () => {
    expect(dim('hello')).toBe('\x1b[2mhello\x1b[22m');
  });
});

describe('underline', () => {
  it('wraps text with underline ANSI codes', () => {
    expect(underline('hello')).toBe('\x1b[4mhello\x1b[24m');
  });
});

describe('green', () => {
  it('wraps text with green ANSI codes', () => {
    expect(green('hello')).toBe('\x1b[32mhello\x1b[39m');
  });
});

describe('blue', () => {
  it('wraps text with blue ANSI codes', () => {
    expect(blue('hello')).toBe('\x1b[34mhello\x1b[39m');
  });
});

describe('amber', () => {
  it('wraps text with amber (yellow) ANSI codes', () => {
    expect(amber('hello')).toBe('\x1b[33mhello\x1b[39m');
  });
});

describe('red', () => {
  it('wraps text with red ANSI codes', () => {
    expect(red('hello')).toBe('\x1b[31mhello\x1b[39m');
  });
});

describe('cyan', () => {
  it('wraps text with cyan ANSI codes', () => {
    expect(cyan('hello')).toBe('\x1b[36mhello\x1b[39m');
  });
});

describe('reset', () => {
  it('returns reset ANSI code', () => {
    expect(reset()).toBe('\x1b[0m');
  });
});

describe('borderDim', () => {
  it('wraps text with 256-color code 241', () => {
    expect(borderDim('x')).toBe('\x1b[38;5;241mx\x1b[39m');
  });
});

describe('titleBright', () => {
  it('wraps text with 256-color code 87', () => {
    expect(titleBright('x')).toBe('\x1b[38;5;87mx\x1b[39m');
  });
});

describe('bodyWarm', () => {
  it('wraps text with 256-color code 223', () => {
    expect(bodyWarm('x')).toBe('\x1b[38;5;223mx\x1b[39m');
  });
});

describe('accentMagenta', () => {
  it('wraps text with 256-color code 211', () => {
    expect(accentMagenta('x')).toBe('\x1b[38;5;211mx\x1b[39m');
  });
});

describe('accentGreen', () => {
  it('wraps text with 256-color code 120', () => {
    expect(accentGreen('x')).toBe('\x1b[38;5;120mx\x1b[39m');
  });
});

describe('stripAnsi', () => {
  it('strips basic SGR codes', () => {
    expect(stripAnsi('\x1b[1mhello\x1b[22m')).toBe('hello');
  });

  it('strips 256-color SGR codes', () => {
    expect(stripAnsi('\x1b[38;5;87mhello\x1b[39m')).toBe('hello');
  });

  it('returns plain text unchanged', () => {
    expect(stripAnsi('hello')).toBe('hello');
  });
});

describe('visibleWidth', () => {
  it('ignores ANSI codes in width calculation', () => {
    expect(visibleWidth('\x1b[1mhello\x1b[22m')).toBe(5);
  });

  it('counts plain characters correctly', () => {
    expect(visibleWidth('hello')).toBe(5);
  });

  it('counts box-drawing glyphs as 1 each', () => {
    expect(visibleWidth('┌──┐')).toBe(4);
  });
});

describe('stripDangerousEscapes', () => {
  it('passes SGR colour sequences through unchanged', () => {
    const sgr = '\x1b[32mhello\x1b[39m';
    expect(stripDangerousEscapes(sgr)).toBe(sgr);
  });

  it('passes 256-colour SGR sequences through unchanged', () => {
    const sgr = '\x1b[38;5;87mfoo\x1b[39m';
    expect(stripDangerousEscapes(sgr)).toBe(sgr);
  });

  it('removes OSC 8 hyperlink sequences', () => {
    // ESC ] 8 ; ; url BEL  text  ESC ] 8 ; ; BEL
    const osc = '\x1b]8;;https://example.com\x07click\x1b]8;;\x07';
    expect(stripDangerousEscapes(osc)).toBe('click');
  });

  it('removes iTerm2 OSC 1337 file transfer sequences', () => {
    const iterm = '\x1b]1337;File=name=foo.png:data\x07';
    expect(stripDangerousEscapes(iterm)).toBe('');
  });

  it('removes CSI cursor-move sequence ESC[2J (screen clear)', () => {
    expect(stripDangerousEscapes('\x1b[2J')).toBe('');
  });

  it('removes CSI non-SGR sequences (cursor up, etc.)', () => {
    expect(stripDangerousEscapes('\x1b[5A')).toBe('');
    expect(stripDangerousEscapes('\x1b[?1049h')).toBe(''); // alt-screen
  });

  it('removes bare ESC + single char (ESC c = terminal reset)', () => {
    expect(stripDangerousEscapes('\x1bc')).toBe('');
  });

  it('preserves plain text around dangerous sequences', () => {
    const input = 'before\x1b[2Jafter';
    expect(stripDangerousEscapes(input)).toBe('beforeafter');
  });

  it('handles mixed SGR + dangerous sequences', () => {
    const input = '\x1b[1mbold\x1b[22m\x1b[2J\x1b[32mgreen\x1b[39m';
    expect(stripDangerousEscapes(input)).toBe('\x1b[1mbold\x1b[22m\x1b[32mgreen\x1b[39m');
  });
});
