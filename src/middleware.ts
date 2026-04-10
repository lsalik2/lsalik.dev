import { defineMiddleware } from 'astro:middleware';
import { getCollection } from 'astro:content';
import { NAV_LINKS } from './lib/nav';
import {
  renderHome,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderResume,
  renderContact,
  renderAbout,
  renderProjectPost,
} from './curl/render';
import { CONTACT_SECTIONS } from './data/contact';

// Raw markdown bodies for the about and sources pages. Vite's ?raw query
// gives us the file's text content directly, which is what the curl renderers
// want (no Astro markdown component rendering for the terminal output).
import aboutRaw from './data/about.md?raw';
import resumeRaw from './data/resume.md?raw';

const TERMINAL_AGENTS = ['curl/', 'wget/', 'httpie/', 'fetch/', 'libfetch/'];

// Security headers applied to every response that leaves this middleware.
// CSP allows 'unsafe-inline' for script/style because Base.astro ships an
// inline palette-restore head script and Astro emits inline component styles.
// Everything else is same-origin; there are no third-party assets.
const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; '),
};

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
  const ua = userAgent.toLowerCase();
  return TERMINAL_AGENTS.some(agent => ua.includes(agent));
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
  return withHeaders(
    new Response('\n' + body.trimEnd() + '\n', {
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
  const body = [
    `404: ${safePath} — not found`,
    '',
    'navigate:',
    '  curl -L lsalik.dev',
    ...navLines,
  ].join('\n');
  return withHeaders(
    new Response('\n' + body + '\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }),
    { 'Cache-Control': NOT_FOUND_CACHE },
  );
}

export const onRequest = defineMiddleware(async ({ request }, next) => {
  const ua = request.headers.get('user-agent');
  const { pathname } = new URL(request.url);

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
        description: post.data.description,
      }));
    return textResponse(renderBlogIndex(posts));
  }

  const blogMatch = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const entries = await getCollection('blog');
    const entry = entries.find(post => post.id === slug);
    if (!entry) return notFoundResponse(pathname);
    return textResponse(
      renderBlogPost({
        title: entry.data.title,
        date: entry.data.date.toISOString().slice(0, 10),
        tags: entry.data.tags,
        content: entry.body ?? entry.data.description,
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
        description: project.data.description,
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
    const content = entry.body ?? entry.data.description;
    return textResponse(
      renderProjectPost({
        title: entry.data.title,
        status: entry.data.status,
        stack: entry.data.stack,
        content,
      })
    );
  }

  if (pathname === '/resume' || pathname === '/resume/') {
    return textResponse(renderResume(resumeRaw));
  }

  if (pathname === '/contact' || pathname === '/contact/') {
    return textResponse(renderContact(CONTACT_SECTIONS));
  }

  if (pathname === '/about' || pathname === '/about/') {
    return textResponse(renderAbout(aboutRaw));
  }

  return notFoundResponse(pathname);
});
