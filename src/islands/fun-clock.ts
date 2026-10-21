// The clock on ~/fun's screensaver card: the screensaver's default face,
// showing the visitor's own time. The server leaves it empty (it can't know
// the visitor's time zone); this fills it and redraws on each new minute.

import { clockText } from '../lib/fun-previews';

let timer: number | undefined;

function stop(): void {
  if (timer !== undefined) window.clearTimeout(timer);
  timer = undefined;
}

function tick(el: HTMLElement): void {
  const now = new Date();
  el.textContent = clockText(now);
  const untilNextMinute = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
  timer = window.setTimeout(() => tick(el), untilNextMinute + 50);
}

function init(): void {
  stop();
  const el = document.querySelector<HTMLElement>('[data-fun-clock]');
  if (el) tick(el);
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', stop);
}
