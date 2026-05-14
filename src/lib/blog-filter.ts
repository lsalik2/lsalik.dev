// Pure filter logic for the blog index. The DOM wiring lives in
// src/islands/blog-filter.ts; this module is testable in isolation.

export interface PostMeta {
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
}

// A post passes if (a) when any tags are active, at least one of its tags is
// in that set (union semantics — clicking [meta] and [security] shows posts
// tagged with either), and (b) when a query is present, the query is found
// as a case-insensitive substring of title, description, or any tag.
export function matchesFilter(
  post: PostMeta,
  query: string,
  activeTags: ReadonlySet<string>,
): boolean {
  if (activeTags.size > 0) {
    let intersects = false;
    for (const tag of post.tags) {
      if (activeTags.has(tag)) {
        intersects = true;
        break;
      }
    }
    if (!intersects) return false;
  }

  const trimmed = query.trim();
  if (trimmed === '') return true;

  const needle = trimmed.toLowerCase();
  if (post.title.toLowerCase().includes(needle)) return true;
  if (post.description.toLowerCase().includes(needle)) return true;
  for (const tag of post.tags) {
    if (tag.toLowerCase().includes(needle)) return true;
  }
  return false;
}
