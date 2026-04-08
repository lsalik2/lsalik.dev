// ASCII Animated Background — flow-based particle simulation with colored layers

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface FieldStamp {
  radiusX: number;
  radiusY: number;
  sizeX: number;
  sizeY: number;
  values: Float32Array;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RAMP = ' -_:,;^+/|\\?0oOQ#%@';
const FLOW_VELOCITY_BASE = 0.5;
const FLOW_TURBULENCE = 1.8;
const FLOW_TIME_SCALE = 0.15;
const FIELD_DECAY = 0.96;
const FIELD_OVERSAMPLE = 2;

// ─── Pure / Exported Functions ────────────────────────────────────────────────

export function brightnessToChar(brightness: number): string {
  const idx = Math.min(
    RAMP.length - 1,
    Math.floor(brightness * RAMP.length),
  );
  return RAMP[idx];
}

export function createBrightnessField(cols: number, rows: number): Float32Array {
  return new Float32Array(cols * rows);
}

function spriteAlphaAt(normalizedDistance: number): number {
  if (normalizedDistance >= 1) return 0;
  if (normalizedDistance <= 0.35) return 0.45 + (0.15 - 0.45) * (normalizedDistance / 0.35);
  return 0.15 * (1 - (normalizedDistance - 0.35) / 0.65);
}

export function createFieldStamp(radiusPx: number, scaleX: number, scaleY: number): FieldStamp {
  const radiusX = Math.ceil(radiusPx / scaleX);
  const radiusY = Math.ceil(radiusPx / scaleY);
  const sizeX = radiusX * 2 + 1;
  const sizeY = radiusY * 2 + 1;
  const values = new Float32Array(sizeX * sizeY);

  for (let dy = -radiusY; dy <= radiusY; dy++) {
    for (let dx = -radiusX; dx <= radiusX; dx++) {
      const nx = dx / radiusX;
      const ny = dy / radiusY;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const alpha = spriteAlphaAt(dist);
      const idx = (dy + radiusY) * sizeX + (dx + radiusX);
      values[idx] = alpha;
    }
  }

  return { radiusX, radiusY, sizeX, sizeY, values };
}

export function splatStamp(
  field: Float32Array,
  fieldCols: number,
  fieldRows: number,
  centerX: number,
  centerY: number,
  stamp: FieldStamp,
): void {
  const startRow = Math.floor(centerY) - stamp.radiusY;
  const startCol = Math.floor(centerX) - stamp.radiusX;

  for (let sy = 0; sy < stamp.sizeY; sy++) {
    const row = startRow + sy;
    if (row < 0 || row >= fieldRows) continue;
    for (let sx = 0; sx < stamp.sizeX; sx++) {
      const col = startCol + sx;
      if (col < 0 || col >= fieldCols) continue;
      const fieldIdx = row * fieldCols + col;
      const stampVal = stamp.values[sy * stamp.sizeX + sx];
      field[fieldIdx] = Math.min(1, field[fieldIdx] + stampVal);
    }
  }
}

export function stepParticles(
  particles: Particle[],
  t: number,
  canvasW: number,
  canvasH: number,
): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    const baseVx = FLOW_VELOCITY_BASE;
    const baseVy = FLOW_VELOCITY_BASE * 0.2;

    const turbX = Math.sin(t * FLOW_TIME_SCALE * 0.9 + p.y * 0.05 + i * 0.001) * Math.cos(t * FLOW_TIME_SCALE * 0.7 - p.x * 0.01) * FLOW_TURBULENCE;
    const turbY = Math.cos(t * FLOW_TIME_SCALE * 1.1 - p.x * 0.03 - i * 0.002) * Math.sin(t * FLOW_TIME_SCALE * 0.8 + p.y * 0.005) * FLOW_TURBULENCE * 0.6;

    p.vx += (baseVx + turbX - p.vx) * 0.05;
    p.vy += (baseVy + turbY - p.vy) * 0.05;

    p.vx *= 0.99;
    p.vy *= 0.99;

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -10) p.x += canvasW + 20;
    if (p.x > canvasW + 10) p.x -= canvasW + 20;
    if (p.y < -10) p.y += canvasH + 20;
    if (p.y > canvasH + 10) p.y -= canvasH + 20;
  }
}

// ─── Layer Configuration ─────────────────────────────────────────────────────

interface LayerState {
  particles: Particle[];
  field: Float32Array;
  stamp: FieldStamp;
  timeOffset: number;
  // Pre-allocated row divs for this layer
  rowEls: HTMLDivElement[];
}

// ─── DOM / Animation Side ─────────────────────────────────────────────────────

function initBackground(): void {
  const container = document.getElementById('ascii-bg');
  if (!container) return;

  const FONT_SIZE = 14;
  const LINE_HEIGHT = 16;
  const PARTICLES_PER_LAYER = 150;
  const PARTICLE_STAMP_RADIUS = 12;

  const LAYER_CONFIGS = [
    { color: 'var(--fg-muted)', timeOffset: 0, velocityScale: 1.0 },
    { color: 'var(--accent)', timeOffset: 3.7, velocityScale: 0.7 },
    { color: 'var(--green)', timeOffset: 7.2, velocityScale: 1.3 },
  ];

  let cols = 0;
  let rows = 0;
  let fieldCols = 0;
  let fieldRows = 0;
  let layers: LayerState[] = [];
  // Pre-allocated char buffers per layer per row (reused every frame)
  // layerChars[layerIndex][rowIndex] is a char array of length cols
  let layerChars: string[][][] = [];

  function measure(): void {
    const charW = FONT_SIZE * 0.6;
    cols = Math.ceil(window.innerWidth / charW);
    rows = Math.ceil(window.innerHeight / LINE_HEIGHT);
    fieldCols = cols * FIELD_OVERSAMPLE;
    fieldRows = rows * FIELD_OVERSAMPLE;
  }

  function buildDOM(): void {
    container.textContent = '';
    const rowStyle = `white-space:pre;font-family:monospace;line-height:${LINE_HEIGHT}px;font-size:${FONT_SIZE}px;`;

    for (const layer of layers) {
      // Each layer is an absolutely-positioned div covering the full area
      const layerDiv = document.createElement('div');
      layerDiv.style.cssText = 'position:absolute;inset:0;';

      layer.rowEls = [];
      for (let r = 0; r < rows; r++) {
        const div = document.createElement('div');
        div.style.cssText = rowStyle + `color:${layer.rowEls.length};`;
        layerDiv.appendChild(div);
        layer.rowEls.push(div);
      }
      container.appendChild(layerDiv);
    }

    // Apply layer colors after creation
    for (let li = 0; li < layers.length; li++) {
      const color = LAYER_CONFIGS[li].color;
      const layerDiv = container.children[li] as HTMLDivElement;
      layerDiv.style.color = color;
      // Row divs inherit color from parent
      for (const rowEl of layers[li].rowEls) {
        rowEl.style.cssText = rowStyle;
      }
    }

    // Allocate char buffers
    layerChars = LAYER_CONFIGS.map(() =>
      Array.from({ length: rows }, () => new Array(cols).fill(' '))
    );
  }

  function init(): void {
    measure();

    const scaleX = fieldCols / cols;
    const scaleY = fieldRows / rows;
    const stamp = createFieldStamp(PARTICLE_STAMP_RADIUS, scaleX, scaleY);

    layers = LAYER_CONFIGS.map(cfg => ({
      particles: Array.from({ length: PARTICLES_PER_LAYER }, () => ({
        x: Math.random() * fieldCols,
        y: Math.random() * fieldRows,
        vx: (Math.random() - 0.5) * FLOW_VELOCITY_BASE * 2 * cfg.velocityScale,
        vy: (Math.random() - 0.5) * FLOW_VELOCITY_BASE * 2 * cfg.velocityScale,
      })),
      field: createBrightnessField(fieldCols, fieldRows),
      stamp,
      timeOffset: cfg.timeOffset,
      rowEls: [],
    }));

    buildDOM();
  }

  function frame(now: number): void {
    const t = now / 1000;
    const numLayers = layers.length;

    // Step and splat each layer
    for (const layer of layers) {
      stepParticles(layer.particles, t + layer.timeOffset, fieldCols, fieldRows);

      const f = layer.field;
      for (let i = 0; i < f.length; i++) {
        f[i] *= FIELD_DECAY;
      }

      for (const p of layer.particles) {
        splatStamp(f, fieldCols, fieldRows, p.x, p.y, layer.stamp);
      }
    }

    // Render: for each cell, find the brightest layer.
    // Fill pre-allocated char arrays, then join for textContent.
    for (let r = 0; r < rows; r++) {
      const fy = Math.floor(r * FIELD_OVERSAMPLE);
      const fyOffset = fy * fieldCols;

      for (let c = 0; c < cols; c++) {
        const fx = Math.floor(c * FIELD_OVERSAMPLE);
        const idx = fyOffset + fx;

        let maxB = 0;
        let maxL = 0;
        for (let li = 0; li < numLayers; li++) {
          const b = layers[li].field[idx];
          if (b > maxB) {
            maxB = b;
            maxL = li;
          }
        }

        const ch = brightnessToChar(maxB);

        for (let li = 0; li < numLayers; li++) {
          layerChars[li][r][c] = (li === maxL) ? ch : ' ';
        }
      }
    }

    // Apply to DOM — textContent only, zero DOM allocation
    for (let li = 0; li < numLayers; li++) {
      const els = layers[li].rowEls;
      for (let r = 0; r < rows; r++) {
        els[r].textContent = layerChars[li][r].join('');
      }
    }

    requestAnimationFrame(frame);
  }

  let rafId: number | null = null;

  function start(): void {
    init();
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => {
    measure();
    for (const layer of layers) {
      layer.field = createBrightnessField(fieldCols, fieldRows);
    }
    buildDOM();
  });

  start();
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initBackground);
}
