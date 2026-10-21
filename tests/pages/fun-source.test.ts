import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/pages/fun.astro', 'utf8');

it('has the three sections in order and keeps the #curl anchor', () => {
  const at = (s: string) => src.indexOf(s);
  expect(at('id="play"')).toBeGreaterThan(-1);
  expect(at('id="play"')).toBeLessThan(at('id="terminal"'));
  expect(at('id="terminal"')).toBeLessThan(at('id="esports"'));
  expect(src).toContain('id="curl"');
});

it('fun page uses palette tokens only', () => {
  // A token with a fallback, var(--x, #hex), is still a token.
  const style = src.slice(src.indexOf('<style')).replace(/var\([^)]*\)/g, 'var()');
  expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
});

it('takes the saying count from FORTUNES', () => {
  expect(src).toContain('FORTUNES.length');
  expect(src).not.toMatch(/\b43 sayings/);
});

it('keeps [copy] hidden until its script runs, despite the button display rule', () => {
  // [hidden] loses to any author display rule, so it needs its own rule.
  expect(src).toContain('data-copy="curl -L lsalik.dev" hidden');
  expect(src).toMatch(/\.fun-button\[hidden\]\s*\{\s*display:\s*none;?\s*\}/);
});
