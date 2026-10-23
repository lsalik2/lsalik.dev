import { describe, it, expect } from 'vitest';
import {
  renderHome,
  renderFun,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderContact,
  renderProjectPost,
  renderResume,
  renderSsh,
  renderScreensaverNote,
  renderFortune,
  type ContactLink,
} from '../../src/curl/render';
import type { BlogPostSummary, BlogPostFull, ProjectSummary } from '../../src/curl/render';
import { stripAnsi } from '../../src/curl/ansi';
import { RESUME } from '../../src/data/resume';
import { maintainerLines } from '../../src/data/maintainers';
import { FORTUNES } from '../../src/data/fortunes';
import { ART, artScene, artWidth } from '../../src/data/esports';

describe('renderHome', () => {
  it('contains ANSI escape codes', () => {
    const result = renderHome();
    expect(result).toContain('\x1b[');
  });

  it('contains lsalik.dev title', () => {
    const result = renderHome();
    expect(result).toContain('lsalik.dev');
  });

  it('ends after the nav and the source line, with no fortune (that moved to /fun)', () => {
    const plain = stripAnsi(renderHome());
    expect(plain).not.toContain('$ fortune');
    expect(plain.trimEnd().endsWith('source: https://github.com/lsalik2/lsalik.dev')).toBe(true);
  });

  // Drift guard: the homepage curl-demo island must stream the exact
  // same bytes a real `curl -L lsalik.dev` terminal client receives.
  // If these ever diverge, the dual-rendering contract is broken.
  it('is the single source of truth for the homepage curl demo', async () => {
    const demoSource = await import('node:fs').then(fs =>
      fs.readFileSync('src/islands/curl-demo.ts', 'utf8'),
    );
    expect(demoSource).toContain("import { renderHome } from '../curl/render'");
    expect(demoSource).toContain('renderHome(cols)'); // at the width that fits the box
    // No private nav list allowed in the island.
    expect(demoSource).not.toContain("curl -L lsalik.dev/blog'");
    expect(demoSource).not.toContain("curl -L lsalik.dev/links");
  });

  it('lists the current nav paths in the curl output', () => {
    const out = stripAnsi(renderHome());
    expect(out).toContain('curl -L lsalik.dev/');
    expect(out).toContain('curl -L lsalik.dev/projects');
    expect(out).toContain('curl -L lsalik.dev/blog');
    expect(out).toContain('curl -L lsalik.dev/contact');
    expect(out).not.toContain('curl -L lsalik.dev/sources');
    expect(out).not.toContain('curl -L lsalik.dev/about');
    expect(out).toContain('curl -L lsalik.dev/resume');
  });

  it('lists /fun in the nav, and not /man', () => {
    const plain = stripAnsi(renderHome());
    expect(plain).toContain('curl -L lsalik.dev/fun');
    expect(plain).not.toContain('curl -L lsalik.dev/man');
  });

  it('does not still advertise the old /links path', () => {
    const out = stripAnsi(renderHome());
    expect(out).not.toContain('curl -L lsalik.dev/links');
  });
});

describe('renderBlogIndex', () => {
  const posts: BlogPostSummary[] = [
    {
      slug: 'hello-world',
      title: 'Hello World',
      date: '2026-04-01',
      tags: ['dev', 'intro'],
      description: 'My first post.',
    },
  ];

  it('shows ~/blog header', () => {
    const result = renderBlogIndex(posts);
    expect(result).toContain('~/blog');
  });

  it('includes post title', () => {
    const result = renderBlogIndex(posts);
    expect(result).toContain('Hello World');
  });

  it('includes post date', () => {
    const result = renderBlogIndex(posts);
    expect(result).toContain('2026-04-01');
  });

  it('includes post tags', () => {
    const result = renderBlogIndex(posts);
    expect(result).toContain('dev');
  });

  it('shows No posts yet when empty', () => {
    const result = renderBlogIndex([]);
    expect(result).toContain('No posts yet.');
  });
});

describe('renderBlogPost', () => {
  const post: BlogPostFull = {
    title: 'Hello World',
    date: '2026-04-01',
    tags: ['dev'],
    content: 'This is the content of the post.',
    readingMinutes: 1,
  };

  it('includes the post title', () => {
    const result = renderBlogPost(post);
    expect(result).toContain('Hello World');
  });

  it('includes the post content', () => {
    const result = renderBlogPost(post);
    expect(result).toContain('This is the content of the post.');
  });

  it('includes the date', () => {
    const result = renderBlogPost(post);
    expect(result).toContain('2026-04-01');
  });
});

describe('renderProjectsIndex', () => {
  const projects: ProjectSummary[] = [
    {
      slug: 'lsalik-dev',
      title: 'lsalik.dev',
      date: '2026-03-15',
      stack: ['Astro', 'TypeScript'],
      status: 'Alpha',
      description: 'Terminal-inspired personal website.',
      permissions: 'drwxr-xr-x',
      repo: 'https://github.com/lsalik2/lsalik.dev',
    },
  ];

  it('includes permissions', () => {
    const result = renderProjectsIndex(projects);
    expect(result).toContain('drwxr-xr-x');
  });

  it('includes project title', () => {
    const result = renderProjectsIndex(projects);
    expect(result).toContain('lsalik.dev');
  });

  it('includes project status', () => {
    const result = renderProjectsIndex(projects);
    expect(result).toContain('Alpha');
  });

  it('includes repo link', () => {
    const result = renderProjectsIndex(projects);
    expect(result).toContain('https://github.com/lsalik2/lsalik.dev');
  });

  it('includes the stats line when provided', () => {
    const withStats: ProjectSummary[] = [{ ...projects[0], stats: '★ 42 · updated 3d ago' }];
    expect(stripAnsi(renderProjectsIndex(withStats))).toContain('★ 42 · updated 3d ago');
  });

  it('omits the star glyph when stats are absent', () => {
    expect(stripAnsi(renderProjectsIndex(projects))).not.toContain('★');
  });
});

describe('renderContact', () => {
  const links: ContactLink[] = [
    { label: 'GitHub', url: 'https://github.com/lsalik2' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/test' },
  ];

  it('emits the ~/contact heading', () => {
    const out = stripAnsi(renderContact(links));
    expect(out).toContain('~/contact');
  });

  it('puts every link in one box with no title, since there is nothing to separate', () => {
    const tops = stripAnsi(renderContact(links)).split('\n').filter(line => line.startsWith('┌'));
    expect(tops).toHaveLength(1);
    expect(tops[0]).toMatch(/^┌─+┐$/);
  });

  it('includes link labels and urls', () => {
    const out = stripAnsi(renderContact(links));
    expect(out).toContain('GitHub');
    expect(out).toContain('https://github.com/lsalik2');
    expect(out).toContain('LinkedIn');
  });
});

describe('renderResume', () => {
  it('renders the resume with box-drawing characters', () => {
    const result = renderResume(RESUME);
    expect(result).toMatch(/[┌┐└┘│─]/);
    expect(stripAnsi(result)).toContain('Luis Salik');
  });
});

describe('renderProjectPost', () => {
  const project = {
    title: 'My Project',
    status: 'Alpha',
    stack: ['Astro', 'TypeScript'],
    content: 'Project README body.',
  };

  it('includes the project title', () => {
    const out = stripAnsi(renderProjectPost(project));
    expect(out).toContain('My Project');
  });

  it('includes the status', () => {
    const out = stripAnsi(renderProjectPost(project));
    expect(out).toContain('Alpha');
  });

  it('includes every stack entry', () => {
    const out = stripAnsi(renderProjectPost(project));
    expect(out).toContain('Astro');
    expect(out).toContain('TypeScript');
  });

  it('includes the stats line when provided', () => {
    const out = stripAnsi(renderProjectPost({ ...project, stats: '★ 7 · updated 1w ago' }));
    expect(out).toContain('★ 7 · updated 1w ago');
  });

  it('includes the body content', () => {
    const out = stripAnsi(renderProjectPost(project));
    expect(out).toContain('Project README body.');
  });
});

describe('renderSsh', () => {
  it('contains ANSI escape codes', () => {
    expect(renderSsh()).toContain('\x1b[');
  });

  it('shows the fake ssh banner', () => {
    expect(stripAnsi(renderSsh())).toContain('ssh guest@lsalik.dev');
  });

  it('names both cats in the maintainers list', () => {
    const plain = stripAnsi(renderSsh());
    expect(plain).toContain('finch');
    expect(plain).toContain('raven');
  });

  it('closes the session', () => {
    expect(stripAnsi(renderSsh())).toContain('Connection to lsalik.dev closed.');
  });

  it('points the visitor back to the homepage', () => {
    expect(stripAnsi(renderSsh())).toContain('curl -L lsalik.dev');
  });

  it('shows the blep fingerprint', () => {
    const plain = stripAnsi(renderSsh());
    expect(plain).toContain('ED25519 key fingerprint is SHA256:9faSn0w+ba11sm30wmix...bl3p');
    expect(plain).not.toContain('purr');
  });

  it('shows the given maintainer descriptions', () => {
    const plain = stripAnsi(renderSsh(80, { finch: 'line for finch', raven: 'line for raven' }));
    expect(plain).toContain('finch  ·  line for finch');
    expect(plain).toContain('raven  ·  line for raven');
  });

  it("defaults to today's maintainer descriptions", () => {
    const today = maintainerLines();
    const plain = stripAnsi(renderSsh());
    expect(plain).toContain(`finch  ·  ${today.finch}`);
    expect(plain).toContain(`raven  ·  ${today.raven}`);
  });

  it('preserves the Finch art indentation through box(wrap:false)', () => {
    // Integration guard: if box() ever regresses on the wrap:false path,
    // the indentation that holds the cat art together would be stripped.
    const plain = stripAnsi(renderSsh());
    expect(plain).toContain('      /\\_____/\\');
  });
});

describe('renderScreensaverNote', () => {
  it('points terminal users to the browser page', () => {
    const plain = stripAnsi(renderScreensaverNote());
    expect(plain).toContain('screensaver');
    expect(plain).toContain('https://lsalik.dev/screensaver');
  });
});

describe('active projects ("working on")', () => {
  const base: ProjectSummary = {
    slug: 'finch', title: 'Finch', date: '2026-09-15', stack: ['Rust'], status: 'Alpha',
    description: 'A media player for the couch.', permissions: 'drwx------',
  };

  it('marks active projects in the projects index', () => {
    const out = stripAnsi(renderProjectsIndex([{ ...base, active: true }]));
    expect(out).toContain('● working on');
  });

  it('does not mark inactive projects', () => {
    const out = stripAnsi(renderProjectsIndex([base]));
    expect(out).not.toContain('working on');
  });

  it('marks an active project on its own page', () => {
    const out = stripAnsi(renderProjectPost({ title: 'Finch', status: 'Alpha', stack: ['Rust'], content: 'x', active: true }));
    expect(out).toContain('● working on');
  });
});

describe('renderFortune', () => {
  it('shows the fortune in a speech bubble with a cat', () => {
    const out = stripAnsi(renderFortune('Talk is cheap. Show me the diff.'));
    expect(out).toContain('Talk is cheap. Show me the diff.');
    expect(out).toContain('┌');
    expect(out).toContain('( o.o )');
  });

  it('sizes the bubble to a short fortune instead of the full width', () => {
    const top = stripAnsi(renderFortune('Measure twice, cut once.', 120)).split('\n').find(l => l.includes('┌'))!;
    expect([...top].length).toBeLessThan(40);
  });
});

describe('renderFun', () => {
  const FORTUNE = 'Clear is better than clever.';

  it('lists every extra with its command', () => {
    const plain = stripAnsi(renderFun(80, FORTUNE));
    expect(plain).toContain('~/fun');
    for (const s of [
      'curl -L lsalik.dev/fortune', 'a fortune, with a cat',
      'curl -L lsalik.dev/ssh', 'meet the maintainers',
      'curl -L lsalik.dev/man', "the site's man page",
      'lsalik.dev/screensaver', 'the screensaver (browser only)',
    ]) expect(plain).toContain(s);
  });

  it('lists them in the same order as the ~/fun page: the fortune, screensaver and man in ./play, then the commands in ./terminal', () => {
    const plain = stripAnsi(renderFun(80, FORTUNE));
    const at = (s: string) => plain.indexOf(s);
    expect(at('$ fortune')).toBeGreaterThan(at('./play'));
    expect(at('$ fortune')).toBeLessThan(at('lsalik.dev/screensaver'));
    expect(at('lsalik.dev/screensaver')).toBeLessThan(at('lsalik.dev/man'));
    expect(at('lsalik.dev/man')).toBeLessThan(at('./terminal'));
    expect(at('./terminal')).toBeLessThan(at('lsalik.dev/fortune'));
    expect(at('lsalik.dev/fortune')).toBeLessThan(at('lsalik.dev/ssh'));
  });

  it('puts each command and its description on one line when they fit', () => {
    expect(stripAnsi(renderFun(80, FORTUNE))).toMatch(/curl -L lsalik\.dev\/ssh +terminal only: meet the maintainers/);
  });

  it('stacks the description under the command on narrow terminals', () => {
    const lines = stripAnsi(renderFun(40, FORTUNE)).split('\n');
    const i = lines.findIndex(l => l.includes('curl -L lsalik.dev/ssh'));
    expect(lines[i]).not.toContain('meet the maintainers');
    expect(lines[i + 1]).toContain('meet the maintainers');
  });

  it('opens ./play with the given fortune and its cat', () => {
    const plain = stripAnsi(renderFun(80, FORTUNE));
    expect(plain).toContain('│ Clear is better than clever. │');
    expect(plain).toContain('( o.o )');
  });

  it('deals a fortune of its own by default', () => {
    const plain = stripAnsi(renderFun());
    expect(FORTUNES.some(f => plain.replace(/[│\s]+/g, ' ').includes(f))).toBe(true);
  });
});

describe('renderFun sections', () => {
  const plain = (w: number) => stripAnsi(renderFun(w, 'Talk is cheap. Show me the diff.'));
  it('lists ./play, ./terminal and ./esports in that order', () => {
    const out = plain(80);
    expect(out.indexOf('./play')).toBeGreaterThan(-1);
    expect(out.indexOf('./play')).toBeLessThan(out.indexOf('./terminal'));
    expect(out.indexOf('./terminal')).toBeLessThan(out.indexOf('./esports'));
  });
  // Computed from the art files, so these hold after Luis swaps the art.
  const sceneW = artWidth(artScene(ART.car, ART.ball));
  const carW = artWidth(ART.car);
  const carMark = [...ART.car].sort((a, b) => b.trim().length - a.trim().length)[0].trim();
  const ballMark = [...ART.ball].sort((a, b) => b.trim().length - a.trim().length)[0].trim();
  it('draws the car and the ball at the default 80 columns', () => {
    expect(plain(80)).toContain(carMark);
    expect(plain(80)).toContain(ballMark);
  });
  it('draws the scene from scene width + 4, the car alone just below, and no art below car width + 4', () => {
    expect(plain(sceneW + 4)).toContain(ballMark);
    expect(plain(sceneW + 3)).not.toContain(ballMark);
    expect(plain(sceneW + 3)).toContain(carMark);
    if (carW + 3 >= 40) expect(plain(carW + 3)).not.toContain(carMark);
  });
  it('keeps each career row on one line when it fits, and stacks it at 40', () => {
    expect(plain(80)).toMatch(/2021 – 2024\s+esports coordinator\s+university of illinois/);
    expect(plain(40)).not.toMatch(/2021 – 2024\s+esports coordinator/);
    expect(plain(40)).toContain('esports coordinator');
  });
  it('puts the tracker before the other esports links and drops the Discord server', () => {
    const out = plain(160);
    expect(out.indexOf('rocketleague.tracker.network')).toBeLessThan(out.indexOf('liquipedia.net'));
    expect(out).not.toContain('discord.gg');
  });
});
