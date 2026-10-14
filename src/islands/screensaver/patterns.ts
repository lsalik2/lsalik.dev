// Screensaver-only patterns: matrix rain and a warp starfield. Like the six
// site patterns they're pure fields of (x, y, t): per-column (rain) and
// per-ray (stars) parameters come from an integer hash, and positions follow
// from t, so the engine needs no per-cell state. The site background never
// sees these; it picks from PRESETS.
//
// Each pattern pairs a feature (the rain, the stars) with a texture of small
// glyphs on the muted layer, so no cell is ever left blank, like the other
// patterns. The rain also falls on the muted layer; the stars keep off it, so
// their streaks stand out against the dust.

import { PRESETS, CELL_ASPECT, LAYER_PHASES, type AnimationPreset, type Field } from '../ascii-bg';

const TAU = Math.PI * 2;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Deterministic hash of two integers to [0, 1).
export function hash01(a: number, b: number): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x9e3779b9, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// The three layers share a field and differ only by phase. A phase becomes a
// hash seed and a depth: 1 for the nearest layer, smaller (slower, dimmer)
// for farther ones.
const seedOf = (phase: number) => Math.round(phase * 10);
const depthOf = (phase: number) => 1 / (1 + Math.abs(phase) * 0.12);

// ─── Texture ─────────────────────────────────────────────────────────────────

// The layer drawn in the palette's muted colour (LAYER_COLORS[1]).
const MUTED_PHASE = LAYER_PHASES[1];

// The texture's brightness range: the smallest glyphs of the ramp (- _ : , ;).
export const AMBIENT_MIN = 0.06;
export const AMBIENT_MAX = 0.3;

// Squared, so the texture leans towards the smallest glyphs.
const ambient = (n: number) => AMBIENT_MIN + (AMBIENT_MAX - AMBIENT_MIN) * n * n;

function withTexture(feature: Field, texture: Field): Field {
  return (x, y, t, phase, ctx) => {
    const v = feature(x, y, t, phase, ctx);
    return phase === MUTED_PHASE ? Math.max(v, texture(x, y, t, phase, ctx)) : v;
  };
}

// ─── Matrix rain ─────────────────────────────────────────────────────────────

const RAIN_ACTIVE = 0.65; // share of columns with a stream, per layer

export const rain: Field = (x, y, t, phase, ctx) => {
  const c = Math.floor(x);
  const seed = seedOf(phase);
  if (hash01(c, seed) > RAIN_ACTIVE) return 0;
  const depth = depthOf(phase);
  const speed = (8 + hash01(c, seed + 1) * 12) * depth;     // rows per second
  const tail = 10 + Math.floor(hash01(c, seed + 2) * 20);   // rows
  const gap = ctx.rows * (0.3 + hash01(c, seed + 3) * 0.9); // rows of darkness between drops
  const period = ctx.rows + tail + gap;
  const head = (t * speed + hash01(c, seed + 4) * period) % period;
  const d = head - y;
  if (d < 0 || d >= tail) return 0;
  if (d < 1) return depth;
  // The tail fades away from the head, with a flicker so its glyphs change
  // as it falls.
  const flicker = hash01(c * 131 + Math.floor(y), Math.floor(t * 8) + seed) * 0.25;
  return clamp01(((1 - d / tail) * 0.8 + flicker - 0.1) * depth);
};

// Small glyphs drifting down each column at its own pace.
export const drizzle: Field = (x, y, t) => {
  const c = Math.floor(x);
  const n = 0.5 + 0.5 * Math.sin((y - t * (2 + hash01(c, 99) * 4)) * 0.45 + hash01(c, 98) * TAU);
  return ambient(n);
};

export const matrix = withTexture(rain, drizzle);

// ─── Warp starfield ──────────────────────────────────────────────────────────

const RAYS = 360;            // angular slots around the centre
const STAR_RAYS = 0.85;      // share of rays carrying stars, per layer
const STARS_PER_RAY = 2;     // evenly spaced in depth
const R0 = 2;                // radius (cells) where a star appears
const STREAK_SECONDS = 0.12; // streak length = radial speed × this
const GLOW_FLOOR = 0.3;      // so stars near the core show, not just near the edge
const GLOW_GAIN = 1.0;
const CONTINUOUS_FROM = 20;  // radius beyond which a cell also checks the neighbouring ray
const DUST_RAYS = 720;       // finer slots for the dust texture
const SLOT = TAU / RAYS;

// Each ray's centre-line direction, computed once rather than per cell.
const RAY_SIN = new Float64Array(RAYS);
const RAY_COS = new Float64Array(RAYS);
for (let i = 0; i < RAYS; i++) {
  const a = (i + 0.5) * SLOT - Math.PI;
  RAY_SIN[i] = Math.sin(a);
  RAY_COS[i] = Math.cos(a);
}

// Per-layer ray tables (by seed), so cells don't re-hash their ray's values:
// whether it carries stars, its base speed, its depth offset.
interface RayTable {
  active: Uint8Array;
  speed: Float64Array;
  offset: Float64Array;
}
const RAY_TABLES = new Map<number, RayTable>();

function rayTable(seed: number): RayTable {
  let table = RAY_TABLES.get(seed);
  if (!table) {
    table = { active: new Uint8Array(RAYS), speed: new Float64Array(RAYS), offset: new Float64Array(RAYS) };
    for (let i = 0; i < RAYS; i++) {
      table.active[i] = hash01(i, seed) <= STAR_RAYS ? 1 : 0;
      table.speed[i] = 0.12 + hash01(i, seed + 1) * 0.18; // depth cycles per second
      table.offset[i] = hash01(i, seed + 2);
    }
    RAY_TABLES.set(seed, table);
  }
  return table;
}

// Brightness at radius r along a ray whose stars move at `speed` depth cycles
// per second. Depth z runs from 1 to 0; perspective draws a star at R0 / z,
// so it accelerates outward, and its streak (a fading tail behind the head)
// grows with its radial speed.
export function starOnRay(r: number, t: number, speed: number, offset: number, depth: number): number {
  let best = 0;
  for (let k = 0; k < STARS_PER_RAY; k++) {
    const z = Math.max(1 - ((t * speed + offset + k / STARS_PER_RAY) % 1), 0.02);
    const behind = R0 / z - r;
    if (behind < -1) continue;
    const streak = ((R0 * speed) / (z * z)) * STREAK_SECONDS;
    if (behind > streak + 1) continue;
    const fade = 1 - Math.max(0, behind) / (streak + 2);
    const v = (GLOW_FLOOR + (1 - z) * GLOW_GAIN) * depth * fade;
    if (v > best) best = v;
  }
  return clamp01(best);
}

// The star on one ray as seen from a cell: only cells within half a cell of
// the ray's centre line, measured in cells on each axis (vertical doubled).
function starOnLine(ray: number, dx: number, dy: number, r: number, t: number, table: RayTable, depth: number): number {
  if (!table.active[ray]) return 0;
  const sin = RAY_SIN[ray];
  const cos = RAY_COS[ray];
  const s = dx * sin - dy * cos;
  if (Math.abs(s * sin) > 0.5 || Math.abs(s * cos) / CELL_ASPECT > 0.5) return 0;
  return starOnRay(r, t, table.speed[ray] * depth, table.offset[ray], depth);
}

// Given a cell's offset from the centre (vertical doubled), distance and angle.
function starAt(dx: number, dy: number, r: number, angle: number, t: number, phase: number): number {
  if (r < R0) return 0;
  const table = rayTable(seedOf(phase));
  const depth = depthOf(phase);
  const slot = ((angle + Math.PI) / TAU) * RAYS;
  if (r < CONTINUOUS_FROM) return starOnLine(Math.floor(slot) % RAYS, dx, dy, r, t, table, depth);
  // Farther out, slots are narrower than a cell, so a streak's cells can fall
  // in the neighbouring slot. Check both rays whose centre lines bracket the
  // cell, or the streak comes out dotted.
  let lo = Math.floor(slot - 0.5);
  let hi = lo + 1;
  if (lo < 0) lo += RAYS;
  if (hi >= RAYS) hi -= RAYS;
  return Math.max(starOnLine(lo, dx, dy, r, t, table, depth), starOnLine(hi, dx, dy, r, t, table, depth));
}

// Dust streaming outward along fine rays, like flying through it.
function dustAt(r: number, angle: number, t: number): number {
  const ray = Math.floor(((angle + Math.PI) / TAU) * DUST_RAYS);
  return ambient(hash01(ray, Math.floor(r * 0.6 - t * 3)));
}

export const stars: Field = (x, y, t, phase, ctx) => {
  const dx = x - ctx.cols / 2;
  const dy = (y - ctx.rows / 2) * CELL_ASPECT;
  return starAt(dx, dy, Math.sqrt(dx * dx + dy * dy), Math.atan2(dy, dx), t, phase);
};

export const dust: Field = (x, y, t, _phase, ctx) => {
  const dx = x - ctx.cols / 2;
  const dy = (y - ctx.rows / 2) * CELL_ASPECT;
  return dustAt(Math.sqrt(dx * dx + dy * dy), Math.atan2(dy, dx), t);
};

// The engine asks for each cell three times in a row (once per layer), so
// the cell's geometry is remembered between those calls. Same results; a
// third of the trigonometry.
let memoX = NaN;
let memoY = NaN;
let memoCols = -1;
let memoRows = -1;
let memoDx = 0;
let memoDy = 0;
let memoR = 0;
let memoAngle = 0;

// Stars on the bright layers, dust on the muted one, so streaks stand out
// against the texture.
export const starfield: Field = (x, y, t, phase, ctx) => {
  if (x !== memoX || y !== memoY || ctx.cols !== memoCols || ctx.rows !== memoRows) {
    memoX = x;
    memoY = y;
    memoCols = ctx.cols;
    memoRows = ctx.rows;
    memoDx = x - ctx.cols / 2;
    memoDy = (y - ctx.rows / 2) * CELL_ASPECT;
    memoR = Math.sqrt(memoDx * memoDx + memoDy * memoDy);
    memoAngle = Math.atan2(memoDy, memoDx);
  }
  return phase === MUTED_PHASE
    ? dustAt(memoR, memoAngle, t)
    : starAt(memoDx, memoDy, memoR, memoAngle, t, phase);
};

export const SCREENSAVER_PRESETS: readonly AnimationPreset[] = [
  ...PRESETS,
  { name: 'matrix', field: matrix },
  { name: 'starfield', field: starfield },
];
