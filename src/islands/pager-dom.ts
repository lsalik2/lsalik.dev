// DOM wiring for the <Pager> component. Pure page math and ?page= handling
// live in src/lib/pagination.ts; this module hides items outside the current
// page, drives the prev/next buttons, and keeps ?page= in the URL so refreshes
// and shared links land on the same page.
//
// Callers own *which* items are pageable: the blog filter passes only the
// cards that match the current search/tags, the projects island passes all.

import { paginate, parsePage, withPage } from '../lib/pagination';

export interface Pager {
  // Replaces the pageable items. `resetPage` jumps back to page 1 — used when
  // a filter change makes the old page number meaningless.
  setItems(items: readonly HTMLElement[], resetPage?: boolean): void;
}

export function createPager(nav: HTMLElement, scrollTarget: HTMLElement): Pager {
  const size = Number(nav.dataset.pageSize) || 10;
  const prev = nav.querySelector<HTMLButtonElement>('[data-pager-prev]');
  const next = nav.querySelector<HTMLButtonElement>('[data-pager-next]');
  const pageLabel = nav.querySelector<HTMLElement>('[data-pager-page]');
  const rangeLabel = nav.querySelector<HTMLElement>('[data-pager-range]');

  let items: readonly HTMLElement[] = [];
  let page = parsePage(location.search);

  function render(scroll: boolean): void {
    const slice = paginate(items.length, page, size);
    page = slice.page;

    items.forEach((el, i) => {
      el.hidden = i < slice.start || i >= slice.end;
    });

    nav.hidden = slice.pageCount <= 1;
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= slice.pageCount;
    if (pageLabel) pageLabel.textContent = `page ${page}/${slice.pageCount}`;
    if (rangeLabel) {
      rangeLabel.textContent = `showing ${slice.start + 1}–${slice.end} of ${items.length}`;
    }

    // Pass history.state through: ClientRouter stores its own bookkeeping
    // there, and nulling it breaks back/forward transitions.
    const target = withPage(location.href, page);
    if (target !== location.pathname + location.search + location.hash) {
      history.replaceState(history.state, '', target);
    }

    if (scroll) scrollTarget.scrollIntoView({ block: 'start' });
  }

  prev?.addEventListener('click', () => {
    page--;
    render(true);
  });
  next?.addEventListener('click', () => {
    page++;
    render(true);
  });

  return {
    setItems(newItems, resetPage = false) {
      items = newItems;
      if (resetPage) page = 1;
      render(false);
    },
  };
}
