// Time → colour maths for the screensaver's colour animations. Pure; the
// colour layer turns these numbers into CSS variables once per frame.

function phase(t: number, period: number): number {
  const p = period > 0 ? period : 1;
  const r = t % p;
  return (r < 0 ? r + p : r) / p; // [0, 1)
}

export function hueAngle(t: number, periodSeconds: number): number {
  return phase(t, periodSeconds) * 360;
}

export function gradientAngle(t: number, periodSeconds: number): number {
  return phase(t, periodSeconds * 4) * 360;
}

export function rainbowOffset(t: number, periodSeconds: number): number {
  return phase(t, periodSeconds) * 100;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(v: number): string {
  return Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
}

export function shiftHue(hex: string, degrees: number): string {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return '#' + [r, g, b].map(v => toHex(v * 255)).join('');

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (((h * 60 + degrees) % 360) + 360) % 360;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r1, g1, b1].map(v => toHex((v + m) * 255)).join('');
}
