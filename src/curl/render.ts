import { bold, dim, green, blue, amber, cyan } from './ansi';
import { renderLogo } from './logo';
import { NAV_LINKS } from '../lib/nav';
import type { ContactSection } from '../data/contact';
export type { ContactSection };

export interface BlogPostSummary {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
}

export interface BlogPostNeighbor {
  slug: string;
  title: string;
}

export interface BlogPostFull {
  title: string;
  date: string;
  tags: string[];
  content: string;
  readingMinutes: number;
  prev?: BlogPostNeighbor;
  next?: BlogPostNeighbor;
}

export interface ProjectPostFull {
  title: string;
  status: string;
  stack: string[];
  content: string;
}

export interface ProjectSummary {
  slug: string;
  title: string;
  date: string;
  stack: string[];
  status: string;
  description: string;
  permissions: string;
  repo?: string;
  url?: string;
}

export function renderHome(): string {
  const logo = renderLogo();
  const title = bold('lsalik.dev');
  const description = dim('terminal-inspired personal website');
  const navLines = NAV_LINKS.map(link => `  curl -L lsalik.dev${link.href}`);
  const nav = [dim('navigate:'), ...navLines].join('\n');
  const source = dim('source: https://github.com/lsalik2/lsalik.dev');

  return [logo, '', title, description, '', nav, '', source].join('\n');
}

export function renderBlogIndex(posts: BlogPostSummary[]): string {
  const header = bold('~/blog');

  if (posts.length === 0) {
    return [header, '', 'No posts yet.'].join('\n');
  }

  const postLines = posts.map(post => {
    const date = dim(post.date);
    const title = bold(post.title);
    const tags = dim(`[${post.tags.join(', ')}]`);
    const description = post.description;
    const url = cyan(`curl -L lsalik.dev/blog/${post.slug}`);
    return `${date}  ${title}  ${tags}\n  ${description}\n  ${url}`;
  });

  return [header, '', ...postLines].join('\n');
}

export function renderBlogPost(post: BlogPostFull): string {
  const title = bold(`# ${post.title}`);
  const meta = dim(
    `${post.date} · ${post.tags.join(', ')} · ${post.readingMinutes} min read`,
  );

  const parts: string[] = [title, meta, '', post.content];

  if (post.prev || post.next) {
    parts.push('', dim('—'.repeat(40)));
    if (post.prev) {
      parts.push(
        `${dim('← prev:')} ${post.prev.title}  ${cyan(`curl -L lsalik.dev/blog/${post.prev.slug}`)}`,
      );
    }
    if (post.next) {
      parts.push(
        `${dim('→ next:')} ${post.next.title}  ${cyan(`curl -L lsalik.dev/blog/${post.next.slug}`)}`,
      );
    }
  }

  return parts.join('\n');
}

export function renderRSS(posts: BlogPostSummary[]): string {
  const header = bold('~/rss');
  const sub = dim('lsalik.dev — blog feed');

  if (posts.length === 0) {
    return [header, sub, '', 'No posts yet.'].join('\n');
  }

  const postLines = posts.map(post => {
    const date = dim(post.date);
    const title = bold(post.title);
    const description = post.description;
    const url = cyan(`curl -L lsalik.dev/blog/${post.slug}`);
    return `${date}  ${title}\n  ${description}\n  ${url}`;
  });

  const footer = dim('(xml: curl -L lsalik.dev/rss.xml from a browser UA)');

  return [header, sub, '', ...postLines, '', footer].join('\n');
}

// Unlike renderBlogPost, the project title is not prefixed with `# ` — that
// matches the shape of the prior inline project-post output in middleware.ts,
// and keeps project READMEs visually distinct from blog posts in the terminal.
export function renderProjectPost(project: ProjectPostFull): string {
  const title = bold(project.title);
  const meta = `${dim(project.status)} · ${project.stack.join(' · ')}`;
  return [title, meta, '', project.content].join('\n');
}

export function renderProjectsIndex(projects: ProjectSummary[]): string {
  const header = bold('~/projects');

  const projectLines = projects.map(project => {
    const perms = dim(project.permissions);
    const owner = green('slk');
    const date = dim(project.date);
    const title = blue(project.title);
    const stack = dim(project.stack.join(' · '));
    const status = amber(project.status);
    const repoLink = project.repo ? `${cyan('→')} ${project.repo}` : dim('→ closed source');
    const url = cyan(`curl -L lsalik.dev/projects/${project.slug}`);
    return `${perms}  ${owner}  ${date}  ${title}\n  ${project.description}\n  ${stack}  ${status}\n  ${repoLink}\n  ${url}`;
  });

  return [header, '', ...projectLines].join('\n');
}

export function renderContact(sections: readonly ContactSection[]): string {
  const header = bold('~/contact');
  const sectionLines = sections.flatMap(section => {
    const sectionHeader = dim(`— ${section.heading} —`);
    const links = section.links.map(link => `  ${link.label}  ${link.url}`);
    return [sectionHeader, ...links];
  });
  return [header, '', ...sectionLines].join('\n');
}

