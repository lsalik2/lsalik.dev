// Screensaver-only patterns: matrix rain and a warp starfield. Like the six
// site patterns they're pure fields of (x, y, t): per-column (rain) and
// per-ray (stars) parameters come from an integer hash, and positions follow
// from t, so the engine needs no per-cell state. The site background never
// sees these; it picks from PRESETS.

import { PRESETS, CELL_ASPECT, type AnimationPreset, type Field } from '../ascii-bg';

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

// ─── Matrix rain ─────────────────────────────────────────────────────────────

const RAIN_ACTIVE = 0.4; // share of columns with a stream, per layer

export const matrix: Field = (x, y, t, phase, ctx) => {
  const c = Math.floor(x);
  const seed = seedOf(phase);
  if (hash01(c, seed) > RAIN_ACTIVE) return 0;
  const depth = depthOf(phase);
  const speed = (8 + hash01(c, seed + 1) * 12) * depth;     // rows per second
  const tail = 8 + Math.floor(hash01(c, seed + 2) * 17);    // rows
  const gap = ctx.rows * (0.5 + hash01(c, seed + 3) * 1.5); // rows of darkness between drops
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

// ─── Warp starfield ──────────────────────────────────────────────────────────

const RAYS = 360;            // angular slots around the centre
const STAR_RAYS = 0.6;       // share of rays carrying a star, per layer
const R0 = 3;                // radius (cells) where a star appears
const STREAK_SECONDS = 0.04; // streak length = radial speed × this

// Each ray's centre-line direction, computed once rather than per cell.
const RAY_SIN = new Float64Array(RAYS);
const RAY_COS = new Float64Array(RAYS);
for (let i = 0; i < RAYS; i++) {
  const a = ((i + 0.5) / RAYS) * 2 * Math.PI - Math.PI;
  RAY_SIN[i] = Math.sin(a);
  RAY_COS[i] = Math.cos(a);
}

export const starfield: Field = (x, y, t, phase, ctx) => {
  const dx = x - ctx.cols / 2;
  const dy = (y - ctx.rows / 2) * CELL_ASPECT;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < R0) return 0;
  const seed = seedOf(phase);
  const ray = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * RAYS) % RAYS;
  if (hash01(ray, seed) > STAR_RAYS) return 0;
  // Only cells within half a cell of the ray's centre line, measured in
  // cells on each axis (vertical distances were doubled above).
  const sin = RAY_SIN[ray];
  const cos = RAY_COS[ray];
  const s = dx * sin - dy * cos;
  if (Math.abs(s * sin) > 0.5 || Math.abs(s * cos) / CELL_ASPECT > 0.5) return 0;
  // Depth z runs from 1 to 0; perspective draws the star at R0 / z, so it
  // accelerates outward and streaks once it's fast.
  const depth = depthOf(phase);
  const speed = (0.12 + hash01(ray, seed + 1) * 0.18) * depth; // depth cycles per second
  const z = Math.max(1 - ((t * speed + hash01(ray, seed + 2)) % 1), 0.02);
  const rStar = R0 / z;
  const streak = ((R0 * speed) / (z * z)) * STREAK_SECONDS;
  const behind = rStar - r;
  if (behind < -1 || behind > streak + 1) return 0;
  const glow = clamp01((1 - z) * 1.3);
  return clamp01(glow * depth * (1 - Math.max(0, behind) / (streak + 2)));
};

export const SCREENSAVER_PRESETS: readonly AnimationPreset[] = [
  ...PRESETS,
  { name: 'matrix', field: matrix },
  { name: 'starfield', field: starfield },
];
