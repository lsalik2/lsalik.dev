// Ordering for the projects listing, shared by the browser page and the curl
// view: projects with an `order` come first, lowest first; the rest follow,
// those marked `active` ("working on") first, then newest first.

interface Sortable {
  readonly data: { readonly date: Date; readonly active?: boolean; readonly order?: number };
}

export function sortProjects<T extends Sortable>(projects: readonly T[]): T[] {
  return [...projects].sort((a, b) => {
    const orderDiff = (a.data.order ?? Infinity) - (b.data.order ?? Infinity);
    if (orderDiff !== 0 && !Number.isNaN(orderDiff)) return orderDiff;
    const activeDiff = Number(Boolean(b.data.active)) - Number(Boolean(a.data.active));
    if (activeDiff !== 0) return activeDiff;
    return b.data.date.getTime() - a.data.date.getTime();
  });
}
