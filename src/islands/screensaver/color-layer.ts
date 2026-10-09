// Applies the screensaver's colour source and runs its colour animation.
// Concrete colours are written as CSS variables on <html>:
//   --ss-bg, --ss-l1..3 (layer colours), --ss-l1b..3b (hue-shifted partners
//   used by the gradient mode). Animation writes one variable per frame.

import type { ScreensaverSettings } from '../../lib/screensaver-settings';
import { hueAngle, shiftHue, gradientAngle, rainbowOffset } from '../../lib/color-anim';

export interface ColorController {
  apply(s: ScreensaverSettings): void;
  destroy(): void;
}

function readPalette(root: HTMLElement): { bg: string; layers: [string, string, string] } {
  const cs = getComputedStyle(root);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return { bg: v('--bg'), layers: [v('--fg'), v('--fg-muted'), v('--accent')] };
}

export function createColorController(
  root: HTMLElement,
  wrapper: HTMLElement,
  reduceMotion: boolean,
): ColorController {
  let raf: number | null = null;
  let settings: ScreensaverSettings | null = null;
  const start = performance.now();

  function stop(): void {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
  }

  function tick(now: number): void {
    if (!settings) return;
    const t = reduceMotion ? 0 : (now - start) / 1000;
    const period = settings.colorAnimSeconds;
    if (settings.colorAnim === 'hue') {
      wrapper.style.setProperty('--ss-hue', `${hueAngle(t, period)}deg`);
    } else if (settings.colorAnim === 'gradient') {
      wrapper.style.setProperty('--ss-angle', `${gradientAngle(t, period)}deg`);
    } else if (settings.colorAnim === 'rainbow') {
      wrapper.style.setProperty('--ss-rainbow', `${rainbowOffset(t, period)}%`);
    }
    if (!reduceMotion) raf = requestAnimationFrame(tick);
  }

  return {
    apply(s) {
      settings = s;
      if (s.colorSource !== 'custom') {
        // Palette CSS is keyed on :root[data-palette]; this page never
        // writes localStorage('palette'), so the site palette is unaffected.
        root.dataset.palette = s.colorSource;
      }
      const c = s.colorSource === 'custom' ? s.custom : readPalette(root);
      root.style.setProperty('--ss-bg', c.bg);
      c.layers.forEach((hex, i) => {
        root.style.setProperty(`--ss-l${i + 1}`, hex);
        root.style.setProperty(`--ss-l${i + 1}b`, /^#[0-9a-f]{6}$/i.test(hex) ? shiftHue(hex, 120) : hex);
      });
      wrapper.dataset.colorAnim = s.colorAnim;
      wrapper.style.removeProperty('--ss-hue');
      stop();
      if (s.colorAnim !== 'none') raf = requestAnimationFrame(tick);
    },
    destroy() {
      stop();
    },
  };
}
