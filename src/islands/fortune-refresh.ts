// [another] on ~/fun: deals a different fortune in place, redrawing each copy
// of the bubble (wide and narrow) at its own width. Without JavaScript the
// link reloads /fun, which deals a fresh one server-side.

import { pickAnotherFortune } from '../data/fortunes';
import { renderFortune } from '../curl/render';
import { stripAnsi } from '../curl/ansi';

function init(): void {
  const button = document.querySelector<HTMLAnchorElement>('[data-fortune-another]');
  const frame = button?.closest<HTMLElement>('.terminal-frame');
  if (!button || !frame) return;

  button.addEventListener('click', e => {
    // Let modified clicks (new tab, new window) through to the link.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const bubbles = Array.from(frame.querySelectorAll<HTMLElement>('.fortune-art[data-width]'));
    const next = pickAnotherFortune(bubbles[0]?.getAttribute('aria-label') ?? '');
    for (const pre of bubbles) {
      pre.textContent = stripAnsi(renderFortune(next, Number(pre.dataset.width)));
      pre.setAttribute('aria-label', next);
    }
    const live = frame.querySelector('[data-fortune-live]');
    if (live) live.textContent = next;
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', init);
}
