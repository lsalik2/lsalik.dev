// Pure pagination math and ?page= URL handling for the blog and projects
// listings. The DOM wiring lives in src/islands/pager-dom.ts; this module is
// testable in isolation.

export interface PageSlice {
  readonly page: number;
  readonly pageCount: number;
  readonly start: number;
  readonly end: number;
}

// Clamps `page` into [1, pageCount] so stale or hand-edited URLs (?page=99)
// land on a real page instead of an empty list. An empty list is one page.
export function paginate(total: number, page: number, size: number): PageSlice {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const clamped = Math.min(Math.max(page, 1), pageCount);
  const start = (clamped - 1) * size;
  return { page: clamped, pageCount, start, end: Math.min(start + size, total) };
}

// Reads ?page=N from a location.search string. Anything that isn't a plain
// positive integer falls back to page 1.
export function parsePage(search: string): number {
  const raw = new URLSearchParams(search).get('page');
  if (raw === null || !/^\d+$/.test(raw)) return 1;
  const n = Number(raw);
  return n >= 1 ? n : 1;
}

// Returns the path + query + hash of `href` with ?page set to `page`, dropping
// the param on page 1 so the canonical first page keeps a clean URL.
export function withPage(href: string, page: number): string {
  const url = new URL(href);
  if (page <= 1) url.searchParams.delete('page');
  else url.searchParams.set('page', String(page));
  return url.pathname + url.search + url.hash;
}
