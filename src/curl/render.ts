import { bold, dim, green, blue, amber, cyan } from './ansi';
import { renderLogo } from './logo';

export interface BlogPostSummary {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
}

export interface BlogPostFull {
  title: string;
  date: string;
  tags: string[];
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
  repo: string;
  url?: string;
}

export function renderHome(): string {
  const logo = renderLogo();
  const title = bold('lsalik.dev');
  const description = dim('terminal-inspired personal website');
  const nav = [
    dim('navigate:'),
    `  curl lsalik.dev/blog`,
    `  curl lsalik.dev/projects`,
    `  curl lsalik.dev/resume`,
    `  curl lsalik.dev/links`,
  ].join('\n');
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
    const url = cyan(`curl lsalik.dev/blog/${post.slug}`);
    return `${date}  ${title}  ${tags}\n  ${description}\n  ${url}`;
  });

  return [header, '', ...postLines].join('\n');
}

export function renderBlogPost(post: BlogPostFull): string {
  const title = bold(`# ${post.title}`);
  const meta = dim(`${post.date} · ${post.tags.join(', ')}`);

  return [title, meta, '', post.content].join('\n');
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
    const repoLink = `${cyan('→')} ${project.repo}`;
    const url = cyan(`curl lsalik.dev/projects/${project.slug}`);
    return `${perms}  ${owner}  ${date}  ${title}\n  ${project.description}\n  ${stack}  ${status}\n  ${repoLink}\n  ${url}`;
  });

  return [header, '', ...projectLines].join('\n');
}

export function renderResume(content: string): string {
  const header = bold('~/resume');
  return [header, '', content].join('\n');
}

export function renderLinks(links: { label: string; url: string }[]): string {
  const header = bold('~/links');
  const linkLines = links.map(link => `  ${link.label}  ${link.url}`);
  return [header, '', ...linkLines].join('\n');
}
