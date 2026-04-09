import { defineMiddleware } from 'astro:middleware';
import { getCollection } from 'astro:content';
import {
  renderHome,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderResume,
  renderContact,
  renderAbout,
  type ContactSection,
} from './curl/render';
import { bold, dim } from './curl/ansi';

// Raw markdown bodies for the about and sources pages. Vite's ?raw query
// gives us the file's text content directly, which is what the curl renderers
// want (no Astro markdown component rendering for the terminal output).
import aboutRaw from './data/about.md?raw';

const TERMINAL_AGENTS = ['curl/', 'wget/', 'httpie/', 'fetch/', 'libfetch/'];

function isTerminalClient(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return TERMINAL_AGENTS.some(agent => ua.includes(agent));
}

function textResponse(body: string): Response {
  return new Response('\n' + body.trimEnd() + '\n\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function notFoundResponse(pathname: string): Response {
  const body = [
    `404: ${pathname} — not found`,
    '',
    'navigate:',
    '  curl lsalik.dev',
    '  curl lsalik.dev/about',
    '  curl lsalik.dev/projects',
    '  curl lsalik.dev/blog',
    '  curl lsalik.dev/resume',
    '  curl lsalik.dev/contact',
  ].join('\n');
  return new Response('\n' + body + '\n\n', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export const onRequest = defineMiddleware(async ({ request }, next) => {
  const ua = request.headers.get('user-agent');
  const { pathname } = new URL(request.url);

  // /links → /contact redirect (applies to both browser and curl traffic).
  if (pathname === '/links' || pathname === '/links/') {
    return new Response(null, {
      status: 308,
      headers: { Location: '/contact' },
    });
  }

  if (!isTerminalClient(ua)) {
    return next();
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
    if (!entry) return isTerminalClient(ua) ? notFoundResponse(pathname) : next();
    return textResponse(
      renderBlogPost({
        title: entry.data.title,
        date: entry.data.date.toISOString().slice(0, 10),
        tags: entry.data.tags,
        content: (entry as any).body ?? entry.data.description,
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
    if (entry) {
      const content = (entry as any).body ?? entry.data.description;
      return textResponse(
        `${bold(entry.data.title)}\n${dim(entry.data.status)} · ${entry.data.stack.join(' · ')}\n\n${content}`
      );
    }
    return isTerminalClient(ua) ? notFoundResponse(pathname) : next();
  }

  if (pathname === '/resume' || pathname === '/resume/') {
    return textResponse(renderResume('Visit lsalik.dev/resume for full resume content.'));
  }

  if (pathname === '/contact' || pathname === '/contact/') {
    const sections: ContactSection[] = [
      {
        heading: 'professional',
        links: [
          { label: 'GitHub', url: 'https://github.com/lsalik2' },
          { label: 'LinkedIn', url: 'https://linkedin.com/in/luis-salik' },
          { label: 'Discord User Link', url: 'https://discord.gg/6zdHqY7h' },
        ],
      },
      {
        heading: 'esports',
        links: [
          { label: 'Liquipedia', url: 'https://liquipedia.net/rocketleague/SLK' },
          { label: 'X', url: 'https://x.com/slkrl_' },
          { label: 'Twitch', url: 'https://twitch.tv/slkrl' },
          { label: 'YouTube', url: 'https://youtube.com/@slk-rl' },
          { label: 'Steam', url: 'https://steamcommunity.com/id/SlkRL' },
          { label: 'Discord Server', url: 'https://discord.gg/dsUfTqmE4d' },
        ],
      },
    ];
    return textResponse(renderContact(sections));
  }

  if (pathname === '/about' || pathname === '/about/') {
    return textResponse(renderAbout(aboutRaw));
  }

  if (isTerminalClient(ua)) {
    return notFoundResponse(pathname);
  }

  return next();
});
