import { describe, it, expect } from 'vitest';
import { box, hr, sectionHeader, wrap, twoCol, PAGE_WIDTH } from '../../src/curl/box';
import { stripAnsi, visibleWidth, bold, cyan } from '../../src/curl/ansi';

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

  it('preserves ANSI codes in wrapped output', () => {
    const text = bold('hello') + ' ' + 'world this is a long sentence that wraps';
    const result = wrap(text, 20);
    expect(result).toContain('\x1b[');
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
