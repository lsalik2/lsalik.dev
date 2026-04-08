import { defineMiddleware } from 'astro:middleware';
import { getCollection } from 'astro:content';
import { renderHome, renderBlogIndex, renderBlogPost, renderProjectsIndex, renderResume, renderLinks } from './curl/render';
import { bold, dim } from './curl/ansi';

const TERMINAL_AGENTS = ['curl/', 'wget/', 'httpie/', 'fetch/', 'libfetch/'];

function isTerminalClient(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return TERMINAL_AGENTS.some(agent => ua.includes(agent));
}

function textResponse(body: string): Response {
  return new Response(body.trimEnd() + '\n\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export const onRequest = defineMiddleware(async ({ request }, next) => {
  const ua = request.headers.get('user-agent');

  if (!isTerminalClient(ua)) {
    return next();
  }

  const { pathname } = new URL(request.url);

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
    if (!entry) return next();
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
  }

  if (pathname === '/resume' || pathname === '/resume/') {
    return textResponse(renderResume('Visit lsalik.dev/resume for full resume content.'));
  }

  if (pathname === '/links' || pathname === '/links/') {
    return textResponse(renderLinks([
      { label: 'GitHub', url: 'https://github.com/lsalik2' },
    ]));
  }

  return next();
});
