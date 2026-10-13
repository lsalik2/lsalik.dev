// Ordering for the projects listing, shared by the browser page and the curl
// view: projects marked `active` ("working on") come first, then newest first.

interface Sortable {
  readonly data: { readonly date: Date; readonly active?: boolean };
}

export function sortProjects<T extends Sortable>(projects: readonly T[]): T[] {
  return [...projects].sort((a, b) => {
    const activeDiff = Number(Boolean(b.data.active)) - Number(Boolean(a.data.active));
    if (activeDiff !== 0) return activeDiff;
    return b.data.date.getTime() - a.data.date.getTime();
  });
}
