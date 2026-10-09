// Renders the screensaver clock and keeps it current. Ticks on minute
// boundaries (not every second), re-syncs when the tab becomes visible again,
// and nudges its position each minute to avoid burn-in.

import type { ScreensaverSettings } from '../../lib/screensaver-settings';
import { formatTime, formatDate, renderBigDigits, driftOffset } from '../../lib/clock';

export interface ClockLayer {
  apply(s: ScreensaverSettings): void;
  destroy(): void;
}

export function createClockLayer(el: HTMLElement): ClockLayer {
  let settings: ScreensaverSettings | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function render(): void {
    if (!settings) return;
    el.textContent = '';
    el.hidden = settings.clock === 'off';
    el.dataset.pos = settings.clockPos;
    if (settings.clock === 'off') return;

    const now = new Date();
    if (settings.clock === 'digital') {
      const big = document.createElement('pre');
      big.className = 'ss-clock-big';
      big.textContent = renderBigDigits(formatTime(now, settings.clock24h)).join('\n');
      el.appendChild(big);
    }
    if (settings.clock === 'minimal') {
      const small = document.createElement('div');
      small.className = 'ss-clock-small';
      small.textContent = formatTime(now, settings.clock24h);
      el.appendChild(small);
    }
    if (settings.clock === 'digital' || settings.clock === 'date') {
      const date = document.createElement('div');
      date.className = 'ss-clock-date';
      date.textContent = formatDate(now);
      el.appendChild(date);
    }
    const { x, y } = driftOffset(Math.floor(now.getTime() / 60000));
    el.style.translate = `${x}px ${y}px`;
  }

  function schedule(): void {
    if (timer !== null) clearTimeout(timer);
    const msToNextMinute = 60000 - (Date.now() % 60000) + 50;
    timer = setTimeout(() => {
      render();
      schedule();
    }, msToNextMinute);
  }

  function onVisibility(): void {
    if (document.visibilityState === 'visible') {
      render();
      schedule();
    }
  }

  document.addEventListener('visibilitychange', onVisibility);

  return {
    apply(s) {
      settings = s;
      render();
      schedule();
    },
    destroy() {
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
