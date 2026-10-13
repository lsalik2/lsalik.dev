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
  // Screen readers get the time as text; the block-glyph art is hidden from
  // them (it would read as "full block, full block, …").
  el.setAttribute('role', 'timer');
  let timer: ReturnType<typeof setTimeout> | null = null;

  function render(): void {
    if (!settings) return;
    el.textContent = '';
    el.hidden = settings.clock === 'off';
    el.dataset.pos = settings.clockPos;
    if (settings.clock === 'off') {
      el.removeAttribute('aria-label');
      return;
    }

    const now = new Date();
    const time = formatTime(now, settings.clock24h);
    const date = formatDate(now);
    el.setAttribute('aria-label', settings.clock === 'date' ? date : settings.clock === 'minimal' ? time : `${time}, ${date}`);
    if (settings.clock === 'digital') {
      const big = document.createElement('pre');
      big.className = 'ss-clock-big';
      big.setAttribute('aria-hidden', 'true');
      big.textContent = renderBigDigits(time).join('\n');
      el.appendChild(big);
    }
    if (settings.clock === 'minimal') {
      const small = document.createElement('div');
      small.className = 'ss-clock-small';
      small.setAttribute('aria-hidden', 'true');
      small.textContent = time;
      el.appendChild(small);
    }
    if (settings.clock === 'digital' || settings.clock === 'date') {
      const dateEl = document.createElement('div');
      dateEl.className = 'ss-clock-date';
      dateEl.setAttribute('aria-hidden', 'true');
      dateEl.textContent = date;
      el.appendChild(dateEl);
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
