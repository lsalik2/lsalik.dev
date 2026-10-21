import { describe, it, expect } from 'vitest';
import { ART, ART_BUDGET, ART_GAP, ESPORTS, artForWidth, artScene, artWidth, parseArt } from '../../src/data/esports';

describe('parseArt', () => {
  it('trims trailing spaces and blank edge lines, and normalises CRLF', () => {
    expect(parseArt('\n  ab  \r\n c\n\n')).toEqual(['  ab', ' c']);
  });
});

describe('the art files', () => {
  it('use printable characters only, with no tabs', () => {
    for (const line of [...ART.car, ...ART.ball]) expect(line).toMatch(/^[\x20-\x7E·≈]*$/);
  });
  it('fit the 76-column budget side by side', () => {
    expect(artWidth(ART.car) + ART_GAP + artWidth(ART.ball)).toBeLessThanOrEqual(ART_BUDGET);
  });
  it('have a one-line caption', () => {
    expect(ART.caption).toBe('ASCII art of a Fennec, a Rocket League car, next to the ball.');
  });
});

describe('artScene', () => {
  it('aligns the bottoms and keeps the gap', () => {
    expect(artScene(['A', 'AA', 'AAA'], ['b'], 2)).toEqual(['A', 'AA', 'AAA  b']);
  });
});

describe('artForWidth', () => {
  const sceneWidth = artWidth(artScene(ART.car, ART.ball));
  it('draws the whole scene when it fits', () => expect(artForWidth(sceneWidth)).toEqual(artScene(ART.car, ART.ball)));
  it('draws the car alone when only the car fits', () => expect(artForWidth(sceneWidth - 1)).toEqual([...ART.car]));
  it('draws nothing when the car does not fit', () => expect(artForWidth(artWidth(ART.car) - 1)).toEqual([]));
});

describe('ESPORTS', () => {
  it('has the approved stats and career, in order', () => {
    expect(ESPORTS.stats).toEqual([
      { value: '2200 MMR', label: 'peak rank · Supersonic Legend' },
      { value: '7,000+', label: 'hours played' },
      { value: '100+', label: 'players coached' },
    ]);
    expect(ESPORTS.career).toEqual([
      { when: '2015 – present', role: 'competitive player', place: '' },
      { when: '2020 – present', role: 'head coach', place: 'valor esports' },
      { when: '2019 – 2024', role: 'player', place: 'university of illinois' },
      { when: '2021 – 2024', role: 'esports coordinator', place: 'university of illinois' },
    ]);
  });
  it('links the tracker and the esports profiles, without the Discord server', () => {
    expect(ESPORTS.trackerUrl).toBe('https://rocketleague.tracker.network/rocket-league/profile/steam/76561198104442284/overview');
    expect(ESPORTS.links.map(l => l.label)).toEqual(['liquipedia', 'twitch', 'youtube', 'x', 'steam']);
    expect(ESPORTS.links.some(l => l.url.includes('discord'))).toBe(false);
  });
});
