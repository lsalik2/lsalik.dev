// ASCII Animated Background — per-cell flow field (sums of sines).
// Three decorrelated layers; per cell, the brightest layer wins.

export const RAMP = ' -_:,;^+/|\\?0oOQ#%@';

const NOISE_X = 0.08;
const NOISE_Y = 0.11;
const NOISE_XY = 0.06;
const NOISE_XMY = 0.09;
const TIME_X = 0.6;
const TIME_Y = 0.4;
const TIME_XY = 0.5;
const TIME_XMY = 0.3;

const LAYER_PHASES: readonly number[] = [0, 3.7, 7.2];
const LAYER_COLORS: readonly string[] = [
  'var(--fg)',
  'var(--fg-muted)',
  'var(--accent)',
];

// ─── Pure / exported ─────────────────────────────────────────────────────────

export function sample(x: number, y: number, t: number, phase: number): number {
  const s1 = Math.sin(x * NOISE_X + t * TIME_X + phase);
  const s2 = Math.sin(y * NOISE_Y - t * TIME_Y + phase * 1.3);
  const s3 = Math.sin((x + y) * NOISE_XY + t * TIME_XY);
  const s4 = Math.sin((x - y) * NOISE_XMY - t * TIME_XMY + phase * 0.7);
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

  const FONT_SIZE = 14;
  const LINE_HEIGHT = 16;

  let cols = 0;
  let rows = 0;

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

  function measure(): void {
    const charW = FONT_SIZE * 0.6;
    cols = Math.max(1, Math.ceil(window.innerWidth / charW));
    rows = Math.max(1, Math.ceil(window.innerHeight / LINE_HEIGHT));
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
    requestAnimationFrame(frame);
  }

  function start(): void {
    measure();
    buildDOM();
    requestAnimationFrame(frame);
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
    started = true;
    initBackground();
  });
}
