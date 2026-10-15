import { describe, it, expect } from 'vitest';
import { box, hr, sectionHeader, wrap, twoCol, PAGE_WIDTH } from '../../src/curl/box';
import { stripAnsi, visibleWidth, bold, cyan, dim } from '../../src/curl/ansi';

describe('PAGE_WIDTH', () => {
  it('is 80', () => {
    expect(PAGE_WIDTH).toBe(80);
  });
});

describe('box', () => {
  it('wraps lines in a unicode frame at PAGE_WIDTH', () => {
    const result = box(['hello']);
    const lines = result.split('\n');
    expect(lines[0]).toContain('┌');
    expect(lines[0]).toContain('┐');
    expect(lines[lines.length - 1]).toContain('└');
    expect(lines[lines.length - 1]).toContain('┘');
    expect(lines[1]).toContain('hello');
  });

  it('pads inner lines to the full width', () => {
    const result = box(['hi']);
    const lines = result.split('\n');
    for (const line of lines) {
      expect(visibleWidth(line)).toBe(PAGE_WIDTH);
    }
  });

  it('renders a title on the top border', () => {
    const result = box(['content'], { title: 'test' });
    const topLine = stripAnsi(result.split('\n')[0]);
    expect(topLine).toContain('test');
    expect(topLine).toContain('┌');
  });

  it('handles empty lines', () => {
    const result = box(['', 'hello', '']);
    const lines = result.split('\n');
    expect(lines.length).toBe(5); // top + 3 content + bottom
  });

  it('ANSI-colored content still aligns correctly', () => {
    const result = box([bold(cyan('colored'))]);
    const lines = result.split('\n');
    for (const line of lines) {
      expect(visibleWidth(line)).toBe(PAGE_WIDTH);
    }
  });

  it('respects custom width', () => {
    const result = box(['hi'], { width: 40 });
    const lines = result.split('\n');
    for (const line of lines) {
      expect(visibleWidth(line)).toBe(40);
    }
  });
});

describe('hr', () => {
  it('returns a horizontal rule at PAGE_WIDTH', () => {
    const result = hr();
    expect(stripAnsi(result)).toBe('─'.repeat(80));
  });

  it('respects custom width', () => {
    const result = hr(40);
    expect(stripAnsi(result)).toBe('─'.repeat(40));
  });
});

describe('sectionHeader', () => {
  it('returns bold title followed by hr', () => {
    const result = sectionHeader('TITLE');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(stripAnsi(lines[0])).toBe('TITLE');
    expect(stripAnsi(lines[1])).toBe('─'.repeat(80));
  });
});

describe('wrap', () => {
  it('wraps long text to the given width', () => {
    const text = 'a '.repeat(50).trim();
    const result = wrap(text, 20);
    for (const line of result.split('\n')) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(20);
    }
  });

  it('preserves existing newlines as hard breaks', () => {
    const result = wrap('foo\nbar', 80);
    expect(result).toBe('foo\nbar');
  });

  it('passes through short text unchanged', () => {
    expect(wrap('hello', 80)).toBe('hello');
  });

  it('handles empty string', () => {
    expect(wrap('', 80)).toBe('');
  });

  it('hard-splits an oversized token', () => {
    const long = 'x'.repeat(30);
    const result = wrap(long, 10);
    for (const line of result.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(10);
    }
  });

  it('closes styling at each break and reopens it on the next line', () => {
    const text = 'tip: add ?cols=$COLUMNS to any URL to fit your terminal';
    const lines = wrap(dim(text), 36).split('\n');
    expect(lines.length).toBe(2);
    // Each line carries its own styling, so a frame drawn after it (or a
    // browser converting one line at a time) neither inherits nor loses it.
    expect(lines[0]).toBe('\x1b[2mtip: add ?cols=$COLUMNS to any URL \x1b[0m');
    expect(lines[1]).toBe('\x1b[2mto fit your terminal\x1b[22m');
  });

  it('leaves text that fits on one line byte-for-byte unchanged', () => {
    const line = `${cyan('curl -L lsalik.dev')}  ${dim('a fortune')}`;
    expect(wrap(line, 80)).toBe(line);
  });

  it('keeps a box border out of a wrapped line\'s styling', () => {
    const body = box([dim('tip: add ?cols=$COLUMNS to any URL to fit your terminal')], { width: 40 }).split('\n').slice(1, -1);
    for (const line of body) {
      const beforeBorder = line.slice(0, line.lastIndexOf('│'));
      const opened = beforeBorder.lastIndexOf('\x1b[2m');
      const closed = Math.max(beforeBorder.lastIndexOf('\x1b[22m'), beforeBorder.lastIndexOf('\x1b[0m'));
      expect(opened === -1 || closed > opened, JSON.stringify(line)).toBe(true);
    }
  });

  it('preserves ANSI codes in wrapped output', () => {
    const text = bold('hello') + ' ' + 'world this is a long sentence that wraps';
    const result = wrap(text, 20);
    expect(result).toContain('\x1b[');
  });
});

describe('box with wrap: false', () => {
  it('preserves leading whitespace on each line', () => {
    const out = box(['   /\\_/\\', '  ( o.o )'], { width: 40, wrap: false });
    const lines = stripAnsi(out).split('\n');
    // Body lines are framed: "│ " + content + filler + " │"
    expect(lines[1]).toBe('│    /\\_/\\' + ' '.repeat(40 - 2 - 2 - '   /\\_/\\'.length) + ' │');
    expect(lines[2]).toBe('│   ( o.o )' + ' '.repeat(40 - 2 - 2 - '  ( o.o )'.length) + ' │');
  });

  it('still wraps long lines when wrap is not disabled (default)', () => {
    const longLine = 'x'.repeat(100);
    const out = box([longLine], { width: 40 });
    const lines = stripAnsi(out).split('\n');
    // Default behavior: long line is soft-wrapped onto multiple body lines.
    expect(lines.length).toBeGreaterThan(3);
  });

  it('does not crash when a line exceeds the inner width (caller-owned overflow)', () => {
    // wrap:false documents that callers guarantee width. If they don't,
    // the line should still render without throwing — it just protrudes past
    // the right border. Lock that in so the comment stays honest.
    const longLine = 'y'.repeat(100);
    expect(() => box([longLine], { width: 20, wrap: false })).not.toThrow();
    const out = box([longLine], { width: 20, wrap: false });
    const lines = stripAnsi(out).split('\n');
    // Top border, one body row containing the full long line, bottom border.
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(longLine);
  });
});

describe('twoCol', () => {
  it('puts left and right on one line', () => {
    const result = twoCol('left', 'right', 40);
    expect(visibleWidth(result)).toBe(40);
    const plain = stripAnsi(result);
    expect(plain.startsWith('left')).toBe(true);
    expect(plain.endsWith('right')).toBe(true);
  });

  it('stacks when content overflows', () => {
    const left = 'x'.repeat(35);
    const right = 'y'.repeat(35);
    const result = twoCol(left, right, 40);
    expect(result).toContain('\n');
  });
});

describe('box titles', () => {
  it('truncates a title that would overflow the top border', () => {
    const out = box(['x'], { title: 'A screensaver, an /ssh easter egg, and the rest of the roadmap', width: 40 });
    const top = stripAnsi(out.split('\n')[0]);
    expect([...top].length).toBe(40);
    expect(top).toContain('…');
    expect(top.endsWith('┐')).toBe(true);
  });

  it('leaves titles that fit untouched', () => {
    const top = stripAnsi(box(['x'], { title: 'motd', width: 40 }).split('\n')[0]);
    expect(top.startsWith('┌── motd ')).toBe(true);
    expect([...top].length).toBe(40);
  });
});
