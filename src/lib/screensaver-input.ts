// Keyboard mapping and exit routing for the screensaver page. Pure.

export type ScreensaverKeyAction =
  | 'fullscreen'
  | 'toggle-pin'
  | 'escape'
  | 'prev-pattern'
  | 'next-pattern'
  | 'none';

// `typingTarget` is true when focus is in a panel control (input, select,
// textarea). Those keep their own keys — arrows move a slider, letters edit a
// hex field — and only Escape still reaches the screensaver.
export function keyAction(key: string, typingTarget: boolean): ScreensaverKeyAction {
  if (key === 'Escape') return 'escape';
  if (typingTarget) return 'none';
  switch (key) {
    case 'f':
    case 'F':
      return 'fullscreen';
    case 'h':
    case 'H':
      return 'toggle-pin';
    case 'ArrowLeft':
      return 'prev-pattern';
    case 'ArrowRight':
      return 'next-pattern';
    default:
      return 'none';
  }
}

export function exitTarget(referrer: string, origin: string): string {
  try {
    const url = new URL(referrer);
    if (url.origin !== origin) return '/';
    if (url.pathname.replace(/\/$/, '') === '/screensaver') return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
