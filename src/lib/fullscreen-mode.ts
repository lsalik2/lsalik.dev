// Which "go fullscreen" affordance the screensaver offers. iPhone Safari has
// no Fullscreen API for pages (only for <video>), so there the best option is
// launching from the home screen, which the page's manifest makes chrome-less.

export type FullscreenMode = 'fullscreen' | 'install-hint' | 'none';

export interface FullscreenEnv {
  fullscreenApi: boolean; // requestFullscreen or webkitRequestFullscreen exists
  standalone: boolean;    // already launched from the home screen
  iosPhone: boolean;      // iPhone / iPod (iPad supports the API)
}

export function fullscreenMode(env: FullscreenEnv): FullscreenMode {
  if (env.fullscreenApi) return 'fullscreen';
  if (env.standalone) return 'none';
  return env.iosPhone ? 'install-hint' : 'none';
}

export function isIosPhone(userAgent: string): boolean {
  return /\b(iPhone|iPod)\b/.test(userAgent);
}
