// DOM wiring for the blog index search bar and tag chips. Pure filter logic
// lives in src/lib/blog-filter.ts; this module reads each card's dataset,
// runs the filter, and toggles visibility.
//
// We re-run setup on every astro:page-load because Astro view transitions
// swap the DOM in place — the listeners attached to the previous page's
// nodes go with it. We also run setup once at module load: when navigating
// into /blog via the ClientRouter, the script is dynamically imported
// after astro:page-load has already fired, so the listener alone misses
// the first visit. The dataset.filtersReady marker keeps the same DOM
// from being wired twice.

import { matchesFilter, type PostMeta } from '../lib/blog-filter';

interface FilterCard {
  readonly el: HTMLElement;
  readonly meta: PostMeta;
}

function readCard(el: HTMLElement): FilterCard {
  const tagsRaw = el.dataset.tags ?? '';
  const tags = tagsRaw === '' ? [] : tagsRaw.split(',').map(t => t.trim());
  return {
    el,
    meta: {
      title: el.dataset.title ?? '',
      description: el.dataset.description ?? '',
      tags,
    },
  };
}

function setupBlogFilter(): void {
  const filters = document.querySelector<HTMLElement>('[data-blog-filters]');
  if (!filters || filters.dataset.filtersReady === '1') return;

  const search = document.querySelector<HTMLInputElement>('[data-blog-search]');
  const chips = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-tag-chip]'),
  );
  const cardEls = Array.from(
    document.querySelectorAll<HTMLElement>('[data-blog-card]'),
  );
  const empty = document.querySelector<HTMLElement>('[data-blog-empty]');

  if (!search || cardEls.length === 0) return;
  filters.dataset.filtersReady = '1';

  const cards = cardEls.map(readCard);
  const activeTags = new Set<string>();

  function apply(): void {
    const query = search!.value;
    let visible = 0;
    for (const { el, meta } of cards) {
      const show = matchesFilter(meta, query, activeTags);
      el.hidden = !show;
      if (show) visible++;
    }
    if (empty) empty.hidden = visible !== 0;
  }

  search.addEventListener('input', apply);

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag;
      if (!tag) return;
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
        chip.setAttribute('aria-pressed', 'false');
      } else {
        activeTags.add(tag);
        chip.setAttribute('aria-pressed', 'true');
      }
      apply();
    });
  }

  apply();
}

document.addEventListener('astro:page-load', setupBlogFilter);
setupBlogFilter();
