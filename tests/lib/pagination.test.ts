import { describe, it, expect } from 'vitest';
import { paginate, parsePage, withPage } from '../../src/lib/pagination';

describe('paginate', () => {
  it('slices the first page', () => {
    expect(paginate(9, 1, 5)).toEqual({ page: 1, pageCount: 2, start: 0, end: 5 });
  });

  it('slices a partial last page', () => {
    expect(paginate(9, 2, 5)).toEqual({ page: 2, pageCount: 2, start: 5, end: 9 });
  });

  it('handles an exact multiple of the page size', () => {
    expect(paginate(10, 2, 5)).toEqual({ page: 2, pageCount: 2, start: 5, end: 10 });
  });

  it('clamps pages past the end to the last page', () => {
    expect(paginate(9, 99, 5)).toEqual({ page: 2, pageCount: 2, start: 5, end: 9 });
  });

  it('clamps pages below 1 to the first page', () => {
    expect(paginate(9, 0, 5).page).toBe(1);
    expect(paginate(9, -3, 5).page).toBe(1);
  });

  it('reports a single empty page when there are no items', () => {
    expect(paginate(0, 3, 5)).toEqual({ page: 1, pageCount: 1, start: 0, end: 0 });
  });

  it('fits everything on one page when total <= size', () => {
    expect(paginate(5, 1, 5)).toEqual({ page: 1, pageCount: 1, start: 0, end: 5 });
  });
});

describe('parsePage', () => {
  it('reads a positive integer page param', () => {
    expect(parsePage('?page=3')).toBe(3);
  });

  it('defaults to 1 when the param is missing', () => {
    expect(parsePage('')).toBe(1);
    expect(parsePage('?q=hello')).toBe(1);
  });

  it('defaults to 1 for garbage, zero, negative, or fractional values', () => {
    expect(parsePage('?page=abc')).toBe(1);
    expect(parsePage('?page=0')).toBe(1);
    expect(parsePage('?page=-2')).toBe(1);
    expect(parsePage('?page=2.5')).toBe(1);
    expect(parsePage('?page=2abc')).toBe(1);
  });
});

describe('withPage', () => {
  it('sets the page param', () => {
    expect(withPage('https://lsalik.dev/blog', 2)).toBe('/blog?page=2');
  });

  it('replaces an existing page param and keeps other params and the hash', () => {
    expect(withPage('https://lsalik.dev/blog?page=2&x=1#top', 3)).toBe('/blog?page=3&x=1#top');
  });

  it('drops the param on page 1 for a clean URL', () => {
    expect(withPage('https://lsalik.dev/blog?page=2', 1)).toBe('/blog');
    expect(withPage('https://lsalik.dev/blog?page=2&x=1', 1)).toBe('/blog?x=1');
  });
});
