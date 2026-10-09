// Screensaver settings: defaults, validation, and the localStorage / URL
// encodings. Pure and DOM-free; the screensaver island owns the side effects.
// Every reader goes through sanitize(), so bad input from storage or a
// hand-edited URL falls back field-by-field instead of throwing.

import { PALETTES, type PaletteName } from './palettes';

export const PATTERN_NAMES = ['drift', 'cascade', 'pulse', 'ripple', 'vortex', 'interference'] as const;
export const PATTERN_CHOICES = [...PATTERN_NAMES, 'cycle'] as const;
export const COLOR_ANIMS = ['none', 'hue', 'gradient', 'rainbow'] as const;
export const CLOCK_STYLES = ['off', 'digital', 'minimal', 'date'] as const;
export const CLOCK_POSITIONS = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

export type PatternName = (typeof PATTERN_NAMES)[number];
export type PatternChoice = (typeof PATTERN_CHOICES)[number];
export type ColorSource = PaletteName | 'custom';
export type ColorAnim = (typeof COLOR_ANIMS)[number];
export type ClockStyle = (typeof CLOCK_STYLES)[number];
export type ClockPos = (typeof CLOCK_POSITIONS)[number];

export interface ScreensaverSettings {
  pattern: PatternChoice;
  cycleMinutes: number;
  speed: number;
  cellSize: number;
  brightness: number;
  colorSource: ColorSource;
  custom: { bg: string; layers: [string, string, string] };
  colorAnim: ColorAnim;
  colorAnimSeconds: number;
  clock: ClockStyle;
  clock24h: boolean;
  clockPos: ClockPos;
}

type NumericKey = 'cycleMinutes' | 'speed' | 'cellSize' | 'brightness' | 'colorAnimSeconds';

export const RANGES: Readonly<Record<NumericKey, { min: number; max: number; integer: boolean }>> = {
  cycleMinutes: { min: 1, max: 60, integer: true },
  speed: { min: 0.25, max: 3, integer: false },
  cellSize: { min: 8, max: 24, integer: true },
  brightness: { min: 0.2, max: 1, integer: false },
  colorAnimSeconds: { min: 5, max: 600, integer: true },
};

export const STORAGE_KEY = 'screensaver-settings';

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function defaultSettings(palette?: string | null): ScreensaverSettings {
  const source = (PALETTES as readonly string[]).includes(palette ?? '')
    ? (palette as PaletteName)
    : 'dark-terminal';
  return {
    pattern: 'cycle',
    cycleMinutes: 5,
    speed: 1,
    cellSize: 11,
    brightness: 0.6,
    colorSource: source,
    custom: { bg: '#0d1117', layers: ['#c9d1d9', '#8b949e', '#58a6ff'] },
    colorAnim: 'none',
    colorAnimSeconds: 60,
    clock: 'digital',
    clock24h: false,
    clockPos: 'center',
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function pickNumber(value: unknown, key: NumericKey, fallback: number): number {
  const n = typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return fallback;
  const { min, max, integer } = RANGES[key];
  const v = integer ? Math.round(n) : n;
  return Math.min(max, Math.max(min, v));
}

function pickHex(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_RE.test(value) ? value.toLowerCase() : fallback;
}

export function sanitize(input: unknown, base: ScreensaverSettings): ScreensaverSettings {
  if (!isRecord(input)) return base;
  const custom = isRecord(input.custom) ? input.custom : {};
  const layers = Array.isArray(custom.layers) ? custom.layers : [];
  return {
    pattern: pickEnum(input.pattern, PATTERN_CHOICES, base.pattern),
    cycleMinutes: pickNumber(input.cycleMinutes, 'cycleMinutes', base.cycleMinutes),
    speed: pickNumber(input.speed, 'speed', base.speed),
    cellSize: pickNumber(input.cellSize, 'cellSize', base.cellSize),
    brightness: pickNumber(input.brightness, 'brightness', base.brightness),
    colorSource: pickEnum<ColorSource>(input.colorSource, [...PALETTES, 'custom'], base.colorSource),
    custom: {
      bg: pickHex(custom.bg, base.custom.bg),
      layers: [
        pickHex(layers[0], base.custom.layers[0]),
        pickHex(layers[1], base.custom.layers[1]),
        pickHex(layers[2], base.custom.layers[2]),
      ],
    },
    colorAnim: pickEnum(input.colorAnim, COLOR_ANIMS, base.colorAnim),
    colorAnimSeconds: pickNumber(input.colorAnimSeconds, 'colorAnimSeconds', base.colorAnimSeconds),
    clock: pickEnum(input.clock, CLOCK_STYLES, base.clock),
    clock24h: typeof input.clock24h === 'boolean' ? input.clock24h : base.clock24h,
    clockPos: pickEnum(input.clockPos, CLOCK_POSITIONS, base.clockPos),
  };
}

export function parseStored(raw: string | null, base: ScreensaverSettings): ScreensaverSettings {
  if (raw === null) return base;
  try {
    return sanitize(JSON.parse(raw), base);
  } catch {
    return base;
  }
}

// URL params are strings; convert to the shapes sanitize() expects, leaving
// unparseable values as-is so sanitize() rejects them.
function num(v: string | null): unknown {
  if (v === null || v.trim() === '') return undefined;
  return Number(v);
}

export function parseSearchParams(params: URLSearchParams, base: ScreensaverSettings): ScreensaverSettings {
  const get = (k: string) => params.get(k);
  const h24 = get('h24');
  return sanitize(
    {
      pattern: get('p') ?? undefined,
      cycleMinutes: num(get('cm')),
      speed: num(get('s')),
      cellSize: num(get('cs')),
      brightness: num(get('b')),
      colorSource: get('c') ?? undefined,
      custom: {
        bg: get('bg') ?? undefined,
        layers: [get('l1') ?? undefined, get('l2') ?? undefined, get('l3') ?? undefined],
      },
      colorAnim: get('ca') ?? undefined,
      colorAnimSeconds: num(get('cas')),
      clock: get('ck') ?? undefined,
      clock24h: h24 === '1' ? true : h24 === '0' ? false : undefined,
      clockPos: get('cp') ?? undefined,
    },
    base,
  );
}

export function toSearchParams(s: ScreensaverSettings, d: ScreensaverSettings): URLSearchParams {
  const out = new URLSearchParams();
  const put = (key: string, value: string | number, def: string | number) => {
    if (value !== def) out.set(key, String(value));
  };
  put('p', s.pattern, d.pattern);
  put('cm', s.cycleMinutes, d.cycleMinutes);
  put('s', s.speed, d.speed);
  put('cs', s.cellSize, d.cellSize);
  put('b', s.brightness, d.brightness);
  put('c', s.colorSource, d.colorSource);
  put('bg', s.custom.bg, d.custom.bg);
  put('l1', s.custom.layers[0], d.custom.layers[0]);
  put('l2', s.custom.layers[1], d.custom.layers[1]);
  put('l3', s.custom.layers[2], d.custom.layers[2]);
  put('ca', s.colorAnim, d.colorAnim);
  put('cas', s.colorAnimSeconds, d.colorAnimSeconds);
  put('ck', s.clock, d.clock);
  if (s.clock24h !== d.clock24h) out.set('h24', s.clock24h ? '1' : '0');
  put('cp', s.clockPos, d.clockPos);
  return out;
}

export function resolveSettings(
  defaults: ScreensaverSettings,
  storedRaw: string | null,
  search: string,
): ScreensaverSettings {
  const stored = parseStored(storedRaw, defaults);
  return parseSearchParams(new URLSearchParams(search), stored);
}

export function stepPattern(current: PatternName, dir: 1 | -1): PatternName {
  const i = PATTERN_NAMES.indexOf(current);
  const n = PATTERN_NAMES.length;
  return PATTERN_NAMES[(((i + dir) % n) + n) % n];
}
