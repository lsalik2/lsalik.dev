// ASCII Animated Background — particle simulation + DOM rendering

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

const RAMP = ' .`-_:,;^=+/|)\\!?0oOQ#%@';
const ATTRACTOR_FORCE_1 = 0.22;
const ATTRACTOR_FORCE_2 = 0.05;
const FIELD_DECAY = 0.82;
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
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  canvasW: number,
  canvasH: number,
): void {
  for (const p of particles) {
    const dx1 = a1.x - p.x;
    const dy1 = a1.y - p.y;
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) + 1;
    const dx2 = a2.x - p.x;
    const dy2 = a2.y - p.y;
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 1;

    p.vx += (dx1 / dist1) * ATTRACTOR_FORCE_1 + (dx2 / dist2) * ATTRACTOR_FORCE_2;
    p.vy += (dy1 / dist1) * ATTRACTOR_FORCE_1 + (dy2 / dist2) * ATTRACTOR_FORCE_2;

    // Dampen velocity
    p.vx *= 0.98;
    p.vy *= 0.98;

    p.x += p.vx;
    p.y += p.vy;

    // Wrap around
    if (p.x < -canvasW * 0.25) p.x += canvasW * 1.5;
    if (p.x > canvasW * 1.25) p.x -= canvasW * 1.5;
    if (p.y < -canvasH * 0.25) p.y += canvasH * 1.5;
    if (p.y > canvasH * 1.25) p.y -= canvasH * 1.5;
  }
}

// ─── DOM / Animation Side ─────────────────────────────────────────────────────

function initBackground(): void {
  const container = document.getElementById('ascii-bg');
  if (!container) return;

  const FONT_SIZE = 14;
  const LINE_HEIGHT = 16;
  const PARTICLE_COUNT = 120;
  const PARTICLE_STAMP_RADIUS = 14;
  const ATTRACTOR_LARGE_RADIUS = 30;
  const ATTRACTOR_SMALL_RADIUS = 12;

  let cols = 0;
  let rows = 0;
  let fieldCols = 0;
  let fieldRows = 0;
  let field: Float32Array = new Float32Array(0);
  let rowEls: HTMLDivElement[] = [];
  let particles: Particle[] = [];
  let particleStamp: FieldStamp;
  let largeAttractorStamp: FieldStamp;
  let smallAttractorStamp: FieldStamp;

  function measure(): void {
    const charW = FONT_SIZE * 0.6;
    cols = Math.ceil(window.innerWidth / charW);
    rows = Math.ceil(window.innerHeight / LINE_HEIGHT);
    fieldCols = cols * FIELD_OVERSAMPLE;
    fieldRows = rows * FIELD_OVERSAMPLE;
  }

  function buildRows(): void {
    container.textContent = '';
    rowEls = [];
    for (let r = 0; r < rows; r++) {
      const div = document.createElement('div');
      div.style.whiteSpace = 'pre';
      div.style.fontFamily = 'monospace';
      div.style.color = 'var(--fg-muted)';
      div.style.lineHeight = LINE_HEIGHT + 'px';
      div.style.fontSize = FONT_SIZE + 'px';
      container.appendChild(div);
      rowEls.push(div);
    }
  }

  function init(): void {
    measure();
    field = createBrightnessField(fieldCols, fieldRows);

    const scaleX = fieldCols / cols;
    const scaleY = fieldRows / rows;
    particleStamp = createFieldStamp(PARTICLE_STAMP_RADIUS, scaleX, scaleY);
    largeAttractorStamp = createFieldStamp(ATTRACTOR_LARGE_RADIUS, scaleX, scaleY);
    smallAttractorStamp = createFieldStamp(ATTRACTOR_SMALL_RADIUS, scaleX, scaleY);

    // Scatter particles around center
    const cx = fieldCols / 2;
    const cy = fieldRows / 2;
    particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: cx + (Math.random() - 0.5) * fieldCols * 0.8,
      y: cy + (Math.random() - 0.5) * fieldRows * 0.8,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    }));

    buildRows();
  }

  function frame(now: number): void {
    const t = now / 1000;

    // Sinusoidal attractor orbits in field-space
    const a1 = {
      x: fieldCols * (0.5 + 0.3 * Math.cos(t * 0.31)),
      y: fieldRows * (0.5 + 0.3 * Math.sin(t * 0.23)),
    };
    const a2 = {
      x: fieldCols * (0.5 + 0.25 * Math.cos(t * 0.17 + 1.2)),
      y: fieldRows * (0.5 + 0.25 * Math.sin(t * 0.13 + 2.4)),
    };

    stepParticles(particles, a1, a2, fieldCols, fieldRows);

    // Decay field
    for (let i = 0; i < field.length; i++) {
      field[i] *= FIELD_DECAY;
    }

    // Splat particles
    for (const p of particles) {
      splatStamp(field, fieldCols, fieldRows, p.x, p.y, particleStamp);
    }

    // Splat attractors
    splatStamp(field, fieldCols, fieldRows, a1.x, a1.y, largeAttractorStamp);
    splatStamp(field, fieldCols, fieldRows, a2.x, a2.y, smallAttractorStamp);

    // Render rows — downsample field to col x row
    for (let r = 0; r < rows; r++) {
      let line = '';
      for (let c = 0; c < cols; c++) {
        // Sample from oversampled field
        const fx = Math.floor(c * FIELD_OVERSAMPLE);
        const fy = Math.floor(r * FIELD_OVERSAMPLE);
        const brightness = field[fy * fieldCols + fx];
        line += brightnessToChar(brightness);
      }
      rowEls[r].textContent = line;
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
    field = createBrightnessField(fieldCols, fieldRows);
    buildRows();
  });

  start();
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initBackground);
}
