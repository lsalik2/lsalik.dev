// Leave-it-running behaviour: auto-hiding panel + cursor, fullscreen, and a
// screen wake lock. Every browser API here is feature-detected; missing or
// denied APIs degrade silently.

export interface AutoHide {
  togglePin(): boolean;
  show(): void;
  hideNow(): void;
  visible(): boolean;
  destroy(): void;
}

export function createAutoHide(panel: HTMLElement, idleMs: number): AutoHide {
  let pinned = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function hide(): void {
    // Never hide under the user's hand or while a control has focus.
    if (pinned || panel.matches(':hover') || panel.matches(':focus-within')) {
      arm();
      return;
    }
    document.body.classList.add('ss-idle');
  }

  function arm(): void {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(hide, idleMs);
  }

  function show(): void {
    document.body.classList.remove('ss-idle');
    arm();
  }

  // Escape is not "activity": it's how the user closes the panel, so it
  // must not re-show it before the screensaver's own key handler runs.
  function onActivity(e: Event): void {
    if (e instanceof KeyboardEvent && e.key === 'Escape') return;
    show();
  }

  const events = ['pointermove', 'pointerdown', 'keydown'] as const;
  for (const e of events) window.addEventListener(e, onActivity, { passive: true });
  arm();

  return {
    togglePin() {
      pinned = !pinned;
      panel.dataset.pinned = String(pinned);
      show();
      return pinned;
    },
    show,
    hideNow() {
      if (timer !== null) clearTimeout(timer);
      if (!pinned) document.body.classList.add('ss-idle');
    },
    visible() {
      return !document.body.classList.contains('ss-idle');
    },
    destroy() {
      if (timer !== null) clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, onActivity);
    },
  };
}

export function fullscreenSupported(): boolean {
  return typeof document.documentElement.requestFullscreen === 'function';
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Denied (e.g. not triggered by a user gesture) — nothing to do.
  }
}

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

// Keeps the display awake while the page is visible. Returns a cleanup fn.
export function keepScreenAwake(): () => void {
  const wl = (navigator as Navigator & {
    wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
  }).wakeLock;
  if (!wl) return () => {};
  let sentinel: WakeLockSentinelLike | null = null;

  async function acquire(): Promise<void> {
    if (document.visibilityState !== 'visible') return;
    try {
      sentinel = await wl!.request('screen');
    } catch {
      sentinel = null;
    }
  }

  function onVisibility(): void {
    if (document.visibilityState === 'visible') void acquire();
  }

  function release(): void {
    void sentinel?.release().catch(() => {});
    sentinel = null;
  }

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', release);
  void acquire();

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', release);
    release();
  };
}
