// `curl lsalik.dev/fortune` and /fortune in the browser: one of these, at
// random, in a speech bubble. Plain text only (no markdown) so the terminal
// and browser show exactly the same thing.

export const FORTUNES: readonly string[] = [
  'It works on my machine. My machine runs Gentoo, BTW.',
  'The cat is not on the keyboard. The cat IS the keyboard.',
  'Nothing is more permanent than a temporary fix.',
  'Your code compiled on the first try. Be suspicious.',
  "If it's stupid and it works, add a test and a comment.",
  'Talk is cheap. Show me the diff.',
  'A good README is a letter to future you.',
  'Ship it. Then write the blog post about why it broke.',
  'Measure twice, cut once.',
  'Every rocket is a series of controlled explosions.',
  'What a save! (It was the CI.)',
  "There's no place like 127.0.0.1.",
  'The terminal remembers everything. Ctrl+R remembers it for you.',
  "Today's forecast: 90% chance of :wq in the wrong window.",
  "The best keybinding is the one you'll remember tomorrow.",
  "Tabs vs. spaces is settled. It's whatever the formatter says.",
  'Every ASCII character is a pixel if you squint.',
  "There are 10 kinds of people: those who curl this site, and those who don't.",
  'Premature optimization is the root of all evil. Weekend optimization is a hobby.',
];

export function pickFortune(rng: () => number = Math.random): string {
  const i = Math.min(FORTUNES.length - 1, Math.floor(rng() * FORTUNES.length));
  return FORTUNES[i];
}
