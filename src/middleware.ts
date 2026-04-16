import { defineMiddleware } from 'astro:middleware';
import { getCollection } from 'astro:content';
import { NAV_LINKS } from './lib/nav';
import {
  renderHome,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderContact,
  renderProjectPost,
  renderRSS,
  renderResume,
} from './curl/render';
import { readingTime } from './lib/reading-time';
import { CONTACT_SECTIONS } from './data/contact';
import { RESUME } from './data/resume';
import { red, stripDangerousEscapes } from './curl/ansi';
import { box } from './curl/box';
import { SECURITY_HEADERS } from './lib/security-headers';

// Matches terminal/CLI HTTP clients by their product token at the start of the
// User-Agent string. Anchoring to ^ prevents a crafted UA like
// "Mozilla/5.0 (compatible; curl/8.0)" from matching.
const TERMINAL_UA_RE = /^(curl|wget|httpie|fetch|libfetch)\//i;

// Cache directives. We must prevent Vercel from caching responses on the edge
// because we return fundamentally different content (HTML vs Plain Text) on the
// same URL depending on the User-Agent. Vercel's edge cache does not support
// Vary: User-Agent, so if we allow edge caching, browsers will get terminal text
// or terminals will get HTML.
const CACHE_CONTROL = 'private, no-cache, no-store, must-revalidate';
const HTML_CACHE = CACHE_CONTROL;
const CURL_CACHE = CACHE_CONTROL;
const NOT_FOUND_CACHE = CACHE_CONTROL;

function isTerminalClient(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return TERMINAL_UA_RE.test(userAgent.trim());
}

// Clone a response with additional/overridden headers. Upstream Response
// objects (e.g. from Astro's `next()`) can have immutable header bags in
// edge runtimes, so we always rebuild the Headers.
function withHeaders(response: Response, extra: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, value);
  }
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function textResponse(body: string): Response {
  // Wrap the body in blank lines on both ends so the curl output is visually
  // separated from the user's shell prompt above and below.
  return withHeaders(
    new Response('\n' + body.trimEnd() + '\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }),
    { 'Cache-Control': CURL_CACHE },
  );
}

// Sanitize a pathname before echoing it into a terminal response body.
// Strips ASCII control characters (including ESC 0x1b, which drives ANSI
// escape sequences) so a crafted URL can't inject cursor moves, screen
// clears, or terminal emulator exploits into the 404 output. Also caps the
// length so a huge path can't flood the response.
function sanitizePathnameForTerminal(pathname: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = pathname.replace(/[\x00-\x1f\x7f]/g, '?');
  return stripped.length > 120 ? stripped.slice(0, 117) + '...' : stripped;
}

function notFoundResponse(pathname: string): Response {
  const safePath = sanitizePathnameForTerminal(pathname);
  const navLines = NAV_LINKS.map(link => `  curl -L lsalik.dev${link.href}`);
  const body = box(
    [
      red(`404: ${safePath} — not found`),
      '',
      'navigate:',
      '  curl -L lsalik.dev',
      ...navLines,
    ],
    { title: '404' },
  );
  return withHeaders(
    new Response('\n' + body + '\n\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }),
    { 'Cache-Control': NOT_FOUND_CACHE },
  );
}

export const onRequest = defineMiddleware(async ({ request }, next) => {
  const ua = request.headers.get('user-agent');
  const { pathname } = new URL(request.url);

  // Feed / crawler endpoints — served as-is to every client (curl included),
  // since RSS readers and search engines may send non-browser User-Agents
  // but still need the real XML/text rather than the terminal renderer.
  if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
    const response = await next();
    return withHeaders(response, {});
  }

  // /links → /contact redirect (applies to both browser and curl traffic).
  if (pathname === '/links' || pathname === '/links/') {
    return withHeaders(
      new Response(null, {
        status: 308,
        headers: { Location: '/contact' },
      }),
      { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    );
  }

  if (!isTerminalClient(ua)) {
    const response = await next();
    // Only cache successful HTML pages. 3xx/4xx/5xx responses and the
    // astro:content image endpoint shouldn't be edge-cached blindly.
    const isHtml = response.headers
      .get('content-type')
      ?.toLowerCase()
      .includes('text/html');
    const extra: Record<string, string> = {};
    if (response.status === 200 && isHtml) {
      extra['Cache-Control'] = HTML_CACHE;
    } else if (response.status === 404) {
      extra['Cache-Control'] = NOT_FOUND_CACHE;
    }
    return withHeaders(response, extra);
  }

  if (pathname === '/' || pathname === '') {
    return textResponse(renderHome());
  }

  if (pathname === '/blog' || pathname === '/blog/') {
    const entries = await getCollection('blog');
    const posts = entries
      .filter(post => !post.data.draft)
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map(post => ({
        slug: post.id,
        title: post.data.title,
        date: post.data.date.toISOString().slice(0, 10),
        tags: post.data.tags,
        description: stripDangerousEscapes(post.data.description),
      }));
    return textResponse(renderBlogIndex(posts));
  }

  if (pathname === '/rss.xml' || pathname === '/rss' || pathname === '/rss/') {
    const entries = await getCollection('blog');
    const posts = entries
      .filter(post => !post.data.draft)
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map(post => ({
        slug: post.id,
        title: post.data.title,
        date: post.data.date.toISOString().slice(0, 10),
        tags: post.data.tags,
        description: stripDangerousEscapes(post.data.description),
      }));
    return textResponse(renderRSS(posts));
  }

  const blogMatch = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const entries = await getCollection('blog');
    const published = entries
      .filter(post => !post.data.draft)
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
    const idx = published.findIndex(post => post.id === slug);
    if (idx === -1) return notFoundResponse(pathname);
    const entry = published[idx];
    // Descending sort: lower index = newer. `next` = newer (idx - 1),
    // `prev` = older (idx + 1).
    const newer = published[idx - 1];
    const older = published[idx + 1];
    return textResponse(
      renderBlogPost({
        title: entry.data.title,
        date: entry.data.date.toISOString().slice(0, 10),
        tags: entry.data.tags,
        content: stripDangerousEscapes(entry.body ?? entry.data.description),
        readingMinutes: readingTime(entry.body ?? ''),
        prev: older ? { slug: older.id, title: older.data.title } : undefined,
        next: newer ? { slug: newer.id, title: newer.data.title } : undefined,
      })
    );
  }

  if (pathname === '/projects' || pathname === '/projects/') {
    const entries = await getCollection('projects');
    const projects = entries
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map(project => ({
        slug: project.id,
        title: project.data.title,
        date: project.data.date.toISOString().slice(0, 10),
        stack: project.data.stack,
        status: project.data.status,
        description: stripDangerousEscapes(project.data.description),
        permissions: project.data.permissions,
        repo: project.data.repo,
        url: project.data.url,
      }));
    return textResponse(renderProjectsIndex(projects));
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/?$/);
  if (projectMatch) {
    const slug = projectMatch[1];
    const entries = await getCollection('projects');
    const entry = entries.find(p => p.id === slug);
    if (!entry) return notFoundResponse(pathname);
    const content = stripDangerousEscapes(entry.body ?? entry.data.description);
    return textResponse(
      renderProjectPost({
        title: entry.data.title,
        status: entry.data.status,
        stack: entry.data.stack,
        content,
      })
    );
  }

  if (pathname === '/contact' || pathname === '/contact/') {
    return textResponse(renderContact(CONTACT_SECTIONS));
  }

  if (pathname === '/resume' || pathname === '/resume/') {
    return textResponse(renderResume(RESUME));
  }

  return notFoundResponse(pathname);
});
