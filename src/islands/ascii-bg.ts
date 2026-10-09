// ASCII Animated Background — per-cell flow field (sums of sines).
// Three decorrelated layers; per cell, the brightest layer wins.

export const RAMP = ' -_:,;^+/|\\?0oOQ#%@';

// Grid size, for fields that place features relative to the screen (ripple
// centers, vortex hub, interference sources).
export interface FieldContext {
  cols: number;
  rows: number;
}

// Brightness in [0, 1] for cell (x, y) at time t. `phase` decorrelates the
// three layers that share one field.
export type Field = (x: number, y: number, t: number, phase: number, ctx: FieldContext) => number;

export interface AnimationPreset {
  name: string;
  field: Field;
}

// Characters are roughly twice as tall as they are wide, so vertical cell
// distances count double — otherwise rings render as wide ovals.
const CELL_ASPECT = 2;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// The original sum of four planar sine waves. Each tuning is one preset.
function waves(
  NOISE_X: number, NOISE_Y: number, NOISE_XY: number, NOISE_XMY: number,
  TIME_X: number, TIME_Y: number, TIME_XY: number, TIME_XMY: number,
): Field {
  return (x, y, t, phase) => {
    const s1 = Math.sin(x * NOISE_X + t * TIME_X + phase);
    const s2 = Math.sin(y * NOISE_Y - t * TIME_Y + phase * 1.3);
    const s3 = Math.sin((x + y) * NOISE_XY + t * TIME_XY);
    const s4 = Math.sin((x - y) * NOISE_XMY - t * TIME_XMY + phase * 0.7);
    return clamp01((s1 + s2 + s3 + s4) * 0.25 + 0.5);
  };
}

// Contrast for the radial fields: their weighted sums are scaled so the
// brightness spread matches the original wave presets (sd ≈ 0.3) rather than
// sitting in a washed-out middle band. Peaks clip to 0/1, which is fine.
const RADIAL_GAIN = 0.17;

// Aspect-corrected distance from (x, y) to (cx, cy), in cell widths.
function dist(x: number, y: number, cx: number, cy: number): number {
  const dx = x - cx;
  const dy = (y - cy) * CELL_ASPECT;
  return Math.sqrt(dx * dx + dy * dy);
}

// Geometry (centers, sources) is shared by all layers on purpose: `phase`
// only shifts wave timing, so the three layers' rings line up instead of
// blurring into each other.

// Ripple — rings spreading from a center that wanders slowly around the screen.
const ripple: Field = (x, y, t, phase, { cols, rows }) => {
  const cx = cols * (0.5 + 0.2 * Math.sin(t * 0.07));
  const cy = rows * (0.5 + 0.2 * Math.cos(t * 0.05));
  const d = dist(x, y, cx, cy);
  const s1 = Math.sin(d * 0.3 - t * 1.1 + phase);
  const s2 = Math.sin(d * 0.11 - t * 0.35 + phase * 1.7);
  const s3 = Math.sin(x * 0.05 + y * 0.09 + t * 0.2 + phase * 0.6);
  return clamp01((s1 * 2 + s2 + s3) * RADIAL_GAIN + 0.5);
};

// Vortex — three spiral arms turning around the screen center.
const vortex: Field = (x, y, t, phase, { cols, rows }) => {
  const cx = cols * 0.5;
  const cy = rows * 0.5;
  const a = Math.atan2((y - cy) * CELL_ASPECT, x - cx);
  const d = dist(x, y, cx, cy);
  const s1 = Math.sin(a * 3 + d * 0.12 - t * 0.5 + phase);
  const s2 = Math.sin(a * 2 - d * 0.07 + t * 0.3 + phase * 1.3);
  const s3 = Math.sin(d * 0.2 - t * 0.8 + phase * 0.7);
  return clamp01((s1 * 2 + s2 + s3) * RADIAL_GAIN + 0.5);
};

// Interference — two sources orbiting the center; their waves cross into
// shifting moiré bands.
const interference: Field = (x, y, t, phase, { cols, rows }) => {
  const cx = cols * 0.5;
  const cy = rows * 0.5;
  const r = Math.min(cols, rows * CELL_ASPECT) * 0.25;
  const a = t * 0.12;
  const ox = Math.cos(a) * r;
  const oy = (Math.sin(a) * r) / CELL_ASPECT;
  const d1 = dist(x, y, cx + ox, cy + oy);
  const d2 = dist(x, y, cx - ox, cy - oy);
  const s1 = Math.sin(d1 * 0.18 - t * 0.9 + phase);
  const s2 = Math.sin(d2 * 0.18 - t * 0.9 + phase * 1.3);
  const s3 = Math.sin((x - y) * 0.04 + t * 0.15);
  return clamp01((s1 * 1.5 + s2 * 1.5 + s3) * RADIAL_GAIN + 0.5);
};

export const PRESETS: readonly AnimationPreset[] = [
  // Drift — slow, wide waves with smooth organic motion
  { name: 'drift', field: waves(0.08, 0.11, 0.06, 0.09, 0.6, 0.4, 0.5, 0.3) },
  // Cascade — fast diagonal rain-like streaks
  { name: 'cascade', field: waves(0.04, 0.22, 0.18, 0.03, 1.4, 0.15, 1.1, 0.1) },
  // Pulse — low-frequency throb with slow breathing motion
  { name: 'pulse', field: waves(0.03, 0.04, 0.025, 0.035, 0.25, 0.3, 0.2, 0.15) },
  { name: 'ripple', field: ripple },
  { name: 'vortex', field: vortex },
  { name: 'interference', field: interference },
];

// Pick a different preset than last time so the background visibly changes.
function pickPreset(): AnimationPreset {
  let lastIndex = -1;
  try { lastIndex = parseInt(localStorage.getItem('ascii-bg-preset') ?? '-1', 10); } catch (_) {}
  let index: number;
  do { index = Math.floor(Math.random() * PRESETS.length); } while (index === lastIndex && PRESETS.length > 1);
  try { localStorage.setItem('ascii-bg-preset', index.toString()); } catch (_) {}
  return PRESETS[index];
}

let ACTIVE_PRESET = PRESETS[0];

export const LAYER_PHASES: readonly number[] = [0, 3.7, 7.2];
export const LAYER_COLORS: readonly string[] = [
  'var(--fg)',
  'var(--fg-muted)',
  'var(--accent)',
];

if (LAYER_PHASES.length !== LAYER_COLORS.length) {
  throw new Error(
    `ascii-bg: LAYER_PHASES (${LAYER_PHASES.length}) and LAYER_COLORS (${LAYER_COLORS.length}) must have the same length`,
  );
}

// Interaction tuning (cursor spotlight + parallax). All in cell units unless noted.
const SPOTLIGHT_RADIUS = 16;     // cells
const SPOTLIGHT_STRENGTH = 0.3;  // max brightness boost at center
const SPOTLIGHT_EASE = 0.08;     // per-frame lerp of spotlight toward pointer
const SCROLL_PARALLAX = 0.02;    // cells of vertical drift per scrolled pixel
const CURSOR_PARALLAX_X = 1.5;   // max cells of horizontal drift at screen edges

// ─── Pure / exported ─────────────────────────────────────────────────────────

const DEFAULT_CTX: FieldContext = { cols: 80, rows: 40 };

export function sample(
  x: number,
  y: number,
  t: number,
  phase: number,
  ctx: FieldContext = DEFAULT_CTX,
): number {
  return ACTIVE_PRESET.field(x, y, t, phase, ctx);
}

export function charForBrightness(b: number): string {
  if (b <= 0) return RAMP[0];
  if (b >= 1) return RAMP[RAMP.length - 1];
  const idx = Math.min(RAMP.length - 1, Math.floor(b * RAMP.length));
  return RAMP[idx];
}

// Smooth radial falloff in [0, 1]: 1 at the spotlight center, 0 at/beyond
// `radius`. Uses smoothstep so the edge is soft rather than a hard ring.
export function spotlight(
  c: number,
  r: number,
  sx: number,
  sy: number,
  radius: number,
): number {
  if (radius <= 0) return 0;
  const dx = c - sx;
  const dy = r - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= radius) return 0;
  const t = 1 - dist / radius; // 1 at center → 0 at edge
  return t * t * (3 - 2 * t); // smoothstep
}

// base brightness + (boost * strength), clamped to [0, 1]. Boost is in [0, 1]
// and strength is non-negative, so this can only brighten a cell.
export function applySpotlight(
  base: number,
  boost: number,
  strength: number,
): number {
  const v = base + boost * strength;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export interface RenderLayersResult {
  layers: string[]; // one string per phase; each is `rows` lines joined by '\n'
}

export interface RenderOptions {
  spotlightX?: number;       // spotlight center, in cell coordinates
  spotlightY?: number;
  spotlightRadius?: number;  // 0 disables the spotlight
  spotlightStrength?: number;
  parallaxX?: number;        // cells to offset the sampled field
  parallaxY?: number;
}

export function renderLayers(
  cols: number,
  rows: number,
  t: number,
  phases: readonly number[],
  opts: RenderOptions = {},
): RenderLayersResult {
  const {
    spotlightX = 0,
    spotlightY = 0,
    spotlightRadius = 0,
    spotlightStrength = 0,
    parallaxX = 0,
    parallaxY = 0,
  } = opts;

  const layerCount = phases.length;
  const ctx: FieldContext = { cols, rows };

  const layerChars: string[][] = Array.from({ length: layerCount }, () =>
    new Array<string>(cols * rows).fill(' '),
  );

  // For each cell, compute every layer's brightness; the brightest wins that
  // cell. Parallax shifts the sampled coordinates; the spotlight brightens the
  // winning brightness before glyph selection.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let maxB = 0;
      let maxL = 0;
      for (let li = 0; li < layerCount; li++) {
        const b = sample(c + parallaxX, r + parallaxY, t, phases[li], ctx);
        if (b > maxB) {
          maxB = b;
          maxL = li;
        }
      }
      const boost = spotlight(c, r, spotlightX, spotlightY, spotlightRadius);
      const finalB = applySpotlight(maxB, boost, spotlightStrength);
      const ch = charForBrightness(finalB);
      for (let li = 0; li < layerCount; li++) {
        layerChars[li][r * cols + c] = li === maxL ? ch : ' ';
      }
    }
  }

  // Join into layer strings with newline separators.
  const layers: string[] = new Array(layerCount);
  for (let li = 0; li < layerCount; li++) {
    const rowStrings: string[] = new Array(rows);
    for (let r = 0; r < rows; r++) {
      let line = '';
      for (let c = 0; c < cols; c++) {
        line += layerChars[li][r * cols + c];
      }
      rowStrings[r] = line;
    }
    layers[li] = rowStrings.join('\n');
  }

  return { layers };
}

// ─── DOM / animation wiring ─────────────────────────────────────────────────

let started = false;

function initBackground(): void {
  const container = document.getElementById('ascii-bg');
  if (!container) return;

  ACTIVE_PRESET = pickPreset();
  container.dataset.preset = ACTIVE_PRESET.name;

  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FONT_SIZE = 11;
  const LINE_HEIGHT = 13;

  let cols = 0;
  let rows = 0;
  let charW = FONT_SIZE * 0.6; // updated by measure()
  let rafHandle: number | null = null;

  // Pre-build one <pre> per layer; reuse across frames.
  const layerPres: HTMLPreElement[] = LAYER_COLORS.map((color) => {
    const pre = document.createElement('pre');
    pre.style.cssText = [
      'position:absolute',
      'inset:0',
      'margin:0',
      'white-space:pre',
      'font-family:monospace',
      `font-size:${FONT_SIZE}px`,
      `line-height:${LINE_HEIGHT}px`,
      `color:${color}`,
      'pointer-events:none',
    ].join(';');
    return pre;
  });

  // Pointer spotlight + scroll parallax state (px until converted per frame).
  let pointerActive = false;
  let targetX = 0;
  let targetY = 0;
  let easedX = 0;
  let easedY = 0;
  let scrollPx = 0;

  function onPointerMove(e: PointerEvent): void {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!pointerActive) {
      // Snap on first move so the spotlight doesn't streak in from (0,0).
      easedX = targetX;
      easedY = targetY;
      pointerActive = true;
    }
  }

  function onScroll(): void {
    scrollPx = window.scrollY;
  }

  if (!reduceMotion) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function measureCharWidth(): number {
    // Measure the real rendered width of a monospace glyph rather than
    // guessing FONT_SIZE * 0.6. Under-guessing leaves a right-edge gap.
    const probe = document.createElement('span');
    probe.textContent = 'M'.repeat(80);
    probe.style.cssText = [
      'position:absolute',
      'visibility:hidden',
      'white-space:pre',
      'font-family:monospace',
      `font-size:${FONT_SIZE}px`,
      `line-height:${LINE_HEIGHT}px`,
    ].join(';');
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width / 80;
    probe.remove();
    return w > 0 ? w : FONT_SIZE * 0.6;
  }

  function measure(): void {
    charW = measureCharWidth();
    // +1 cell overscan to absorb subpixel rounding at the right edge.
    cols = Math.max(1, Math.ceil(window.innerWidth / charW) + 1);
    rows = Math.max(1, Math.ceil(window.innerHeight / LINE_HEIGHT) + 1);
  }

  function buildDOM(): void {
    container.textContent = '';
    for (const pre of layerPres) {
      container.appendChild(pre);
    }
  }

  function frame(now: number): void {
    const t = now / 1000;

    let opts: RenderOptions = {};
    if (!reduceMotion) {
      if (pointerActive) {
        easedX += (targetX - easedX) * SPOTLIGHT_EASE;
        easedY += (targetY - easedY) * SPOTLIGHT_EASE;
      }
      const parallaxX = pointerActive
        ? (targetX / window.innerWidth - 0.5) * CURSOR_PARALLAX_X * 2
        : 0;
      opts = {
        spotlightX: easedX / charW,
        spotlightY: easedY / LINE_HEIGHT,
        spotlightRadius: pointerActive ? SPOTLIGHT_RADIUS : 0,
        spotlightStrength: SPOTLIGHT_STRENGTH,
        parallaxX,
        parallaxY: scrollPx * SCROLL_PARALLAX,
      };
    }

    const { layers } = renderLayers(cols, rows, t, LAYER_PHASES, opts);
    for (let li = 0; li < layerPres.length; li++) {
      layerPres[li].textContent = layers[li];
    }
    rafHandle = requestAnimationFrame(frame);
  }

  function start(): void {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    measure();
    buildDOM();
    rafHandle = requestAnimationFrame(frame);
  }

  function handleResize(): void {
    measure();
  }

  window.addEventListener('resize', handleResize);
  start();
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', () => {
    if (started) return;
    // Don't mark as started until we've confirmed the container exists on
    // this page. Otherwise a visitor landing on a future layout without
    // `#ascii-bg` would permanently block init on subsequent navigations.
    if (!document.getElementById('ascii-bg')) return;
    started = true;
    initBackground();
  });
}
