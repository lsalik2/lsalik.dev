import { describe, it, expect } from 'vitest';
import { bold, dim, underline, green, blue, amber, red, cyan, reset } from '../../src/curl/ansi';

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
