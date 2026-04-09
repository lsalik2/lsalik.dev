// Minimal markdown → terminal cleanup for bodies shipped to curl clients.
// Does NOT aim to be a full markdown parser; only handles the cases the
// `/about` page exercises today (headings, links, bullet markers).

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const HEADING_PATTERN = /^#{1,6}\s+(.*)$/;
const BULLET_PATTERN = /^- (.*)$/;

export function stripMarkdownForTerminal(body: string): string {
  if (body.length === 0) return body;

  return body
    .split('\n')
    .map(line => {
      // Heading: strip leading #'s and surrounding whitespace.
      const headingMatch = line.match(HEADING_PATTERN);
      if (headingMatch) {
        return headingMatch[1].replace(LINK_PATTERN, (_m, text, url) => `${text} (${url})`);
      }

      // Bullet at start of line: - item → • item
      const bulletMatch = line.match(BULLET_PATTERN);
      if (bulletMatch) {
        return `• ${bulletMatch[1].replace(LINK_PATTERN, (_m, text, url) => `${text} (${url})`)}`;
      }

      // Inline links anywhere in the line.
      return line.replace(LINK_PATTERN, (_m, text, url) => `${text} (${url})`);
    })
    .join('\n');
}
