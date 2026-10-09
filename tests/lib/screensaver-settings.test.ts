import { describe, it, expect } from 'vitest';
import {
  defaultSettings,
  sanitize,
  parseStored,
  parseSearchParams,
  toSearchParams,
  resolveSettings,
  stepPattern,
  PATTERN_NAMES,
  type ScreensaverSettings,
} from '../../src/lib/screensaver-settings';

const D = defaultSettings('dark-terminal');

describe('defaultSettings', () => {
  it('matches the spec defaults', () => {
    expect(D).toEqual({
      pattern: 'cycle',
      cycleMinutes: 5,
      speed: 1,
      cellSize: 11,
      brightness: 0.6,
      colorSource: 'dark-terminal',
      custom: { bg: '#0d1117', layers: ['#c9d1d9', '#8b949e', '#58a6ff'] },
      colorAnim: 'none',
      colorAnimSeconds: 60,
      clock: 'digital',
      clock24h: false,
      clockPos: 'center',
    });
  });

  it('uses the given site palette, falling back on unknown names', () => {
    expect(defaultSettings('nord').colorSource).toBe('nord');
    expect(defaultSettings('not-a-palette').colorSource).toBe('dark-terminal');
    expect(defaultSettings(null).colorSource).toBe('dark-terminal');
  });
});

describe('sanitize', () => {
  it('applies valid fields over the base', () => {
    const s = sanitize({ pattern: 'vortex', speed: 2, clock: 'minimal' }, D);
    expect(s.pattern).toBe('vortex');
    expect(s.speed).toBe(2);
    expect(s.clock).toBe('minimal');
    expect(s.cellSize).toBe(D.cellSize);
  });

  it('clamps numbers into range and rounds integer fields', () => {
    const s = sanitize(
      { speed: 99, cellSize: 3.7, brightness: -1, cycleMinutes: 0, colorAnimSeconds: 9999 },
      D,
    );
    expect(s.speed).toBe(3);
    expect(s.cellSize).toBe(8);
    expect(s.brightness).toBe(0.2);
    expect(s.cycleMinutes).toBe(1);
    expect(s.colorAnimSeconds).toBe(600);
    expect(sanitize({ cellSize: 12.6 }, D).cellSize).toBe(13);
  });

  it('drops unknown enum values and non-numeric numbers', () => {
    const s = sanitize({ pattern: 'starfield', clock: 'sundial', speed: 'fast', colorSource: 'neon' }, D);
    expect(s).toEqual(D);
  });

  it('accepts only #rrggbb colours, lowercased, per field', () => {
    const s = sanitize(
      { custom: { bg: '#ABCDEF', layers: ['#112233', 'red', '#12345'] } },
      D,
    );
    expect(s.custom.bg).toBe('#abcdef');
    expect(s.custom.layers).toEqual(['#112233', D.custom.layers[1], D.custom.layers[2]]);
  });

  it('accepts the custom colour source', () => {
    expect(sanitize({ colorSource: 'custom' }, D).colorSource).toBe('custom');
  });

  it('ignores non-object input entirely', () => {
    expect(sanitize(null, D)).toEqual(D);
    expect(sanitize('cycle', D)).toEqual(D);
    expect(sanitize([1, 2, 3], D)).toEqual(D);
    expect(sanitize({ custom: ['#ffffff'] }, D)).toEqual(D);
  });

  it('only accepts real booleans for clock24h', () => {
    expect(sanitize({ clock24h: true }, D).clock24h).toBe(true);
    expect(sanitize({ clock24h: 'yes' }, D).clock24h).toBe(false);
  });
});

describe('parseStored', () => {
  it('reads saved JSON', () => {
    expect(parseStored(JSON.stringify({ pattern: 'ripple' }), D).pattern).toBe('ripple');
  });

  it('survives missing, corrupt, or stale storage (Review Focus #1)', () => {
    expect(parseStored(null, D)).toEqual(D);
    expect(parseStored('{not json', D)).toEqual(D);
    expect(parseStored('"just a string"', D)).toEqual(D);
    expect(parseStored('[]', D)).toEqual(D);
    expect(parseStored(JSON.stringify({ pattern: 'old-pattern', speed: '2' }), D)).toEqual(D);
  });
});

describe('URL round-trip', () => {
  it('writes nothing for defaults', () => {
    expect(toSearchParams(D, D).toString()).toBe('');
  });

  it('writes only changed fields with short keys', () => {
    const s: ScreensaverSettings = { ...D, pattern: 'vortex', clock24h: true };
    expect(toSearchParams(s, D).toString()).toBe('p=vortex&h24=1');
  });

  it('round-trips every field losslessly', () => {
    const s: ScreensaverSettings = {
      pattern: 'interference',
      cycleMinutes: 12,
      speed: 1.75,
      cellSize: 16,
      brightness: 0.85,
      colorSource: 'custom',
      custom: { bg: '#000000', layers: ['#ff79c6', '#bd93f9', '#50fa7b'] },
      colorAnim: 'rainbow',
      colorAnimSeconds: 30,
      clock: 'minimal',
      clock24h: true,
      clockPos: 'bottom-right',
    };
    const params = toSearchParams(s, D);
    expect(parseSearchParams(new URLSearchParams(params.toString()), D)).toEqual(s);
  });

  it('ignores garbage params', () => {
    const p = new URLSearchParams('p=nope&s=abc&cs=&bg=%23xyz&h24=maybe&unknown=1');
    expect(parseSearchParams(p, D)).toEqual(D);
  });
});

describe('resolveSettings', () => {
  it('layers defaults < stored < URL', () => {
    const stored = JSON.stringify({ pattern: 'ripple', speed: 2 });
    const s = resolveSettings(D, stored, '?p=vortex');
    expect(s.pattern).toBe('vortex');
    expect(s.speed).toBe(2);
    expect(s.cellSize).toBe(11);
  });
});

describe('stepPattern', () => {
  it('walks the six patterns in order and wraps', () => {
    expect(stepPattern('drift', 1)).toBe('cascade');
    expect(stepPattern('interference', 1)).toBe('drift');
    expect(stepPattern('drift', -1)).toBe('interference');
    expect(PATTERN_NAMES).toHaveLength(6);
  });
});
