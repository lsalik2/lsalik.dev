// The ./esports section of ~/fun, shared by the browser page and `curl /fun`.
//
// The art is plain text in src/data/art/, so swapping it is a file
// replacement: car.txt and ball.txt sit side by side with their bottoms
// aligned, and caption.txt is the text alternative. Together they must fit
// ART_BUDGET columns, so the default 80-column terminal shows the whole scene.
import carRaw from './art/car.txt?raw';
import ballRaw from './art/ball.txt?raw';
import captionRaw from './art/caption.txt?raw';

export interface EsportsStat {
  readonly value: string;
  readonly label: string;
}

export interface CareerEntry {
  readonly when: string;
  readonly role: string;
  readonly place: string; // '' when there is none
}

export interface EsportsLink {
  readonly label: string;
  readonly url: string;
}

export interface Esports {
  readonly handle: string;
  readonly subtitle: string;
  readonly intro: string; // printed after "i'm <handle>. "
  readonly funFact: string;
  readonly status: string;
  readonly stats: readonly EsportsStat[];
  readonly career: readonly CareerEntry[];
  readonly trackerUrl: string;
  readonly links: readonly EsportsLink[];
}

export const ESPORTS: Esports = {
  handle: 'SLK',
  subtitle: "did you know i'm a professional rocket league player and coach?",
  intro: "i've played rocket league competitively since 2015 and coached since 2017.",
  funFact:
    "i started playing rocket league's predecessor, supersonic acrobatic rocket-powered battle-cars (SARPBC for short), in 2009, so most of my life has involved soccar.",
  status: 'coaching now',
  stats: [
    { value: '2200 MMR', label: 'peak rank · Supersonic Legend' },
    { value: '7,000+', label: 'hours played' },
    { value: '100+', label: 'players coached' },
  ],
  career: [
    { when: '2015 – present', role: 'competitive player', place: '' },
    { when: '2020 – present', role: 'head coach', place: 'valor esports' },
    { when: '2019 – 2024', role: 'player', place: 'university of illinois' },
    { when: '2021 – 2024', role: 'esports coordinator', place: 'university of illinois' },
  ],
  trackerUrl: 'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198104442284/overview',
  links: [
    { label: 'liquipedia', url: 'https://liquipedia.net/rocketleague/SLK' },
    { label: 'twitch', url: 'https://twitch.tv/slkrl' },
    { label: 'youtube', url: 'https://youtube.com/@slk-rl' },
    { label: 'x', url: 'https://x.com/slkrl_' },
    { label: 'steam', url: 'https://steamcommunity.com/id/SlkRL' },
  ],
};

export const ART_GAP = 2;
export const ART_BUDGET = 76;

// Lines of an art file: CRLF normalised, trailing spaces trimmed, blank lines
// at the top and bottom dropped (inner blank lines are part of the drawing).
export function parseArt(raw: string): string[] {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n').map(line => line.trimEnd());
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === '') start++;
  while (end > start && lines[end - 1] === '') end--;
  return lines.slice(start, end);
}

export function artWidth(lines: readonly string[]): number {
  return lines.reduce((max, line) => Math.max(max, line.length), 0);
}

// The car and the ball side by side, bottoms aligned.
export function artScene(car: readonly string[], ball: readonly string[], gap: number = ART_GAP): string[] {
  const rows = Math.max(car.length, ball.length);
  const carTop = rows - car.length;
  const ballTop = rows - ball.length;
  const carW = artWidth(car);
  const scene: string[] = [];
  for (let i = 0; i < rows; i++) {
    const left = i >= carTop ? car[i - carTop] : '';
    const right = i >= ballTop ? ball[i - ballTop] : '';
    scene.push((right ? left.padEnd(carW + gap) + right : left).trimEnd());
  }
  return scene;
}

export const ART = {
  car: parseArt(carRaw),
  ball: parseArt(ballRaw),
  caption: captionRaw.trim(),
} as const;

// What fits in `inner` columns: the whole scene, else the car alone, else nothing.
export function artForWidth(inner: number, art: typeof ART = ART): string[] {
  const scene = artScene(art.car, art.ball);
  if (artWidth(scene) <= inner) return scene;
  if (artWidth(art.car) <= inner) return [...art.car];
  return [];
}
