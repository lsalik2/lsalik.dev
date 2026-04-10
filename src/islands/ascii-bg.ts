// ASCII Animated Background — per-cell flow field (sums of sines).
// Three decorrelated layers; per cell, the brightest layer wins.

export const RAMP = ' -_:,;^+/|\\?0oOQ#%@';

interface AnimationPreset {
  NOISE_X: number;
  NOISE_Y: number;
  NOISE_XY: number;
  NOISE_XMY: number;
  TIME_X: number;
  TIME_Y: number;
  TIME_XY: number;
  TIME_XMY: number;
}

const PRESETS: AnimationPreset[] = [
  // Original lsalik.dev
  {
    NOISE_X: 0.08, NOISE_Y: 0.11, NOISE_XY: 0.06, NOISE_XMY: 0.09,
    TIME_X: 0.6, TIME_Y: 0.4, TIME_XY: 0.5, TIME_XMY: 0.3,
  },
  // Ryan's variant
  {
    NOISE_X: 0.12, NOISE_Y: 0.092, NOISE_XY: 0.051, NOISE_XMY: 0.063,
    TIME_X: 0.42, TIME_Y: 0.61, TIME_XY: 0.35, TIME_XMY: 0.55,
  },
];

const ACTIVE_PRESET = PRESETS[Math.floor(Math.random() * PRESETS.length)];

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

// ─── Pure / exported ─────────────────────────────────────────────────────────

export function sample(x: number, y: number, t: number, phase: number): number {
  const p = ACTIVE_PRESET;
  const s1 = Math.sin(x * p.NOISE_X + t * p.TIME_X + phase);
  const s2 = Math.sin(y * p.NOISE_Y - t * p.TIME_Y + phase * 1.3);
  const s3 = Math.sin((x + y) * p.NOISE_XY + t * p.TIME_XY);
  const s4 = Math.sin((x - y) * p.NOISE_XMY - t * p.TIME_XMY + phase * 0.7);
  const raw = (s1 + s2 + s3 + s4) * 0.25 + 0.5;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}

export function charForBrightness(b: number): string {
  if (b <= 0) return RAMP[0];
  if (b >= 1) return RAMP[RAMP.length - 1];
  const idx = Math.min(RAMP.length - 1, Math.floor(b * RAMP.length));
  return RAMP[idx];
}

export interface RenderLayersResult {
  layers: string[]; // one string per phase; each is `rows` lines joined by '\n'
}

export function renderLayers(
  cols: number,
  rows: number,
  t: number,
  phases: readonly number[],
): RenderLayersResult {
  const layerCount = phases.length;

  const layerChars: string[][] = Array.from({ length: layerCount }, () =>
    new Array<string>(cols * rows).fill(' '),
  );

  // For each cell, compute every layer's brightness; the brightest wins that cell.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let maxB = 0;
      let maxL = 0;
      for (let li = 0; li < layerCount; li++) {
        const b = sample(c, r, t, phases[li]);
        if (b > maxB) {
          maxB = b;
          maxL = li;
        }
      }
      const ch = charForBrightness(maxB);
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

  const FONT_SIZE = 11;
  const LINE_HEIGHT = 13;

  let cols = 0;
  let rows = 0;
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
    const charW = measureCharWidth();
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
    const { layers } = renderLayers(cols, rows, t, LAYER_PHASES);
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
