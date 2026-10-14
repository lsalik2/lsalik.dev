// `curl lsalik.dev/ssh`: what the message of the day says about each cat.
// One line per cat per UTC day, each walking its own list in order. The lists
// differ in length so the pairings change too. Plain text, ≤ 60 characters
// (one line at 80 columns).

export const MAINTAINERS = {
  finch: [
    'too big for the tux',
    'the maine coon to rule them all',
    'opens doorknobs and cabinets. has root on the house',
    'knows where the power button is, and uses it',
    'plays fetch better than most dogs',
    'namesake of finch, the media player',
    'runs on turkey, chicken, milk and tuna',
    'favourite processes: cuddling and playing chase',
    'loyal, and needs attention 24/7. no maintenance window',
    'too smart for childproof locks',
  ],
  raven: [
    'small but mighty',
    'tiny mouth, big vocabulary',
    'shy, but logs everything at verbose level',
    'runs on tuna, minnows and freeze-dried chicken',
    'sleeps in the office. calls it monitoring',
    'favourite toy: the mouse (not the usb one)',
    'curious explorer. has scanned every port in the house',
    'has opinions. will share them, out loud, at length',
    'small enough to fit anywhere, curious enough to try',
  ],
} as const satisfies Record<string, readonly string[]>;

export interface MaintainerLines {
  readonly finch: string;
  readonly raven: string;
}

const DAY_MS = 86_400_000;

export function maintainerLines(date: Date = new Date()): MaintainerLines {
  const day = Math.floor(date.getTime() / DAY_MS);
  return {
    finch: MAINTAINERS.finch[day % MAINTAINERS.finch.length],
    raven: MAINTAINERS.raven[day % MAINTAINERS.raven.length],
  };
}
