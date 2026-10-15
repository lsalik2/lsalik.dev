import { bold, dim, green, blue, amber, cyan, red, accentGreen, accentMagenta, bodyWarm, titleBright, borderDim, visibleWidth } from './ansi';
import { renderLogo } from './logo';
import { FINCH, FINCH_MASK, RAVEN, RAVEN_MASK, FORTUNE_CAT, paintCat } from './cats';
import { pickFortune } from '../data/fortunes';
import { maintainerLines, type MaintainerLines } from '../data/maintainers';
import { NAV_LINKS } from '../lib/nav';
import { box, hr, sectionHeader, twoCol, wrap, PAGE_WIDTH } from './box';
import type { ContactSection } from '../data/contact';
import type { Resume } from '../data/resume';
import type { Uses } from '../data/uses';
import type { Man, ManBlock } from '../data/man';
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
  stats?: string;
  active?: boolean;
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
  stats?: string;
  active?: boolean;
}

const WORKING_ON = '● working on';

// Lines that already fit are returned untouched (wrap() would drop their
// leading indentation); only overflowing lines are re-wrapped to `max`.
function fit(line: string, max: number): string[] {
  return visibleWidth(line) <= max ? [line] : wrap(line, max).split('\n');
}

// Below this width the /uses logo stacks above the info instead of beside it.
const USES_SIDE_BY_SIDE_MIN = 64;

export function renderHome(width: number = PAGE_WIDTH, fortune: string = pickFortune()): string {
  const logo = renderLogo();
  const title = bold(titleBright('lsalik.dev'));
  const description = dim('terminal-inspired personal website');

  const headerBox = box(['', ...logo.split('\n'), '', title, description], { title: 'lsalik.dev', width });

  const navLines = NAV_LINKS.map(link => `  ${cyan('curl -L lsalik.dev' + link.href)}`);
  const tip = dim('tip: add ?cols=$COLUMNS to any URL to fit your terminal');
  const navBox = box([dim('navigate:'), ...navLines, '', tip], { title: 'nav', width });

  const source = fit(dim('source: https://github.com/lsalik2/lsalik.dev'), width);

  // Every visit deals a fortune, like the $ fortune frame on the web homepage.
  const fortuneBlock = [`${green('$')} fortune`, renderFortune(fortune, width)];

  return [headerBox, '', navBox, '', ...fortuneBlock, '', ...source].join('\n');
}

export function renderBlogIndex(posts: BlogPostSummary[], width: number = PAGE_WIDTH): string {
  const header = sectionHeader('~/blog', width);

  if (posts.length === 0) {
    return [header, '', box(['No posts yet.'], { width })].join('\n');
  }

  const postBoxes = posts.map(post => {
    const topLine = twoCol(bold(post.title), dim(post.date), width - 4);
    const tags = dim(`[${post.tags.join(', ')}]`);
    const url = cyan(`curl -L lsalik.dev/blog/${post.slug}`);
    return box([topLine, post.description, tags, url], { width });
  });

  return [header, '', ...postBoxes].join('\n');
}

export function renderBlogPost(post: BlogPostFull, width: number = PAGE_WIDTH): string {
  const topLine = twoCol(bold(post.title), dim(post.date), width - 4);
  const meta = dim(
    `${post.tags.join(', ')} · ${post.readingMinutes} min read`,
  );
  const headerBox = box([topLine, meta], { title: post.title, width });

  const parts: string[] = [headerBox, '', post.content];

  if (post.prev || post.next) {
    parts.push('', hr(width));
    if (post.prev) {
      parts.push(
        ...fit(`${dim('← prev:')} ${post.prev.title}  ${cyan(`curl -L lsalik.dev/blog/${post.prev.slug}`)}`, width),
      );
    }
    if (post.next) {
      parts.push(
        ...fit(`${dim('→ next:')} ${post.next.title}  ${cyan(`curl -L lsalik.dev/blog/${post.next.slug}`)}`, width),
      );
    }
  }

  return parts.join('\n');
}

export function renderRSS(posts: BlogPostSummary[], width: number = PAGE_WIDTH): string {
  const header = sectionHeader('~/rss', width);
  const sub = dim('lsalik.dev — blog feed');

  if (posts.length === 0) {
    return [header, sub, '', box(['No posts yet.'], { width })].join('\n');
  }

  const postBoxes = posts.map(post => {
    const topLine = twoCol(bold(post.title), dim(post.date), width - 4);
    const url = cyan(`curl -L lsalik.dev/blog/${post.slug}`);
    return box([topLine, post.description, url], { width });
  });

  const footer = fit(dim('(xml: curl -L lsalik.dev/rss.xml from a browser UA)'), width);

  return [header, sub, '', ...postBoxes, '', hr(width), ...footer].join('\n');
}

export function renderProjectPost(project: ProjectPostFull, width: number = PAGE_WIDTH): string {
  const meta = `${dim(project.status)} · ${project.stack.join(' · ')}`;
  const headerLines = [bold(project.title), meta];
  if (project.active) headerLines.push(accentGreen(WORKING_ON));
  if (project.stats) headerLines.push(dim(project.stats));
  const headerBox = box(headerLines, { title: project.title, width });
  return [headerBox, '', project.content].join('\n');
}

export function renderProjectsIndex(projects: ProjectSummary[], width: number = PAGE_WIDTH): string {
  const header = sectionHeader('~/projects', width);

  const projectBoxes = projects.map(project => {
    const status = project.active
      ? `${accentGreen(WORKING_ON)}  ${amber(project.status)}`
      : amber(project.status);
    const topLine = twoCol(
      bold(blue(project.title)) + '  ' + dim(project.permissions),
      status,
      width - 4,
    );
    const stack = dim(project.stack.join(' · '));
    const repoLink = project.repo ? `${cyan('→')} ${project.repo}` : dim('→ closed source');
    const url = cyan(`curl -L lsalik.dev/projects/${project.slug}`);
    const lines = [topLine, project.description, stack];
    if (project.stats) lines.push(dim(project.stats));
    lines.push(repoLink, url);
    return box(lines, { width });
  });

  return [header, '', ...projectBoxes].join('\n');
}

export function renderContact(sections: readonly ContactSection[], width: number = PAGE_WIDTH): string {
  const header = sectionHeader('~/contact', width);

  const sectionBoxes = sections.map(section => {
    const links = section.links.map(link => `  ${link.label}  ${cyan(link.url)}`);
    return box(links, { title: section.heading, width });
  });

  return [header, '', ...sectionBoxes].join('\n');
}

export function renderResume(resume: Resume, width: number = PAGE_WIDTH): string {
  const inner = width - 4;

  const nameLines = [
    bold(titleBright(resume.name)),
    bodyWarm(`${resume.location}  |  ${resume.links.map(l => cyan(l.url)).join('  |  ')}`),
  ];
  const headerBox = box(nameLines, { title: '~/resume', width });

  const expHeader = sectionHeader('WORK EXPERIENCE', width);
  const expBoxes = resume.experience.map(job => {
    const topLine = twoCol(
      bold(job.title) + ', ' + accentMagenta(job.company) + dim(' — ' + job.location),
      bold(job.dates),
      inner,
    );
    const bullets = job.bullets.map(b => `  ${accentGreen('●')} ${bodyWarm(b)}`);
    return box([topLine, '', ...bullets], { width });
  });

  const eduHeader = sectionHeader('EDUCATION', width);
  const eduBoxes = resume.education.map(edu => {
    const topLine = bold(edu.degree) + ', ' + accentMagenta(edu.school);
    const bullets = edu.bullets.map(b => `  ${accentGreen('●')} ${bodyWarm(b)}`);
    return box([topLine, '', ...bullets], { width });
  });

  const skillsHeader = sectionHeader('SKILLS & LANGUAGES', width);
  const skillLines = resume.skills.map(cat =>
    `${bold(cat.label + ':')} ${bodyWarm(cat.items.join(', '))}`,
  );
  const skillsBox = box(skillLines, { width });

  const footer = fit(dim(`pdf: curl -LO lsalik.dev/resume.pdf`), width);

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
    hr(width),
    ...footer,
  ].join('\n');
}

// Mimic the three-column manpage header/footer:
//   LSALIK(1)              User Commands              LSALIK(1)
// `width` is the visible column count; left and right are pinned to the
// edges and `center` is centred in whatever space is left. If the three
// can't fit on one line we fall back to left + right with center under.
function manBar(left: string, center: string, right: string, width: number): string {
  const lw = visibleWidth(left);
  const cw = visibleWidth(center);
  const rw = visibleWidth(right);
  const minGap = 2;
  if (lw + cw + rw + minGap * 2 > width) {
    const filler = ' '.repeat(Math.max(0, width - lw - rw));
    return left + filler + right + '\n' + ' '.repeat(Math.max(0, Math.floor((width - cw) / 2))) + center;
  }
  const leftPad = Math.floor((width - cw) / 2) - lw;
  const rightPad = width - lw - leftPad - cw - rw;
  return left + ' '.repeat(Math.max(1, leftPad)) + center + ' '.repeat(Math.max(1, rightPad)) + right;
}

function renderManBlock(block: ManBlock, indent: number, contentWidth: number): string[] {
  const pad = ' '.repeat(indent);
  switch (block.type) {
    case 'prose': {
      const wrapped = wrap(block.text, contentWidth).split('\n');
      return wrapped.map(line => pad + bodyWarm(line));
    }
    case 'lines':
      return block.lines.flatMap(line => fit(line, contentWidth).map(l => pad + l));
    case 'definitions': {
      // Tagged paragraph style:
      //   term
      //          definition wrapped to content width
      const out: string[] = [];
      const termIndent = ' '.repeat(indent);
      const defIndent = ' '.repeat(indent + 7);
      const defWidth = Math.max(10, contentWidth - 7);
      for (const item of block.items) {
        out.push(termIndent + bold(item.term));
        const wrapped = wrap(item.def, defWidth).split('\n');
        for (const line of wrapped) out.push(defIndent + bodyWarm(line));
      }
      return out;
    }
  }
}

export function renderMan(man: Man, width: number = PAGE_WIDTH): string {
  const tag = `${man.name.toUpperCase()}(${man.section})`;
  const header = manBar(tag, man.category, tag, width);
  const footer = manBar(man.version, man.date, tag, width);

  const indent = 7;
  const contentWidth = width - indent;

  const out: string[] = [header, ''];
  for (const section of man.sections) {
    out.push(bold(titleBright(section.heading.toUpperCase())));
    for (let i = 0; i < section.blocks.length; i++) {
      if (i > 0) out.push('');
      out.push(...renderManBlock(section.blocks[i], indent, contentWidth));
    }
    out.push('');
  }
  out.push(footer);
  return out.join('\n');
}

export function renderUses(uses: Uses, width: number = PAGE_WIDTH): string {
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

  // Two-column layout: logo on the left, info on the right. A blank row leads
  // the box, then logo and info zip until the logo runs out; a second blank
  // row separates the logo from any info rows that overflow below it.
  const gap = '  ';
  const logoVisibleWidth = logoLines.reduce(
    (max, line) => Math.max(max, visibleWidth(line)),
    0,
  );
  const blankLogo = ' '.repeat(logoVisibleWidth);

  // Narrow terminals: logo on top, info underneath, so neither gets squeezed.
  if (width < USES_SIDE_BY_SIDE_MIN) {
    return box(['', ...logoLines, '', ...infoLines], { title: '~/uses', width });
  }

  const rows: string[] = [''];
  for (let r = 0; r < logoLines.length; r++) {
    rows.push(logoLines[r] + gap + (infoLines[r] ?? ''));
  }
  rows.push('');
  for (let r = logoLines.length; r < infoLines.length; r++) {
    rows.push(blankLogo + gap + infoLines[r]);
  }

  return box(rows, { title: '~/uses', width });
}

// The /ssh cats as in their photo: Raven sits beside Finch, bottoms aligned.
function sideBySide(): string[] {
  const finch = paintCat(FINCH, FINCH_MASK);
  const raven = paintCat(RAVEN, RAVEN_MASK);
  const finchWidth = Math.max(...FINCH.map(row => row.length));
  const offset = FINCH.length - RAVEN.length;
  return finch.map((row, i) => {
    const beside = i >= offset ? ' '.repeat(finchWidth - FINCH[i].length + 5) + raven[i - offset] : '';
    return '   ' + row + beside;
  });
}

// curl -L lsalik.dev/ssh — a hidden easter egg. Mimics an SSH login session
// whose message-of-the-day introduces the site's two "maintainers", Finch and
// Raven. Terminal-clients only; browsers hitting /ssh get the normal 404.
//
// The cat art is framed with `box(..., { wrap: false })` so its leading
// indentation survives (the default soft-wrap path strips it).
export function renderSsh(width: number = PAGE_WIDTH, maintainers: MaintainerLines = maintainerLines()): string {
  const banner = [
    `${green('$')} ssh guest@lsalik.dev`,
    dim("The authenticity of host 'lsalik.dev (104.21.0.7)' can't be established."),
    dim('ED25519 key fingerprint is SHA256:9faSn0w+ba11sm30wmix...bl3p'),
    amber("Warning: Permanently added 'lsalik.dev' to the list of known hosts."),
  ];

  // The box frames lines verbatim (wrap: false) to keep the art's indentation,
  // so the text lines are fitted to the inner width here instead.
  const inner = width - 4;
  const motd = box(
    [
      ...fit(`${bold(titleBright('Welcome to lsalik.dev'))}${dim('  —  last login: just now')}`, inner),
      '',
      ...sideBySide(),
      '',
      dim('the maintainers:'),
      ...fit(`  ${bold(cyan('finch'))}  ·  ${maintainers.finch}`, inner),
      ...fit(`  ${bold(cyan('raven'))}  ·  ${maintainers.raven}`, inner),
    ],
    { title: 'motd', wrap: false, width },
  );

  const footer = [
    '',
    ...fit(`${dim('hint: the rest of the site →')} ${cyan('curl -L lsalik.dev')}`, width),
    ...fit(dim('Connection to lsalik.dev closed.'), width),
  ];

  return [...banner.flatMap(line => fit(line, width)), '', motd, ...footer].join('\n');
}

// curl -L lsalik.dev/screensaver — the screensaver is browser-only; say so
// instead of serving the generic 404.
export function renderScreensaverNote(width: number = PAGE_WIDTH): string {
  return box(
    [
      dim('the screensaver is a browser thing — it runs the site background full-screen'),
      dim('with a clock and custom colours.'),
      '',
      `${dim('open')} ${cyan('https://lsalik.dev/screensaver')}`,
    ],
    { title: 'screensaver', width },
  );
}

// The terminal 404: what was asked for, and where to go instead.
// `safePath` must already be sanitized for the terminal by the caller.
export function renderNotFound(safePath: string, width: number = PAGE_WIDTH): string {
  const navLines = NAV_LINKS.map(link => `  curl -L lsalik.dev${link.href}`);
  return box(
    [
      red(`404: ${safePath} — not found`),
      '',
      'navigate:',
      '  curl -L lsalik.dev',
      ...navLines,
    ],
    { title: '404', width },
  );
}

// curl -L lsalik.dev/fortune — `fortune | cowsay`, with a cat. The bubble is
// sized to the fortune (capped at the terminal width) rather than always
// spanning the full width, so short lines stay compact.
export function renderFortune(fortune: string, width: number = PAGE_WIDTH): string {
  const bubbleWidth = Math.min(width, visibleWidth(fortune) + 4);
  const bubble = box([bodyWarm(fortune)], { width: Math.max(bubbleWidth, 12) });
  // The bubble's tail runs down-right into the cat's ear row.
  const cat = FORTUNE_CAT.map(line => ' '.repeat(8) + line);
  cat[0] = '    \\' + cat[0].slice(5);
  return [bubble, ...['   \\', ...cat].map(line => dim(line))].join('\n');
}
