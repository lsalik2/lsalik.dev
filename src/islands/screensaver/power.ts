// Leave-it-running behaviour: auto-hiding panel + cursor, fullscreen, and a
// screen wake lock. Every browser API here is feature-detected; missing or
// denied APIs degrade silently.

import { INITIAL_PANEL, nextPanelState, panelShowing, type PanelState } from '../../lib/panel-visibility';

export interface AutoHide {
  togglePin(): boolean;
  hide(): void;      // the [hide] button: hidden until a click, tap or key
  close(): void;     // Esc with the panel open
  visible(): boolean; // is the panel showing?
  destroy(): void;
}

// What a press counts as: anything on the panel, a button or a link keeps
// things awake but never toggles the panel; anywhere else is the screen.
function onControl(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest('[data-ss-panel], [data-ss-install-hint], button, a, input, select, label') !== null;
}

export function createAutoHide(panel: HTMLElement, idleMs: number): AutoHide {
  let state: PanelState = INITIAL_PANEL;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function apply(next: PanelState): void {
    state = next;
    document.body.classList.toggle('ss-idle', state.idle);
    document.body.classList.toggle('ss-dismissed', state.dismissed);
    panel.dataset.pinned = String(state.pinned);
    if (timer !== null) clearTimeout(timer);
    timer = state.idle ? null : setTimeout(onTimeout, idleMs);
  }

  function onTimeout(): void {
    // Never hide under the user's hand or while a control has focus.
    if (panelShowing(state) && (panel.matches(':hover') || panel.matches(':focus-within'))) {
      apply(state);
      return;
    }
    apply(nextPanelState(state, 'timeout'));
  }

  function onPointerMove(e: PointerEvent): void {
    // Touch moves come with taps and panel scrolling; only a mouse wakes things.
    if (e.pointerType !== 'touch') apply(nextPanelState(state, 'activity'));
  }

  function onPointerDown(e: PointerEvent): void {
    if (onControl(e.target)) apply(nextPanelState(state, 'activity'));
    else apply(nextPanelState(state, e.pointerType === 'touch' ? 'screen-tap' : 'screen-click'));
  }

  // Escape is not "activity": it's how the user closes the panel, so it
  // must not re-show it before the screensaver's own key handler runs.
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') apply(nextPanelState(state, 'key'));
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  apply(state);

  return {
    togglePin() {
      apply(nextPanelState(state, 'toggle-pin'));
      return state.pinned;
    },
    hide() {
      // A focused control would keep the panel from hiding (see onTimeout),
      // and a hidden panel shouldn't hold the keyboard focus anyway.
      if (panel.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      apply(nextPanelState(state, 'hide'));
    },
    close() {
      apply(nextPanelState(state, 'close'));
    },
    visible() {
      return panelShowing(state);
    },
    destroy() {
      if (timer !== null) clearTimeout(timer);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}

// Older Safari (incl. iPadOS before 16.4) only has the webkit-prefixed API.
interface WebkitFullscreen {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
}

export function fullscreenSupported(): boolean {
  const el = document.documentElement as HTMLElement & WebkitFullscreen;
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
}

export function isFullscreen(): boolean {
  return Boolean(document.fullscreenElement ?? (document as Document & WebkitFullscreen).webkitFullscreenElement);
}

export async function toggleFullscreen(): Promise<void> {
  const doc = document as Document & WebkitFullscreen;
  const el = document.documentElement as HTMLElement & WebkitFullscreen;
  try {
    if (isFullscreen()) {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
    } else if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else {
      await el.webkitRequestFullscreen?.();
    }
  } catch {
    // Denied (e.g. not triggered by a user gesture) — nothing to do.
  }
}

// Already running chrome-less from the home screen.
export function isStandalone(): boolean {
  const mm = (q: string) => typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
  return mm('(display-mode: fullscreen)') || mm('(display-mode: standalone)') ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

interface WakeLockSentinelLike extends EventTarget {
  readonly released: boolean;
  release(): Promise<void>;
}

// Keeps the display awake while the page is visible. Returns a cleanup fn.
export function keepScreenAwake(): () => void {
  const wl = (navigator as Navigator & {
    wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
  }).wakeLock;
  if (!wl) return () => {};
  let sentinel: WakeLockSentinelLike | null = null;
  let pending = false;

  // One request at a time, and none while a lock is still held: rapid
  // visibility changes used to stack requests and leak sentinels. The browser
  // releases the lock when the tab is hidden; the 'release' event clears it so
  // the next visible state acquires a fresh one.
  async function acquire(): Promise<void> {
    if (document.visibilityState !== 'visible' || pending) return;
    if (sentinel && !sentinel.released) return;
    pending = true;
    try {
      const s = await wl!.request('screen');
      s.addEventListener('release', () => {
        if (sentinel === s) sentinel = null;
      });
      sentinel = s;
    } catch {
      sentinel = null;
    } finally {
      pending = false;
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
