const WORDS_PER_MINUTE = 200;

export function readingTime(markdown: string): number {
  const trimmed = markdown.trim();
  if (!trimmed) return 1;
  const words = trimmed.split(/\s+/).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
