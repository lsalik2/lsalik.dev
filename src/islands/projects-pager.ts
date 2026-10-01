// Paginates the projects index. All the work happens in pager-dom; this just
// finds the list and hands it every card. Re-runs on astro:page-load because
// view transitions swap the DOM in place.

import { createPager } from './pager-dom';

function setupProjectsPager(): void {
  const list = document.querySelector<HTMLElement>('[data-project-list]');
  const nav = document.querySelector<HTMLElement>('[data-pager]');
  if (!list || !nav) return;

  const cards = Array.from(list.querySelectorAll<HTMLElement>('[data-project-card]'));
  createPager(nav, list).setItems(cards);
}

document.addEventListener('astro:page-load', setupProjectsPager);
