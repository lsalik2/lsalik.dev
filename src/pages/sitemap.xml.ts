import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_URL } from '../lib/site';

const STATIC_PATHS = ['/', '/blog', '/projects', '/contact'];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(path: string, lastmod?: Date): string {
  const loc = escapeXml(`${SITE_URL}${path}`);
  const lastmodTag = lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';
  return `  <url><loc>${loc}</loc>${lastmodTag}</url>`;
}

export const GET: APIRoute = async () => {
  const blog = await getCollection('blog', ({ data }) => !data.draft);
  const projects = await getCollection('projects');

  const entries: string[] = [
    ...STATIC_PATHS.map(p => urlEntry(p)),
    ...blog.map(post => urlEntry(`/blog/${post.id}/`, post.data.date)),
    ...projects.map(project => urlEntry(`/projects/${project.id}/`, project.data.date)),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
