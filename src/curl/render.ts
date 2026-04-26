import { bold, dim, green, blue, amber, cyan, red, accentGreen, accentMagenta, bodyWarm, titleBright, borderDim } from './ansi';
import { renderLogo } from './logo';
import { NAV_LINKS } from '../lib/nav';
import { box, hr, sectionHeader, twoCol, PAGE_WIDTH } from './box';
import type { ContactSection } from '../data/contact';
import type { Resume } from '../data/resume';
import type { Uses } from '../data/uses';
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
  const title = bold(titleBright('lsalik.dev'));
  const description = dim('terminal-inspired personal website');

  const headerBox = box(['', ...logo.split('\n'), '', title, description], { title: 'lsalik.dev' });

  const navLines = NAV_LINKS.map(link => `  ${cyan('curl -L lsalik.dev' + link.href)}`);
  const navBox = box([dim('navigate:'), ...navLines], { title: 'nav' });

  const source = dim('source: https://github.com/lsalik2/lsalik.dev');

  return [headerBox, '', navBox, '', source].join('\n');
}

export function renderBlogIndex(posts: BlogPostSummary[]): string {
  const header = sectionHeader('~/blog');

  if (posts.length === 0) {
    return [header, '', box(['No posts yet.'])].join('\n');
  }

  const postBoxes = posts.map(post => {
    const topLine = twoCol(bold(post.title), dim(post.date), PAGE_WIDTH - 4);
    const tags = dim(`[${post.tags.join(', ')}]`);
    const url = cyan(`curl -L lsalik.dev/blog/${post.slug}`);
    return box([topLine, post.description, tags, url]);
  });

  return [header, '', ...postBoxes].join('\n');
}

export function renderBlogPost(post: BlogPostFull): string {
  const topLine = twoCol(bold(post.title), dim(post.date), PAGE_WIDTH - 4);
  const meta = dim(
    `${post.tags.join(', ')} · ${post.readingMinutes} min read`,
  );
  const headerBox = box([topLine, meta], { title: post.title });

  const parts: string[] = [headerBox, '', post.content];

  if (post.prev || post.next) {
    parts.push('', hr());
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
  const header = sectionHeader('~/rss');
  const sub = dim('lsalik.dev — blog feed');

  if (posts.length === 0) {
    return [header, sub, '', box(['No posts yet.'])].join('\n');
  }

  const postBoxes = posts.map(post => {
    const topLine = twoCol(bold(post.title), dim(post.date), PAGE_WIDTH - 4);
    const url = cyan(`curl -L lsalik.dev/blog/${post.slug}`);
    return box([topLine, post.description, url]);
  });

  const footer = dim('(xml: curl -L lsalik.dev/rss.xml from a browser UA)');

  return [header, sub, '', ...postBoxes, '', hr(), footer].join('\n');
}

export function renderProjectPost(project: ProjectPostFull): string {
  const meta = `${dim(project.status)} · ${project.stack.join(' · ')}`;
  const headerBox = box([bold(project.title), meta], { title: project.title });
  return [headerBox, '', project.content].join('\n');
}

export function renderProjectsIndex(projects: ProjectSummary[]): string {
  const header = sectionHeader('~/projects');

  const projectBoxes = projects.map(project => {
    const topLine = twoCol(
      bold(blue(project.title)) + '  ' + dim(project.permissions),
      amber(project.status),
      PAGE_WIDTH - 4,
    );
    const stack = dim(project.stack.join(' · '));
    const repoLink = project.repo ? `${cyan('→')} ${project.repo}` : dim('→ closed source');
    const url = cyan(`curl -L lsalik.dev/projects/${project.slug}`);
    return box([topLine, project.description, stack, repoLink, url]);
  });

  return [header, '', ...projectBoxes].join('\n');
}

export function renderContact(sections: readonly ContactSection[]): string {
  const header = sectionHeader('~/contact');

  const sectionBoxes = sections.map(section => {
    const links = section.links.map(link => `  ${link.label}  ${cyan(link.url)}`);
    return box(links, { title: section.heading });
  });

  return [header, '', ...sectionBoxes].join('\n');
}

export function renderResume(resume: Resume): string {
  const inner = PAGE_WIDTH - 4;

  const nameLines = [
    bold(titleBright(resume.name)),
    bodyWarm(`${resume.location}  |  ${resume.links.map(l => cyan(l.url)).join('  |  ')}`),
  ];
  const headerBox = box(nameLines, { title: '~/resume' });

  const expHeader = sectionHeader('WORK EXPERIENCE');
  const expBoxes = resume.experience.map(job => {
    const topLine = twoCol(
      bold(job.title) + ', ' + accentMagenta(job.company) + dim(' — ' + job.location),
      bold(job.dates),
      inner,
    );
    const bullets = job.bullets.map(b => `  ${accentGreen('●')} ${bodyWarm(b)}`);
    return box([topLine, '', ...bullets]);
  });

  const eduHeader = sectionHeader('EDUCATION');
  const eduBoxes = resume.education.map(edu => {
    const topLine = bold(edu.degree) + ', ' + accentMagenta(edu.school);
    const bullets = edu.bullets.map(b => `  ${accentGreen('●')} ${bodyWarm(b)}`);
    return box([topLine, '', ...bullets]);
  });

  const skillsHeader = sectionHeader('SKILLS & LANGUAGES');
  const skillLines = resume.skills.map(cat =>
    `${bold(cat.label + ':')} ${bodyWarm(cat.items.join(', '))}`,
  );
  const skillsBox = box(skillLines);

  const footer = dim(`pdf: curl -LO lsalik.dev/resume.pdf`);

  return [
    headerBox,
    '',
    expHeader,
    ...expBoxes,
    '',
    eduHeader,
    ...eduBoxes,
    '',
    skillsHeader,
    skillsBox,
    '',
    hr(),
    footer,
  ].join('\n');
}

export function renderUses(uses: Uses): string {
  const logoLines = renderLogo().split('\n');

  // Build right-side info lines. Each category produces a dim heading
  // followed by `key: value` rows; categories are separated by a blank line.
  const infoLines: string[] = [];
  for (let i = 0; i < uses.categories.length; i++) {
    const category = uses.categories[i];
    if (i > 0) infoLines.push('');
    infoLines.push(dim(`── ${category.heading} ──`));
    for (const item of category.items) {
      infoLines.push(`${bold(cyan(item.key))}: ${bodyWarm(item.value)}`);
    }
  }

  // Two-column layout: logo on the left, info on the right. Pad the shorter
  // column with empty strings so rows zip cleanly.
  const rowCount = Math.max(logoLines.length, infoLines.length);
  const gap = '  ';
  const logoVisibleWidth = logoLines.reduce(
    (max, line) => Math.max(max, line.replace(/\x1b\[[\d;]*m/g, '').length),
    0,
  );
  const blankLogo = ' '.repeat(logoVisibleWidth);

  const rows: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    const left = logoLines[r] ?? blankLogo;
    const right = infoLines[r] ?? '';
    rows.push(left + gap + right);
  }

  return box(rows, { title: '~/uses' });
}
