// DOM wiring for the blog index search bar and tag chips. Pure filter logic
// lives in src/lib/blog-filter.ts; this module reads each card's dataset,
// runs the filter, toggles visibility, and hands the matching cards to the
// pager so pages are always slices of the filtered results.
//
// We re-run setup on every astro:page-load because Astro view transitions
// swap the DOM in place — the listeners attached to the previous page's
// nodes go with it.

import { matchesFilter, type PostMeta } from '../lib/blog-filter';
import { createPager } from './pager-dom';

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
  const search = document.querySelector<HTMLInputElement>('[data-blog-search]');
  const chips = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-tag-chip]'),
  );
  const cardEls = Array.from(
    document.querySelectorAll<HTMLElement>('[data-blog-card]'),
  );
  const empty = document.querySelector<HTMLElement>('[data-blog-empty]');
  const filters = document.querySelector<HTMLElement>('[data-blog-filters]');
  const nav = document.querySelector<HTMLElement>('[data-pager]');

  if (!search || cardEls.length === 0) return;

  const cards = cardEls.map(readCard);
  const activeTags = new Set<string>();
  const pager = nav && filters ? createPager(nav, filters) : null;

  // `resetPage` is false only for the initial run, so a ?page= in the URL
  // survives page load but any search/tag change starts back at page 1.
  function apply(resetPage = true): void {
    const query = search!.value;
    const matched: HTMLElement[] = [];
    for (const { el, meta } of cards) {
      const show = matchesFilter(meta, query, activeTags);
      el.hidden = !show;
      if (show) matched.push(el);
    }
    if (empty) empty.hidden = matched.length !== 0;
    pager?.setItems(matched, resetPage);
  }

  search.addEventListener('input', () => apply());

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

  apply(false);
}

document.addEventListener('astro:page-load', setupBlogFilter);
