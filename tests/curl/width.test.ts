import { describe, it, expect } from 'vitest';
import {
  renderHome,
  renderFun,
  renderBlogIndex,
  renderBlogPost,
  renderRSS,
  renderProjectsIndex,
  renderProjectPost,
  renderContact,
  renderResume,
  renderMan,
  renderUses,
  renderSsh,
  renderScreensaverNote,
  renderNotFound,
  renderFortune,
  type BlogPostSummary,
  type ProjectSummary,
} from '../../src/curl/render';
import { visibleWidth } from '../../src/curl/ansi';
import { RESUME } from '../../src/data/resume';
import { USES } from '../../src/data/uses';
import { MAN } from '../../src/data/man';
import { CONTACT_LINKS } from '../../src/data/contact';

const posts: BlogPostSummary[] = [
  {
    slug: 'a-screensaver-an-ssh-easter-egg-and-the-rest-of-the-roadmap',
    title: 'A screensaver, an /ssh easter egg, and the rest of the roadmap',
    date: '2026-10-09',
    tags: ['meta', 'webdev', 'curl'],
    description: 'Pagination, a curl-only /ssh login with the cats, a new logo on every curl, three new background patterns, and a full-screen screensaver mode.',
  },
];

const projects: ProjectSummary[] = [
  {
    slug: 'flipper-animation-switcher',
    title: 'Flipper Animation Switcher',
    date: '2026-02-18',
    stack: ['C', 'Flipper Zero SDK'],
    status: 'Released',
    description: 'A Flipper Zero application for creating, managing, and switching which background animations play on your Flipper.',
    permissions: '-rwxr-xr-x',
    repo: 'https://github.com/lsalik2/FlipperAnimationSwitcher',
    stats: '★ 12 · updated 3d ago',
    active: true,
  },
  {
    slug: 'synergy',
    title: 'Synergy',
    date: '2025-05-06',
    stack: ['Java', 'Fabric Mod Loader'],
    status: 'Concept',
    description: 'Synergy is a combat-focused magic mod for Minecraft currently in development, using Fabric.',
    permissions: 'drwx------',
  },
];

// Post and project bodies are raw markdown that terminals soft-wrap
// themselves, so they're kept short here; everything else is framed output.
const VIEWS: Record<string, (w: number) => string> = {
  home: w => renderHome(w),
  blogIndex: w => renderBlogIndex(posts, w),
  blogPost: w => renderBlogPost({
    title: posts[0].title, date: posts[0].date, tags: posts[0].tags, content: 'Short body.', readingMinutes: 10,
    prev: { slug: posts[0].slug, title: posts[0].title }, next: { slug: 'hello-world', title: 'Hello, World!' },
  }, w),
  rss: w => renderRSS(posts, w),
  projectsIndex: w => renderProjectsIndex(projects, w),
  projectPost: w => renderProjectPost({ title: projects[0].title, status: 'Released', stack: projects[0].stack, content: 'Short body.', stats: projects[0].stats, active: true }, w),
  contact: w => renderContact(CONTACT_LINKS, w),
  resume: w => renderResume(RESUME, w),
  man: w => renderMan(MAN, w),
  uses: w => renderUses(USES, w),
  ssh: w => renderSsh(w),
  screensaver: w => renderScreensaverNote(w),
  notFound: w => renderNotFound('/some/missing/page', w),
  fun: w => renderFun(w, 'Premature optimization is the root of all evil. Weekend optimization is a hobby.'),
  fortune: w => renderFortune('Premature optimization is the root of all evil. Weekend optimization is a hobby.', w),
};

describe('width-aware terminal output', () => {
  for (const width of [40, 80, 120]) {
    for (const [name, view] of Object.entries(VIEWS)) {
      it(`${name} fits in ${width} columns`, () => {
        const lines = view(width).split('\n');
        const over = lines
          .map((line, i) => ({ i, w: visibleWidth(line), line }))
          .filter(x => x.w > width);
        expect(over, over.map(o => `line ${o.i} (${o.w} cols): ${o.line}`).join('\n')).toEqual([]);
      });
    }
  }

  it('uses the full width for framed views (boxes span the requested width)', () => {
    for (const width of [40, 120]) {
      const top = renderBlogIndex(posts, width).split('\n').find(l => l.includes('┌'))!;
      expect(visibleWidth(top)).toBe(width);
    }
  });

  it('defaults to 80 columns', () => {
    const top = renderBlogIndex(posts).split('\n').find(l => l.includes('┌'))!;
    expect(visibleWidth(top)).toBe(80);
  });
});
