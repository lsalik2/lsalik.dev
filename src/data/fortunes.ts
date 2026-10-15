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
  'Weeks of coding can save you hours of planning.',
  "The fastest code is the code you didn't write.",
  'Read the error message. No, the whole thing.',
  'Have you tried turning it off and on again?',
  'Real programmers count from 0.',
  "It's not a bug, it's an undocumented feature.",
  'Deleted code has no bugs.',
  'There are 2 hard problems: cache invalidation, naming things, and off-by-one errors.',
  "The cloud is just a computer you can't kick.",
  'Monospace fonts: because every character deserves equal space.',
  "Exit codes don't lie. Logs sometimes do.",
  'Rubber duck debugging works better with an actual duck.',
  'Commit early, commit often, squash later.',
  "One more feature, then I'll write the tests.",
  'Clear is better than clever.',
  'The best time to write a test was before the bug. The second best time is now.',
  'ls -la: because hidden files have feelings too.',
  'Uptime is a state of mind.',
  'Your future self will read this code. Be kind.',
  'Sleep is garbage collection for humans.',
  'git blame is a mirror.',
  'Every quick fix has a long story behind it.',
  'Works on staging is the new works on my machine.',
  'Keep calm and read the man page.',
];

export function pickFortune(rng: () => number = Math.random): string {
  const i = Math.min(FORTUNES.length - 1, Math.floor(rng() * FORTUNES.length));
  return FORTUNES[i];
}

// A fortune other than `current`, so [another] always changes the saying.
export function pickAnotherFortune(current: string, rng: () => number = Math.random): string {
  const others = FORTUNES.filter(f => f !== current);
  if (others.length === 0) return current;
  const i = Math.min(others.length - 1, Math.floor(rng() * others.length));
  return others[i];
}
