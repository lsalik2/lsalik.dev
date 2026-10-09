import { describe, it, expect } from 'vitest';
import { keyAction, exitTarget } from '../../src/lib/screensaver-input';

describe('keyAction', () => {
  it('maps the screensaver keys', () => {
    expect(keyAction('f', false)).toBe('fullscreen');
    expect(keyAction('F', false)).toBe('fullscreen');
    expect(keyAction('h', false)).toBe('toggle-pin');
    expect(keyAction('Escape', false)).toBe('escape');
    expect(keyAction('ArrowLeft', false)).toBe('prev-pattern');
    expect(keyAction('ArrowRight', false)).toBe('next-pattern');
    expect(keyAction('x', false)).toBe('none');
  });

  it('ignores everything but Escape while typing in a panel control (Review Focus #3)', () => {
    for (const key of ['f', 'h', 'ArrowLeft', 'ArrowRight', 'a']) {
      expect(keyAction(key, true)).toBe('none');
    }
    expect(keyAction('Escape', true)).toBe('escape');
  });
});

describe('exitTarget', () => {
  const origin = 'https://lsalik.dev';

  it('returns to a same-origin referrer', () => {
    expect(exitTarget('https://lsalik.dev/blog?page=2', origin)).toBe('/blog?page=2');
  });

  it('never returns to the screensaver itself', () => {
    expect(exitTarget('https://lsalik.dev/screensaver?p=vortex', origin)).toBe('/');
  });

  it('never returns a protocol-relative path that would leave the site', () => {
    expect(exitTarget('https://lsalik.dev//evil.example/x', origin)).toBe('/');
    expect(exitTarget('https://lsalik.dev/%2F%2Fevil.example', origin)).toBe('/%2F%2Fevil.example');
    expect(exitTarget('https://lsalik.dev/\\evil.example', origin)).toBe('/');
  });

  it('falls back to / for empty, foreign, or malformed referrers', () => {
    expect(exitTarget('', origin)).toBe('/');
    expect(exitTarget('https://evil.example/phish', origin)).toBe('/');
    expect(exitTarget('not a url', origin)).toBe('/');
  });
});
