import { describe, it, expect } from 'vitest';
import {
  renderHome,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderResume,
  renderContact,
  renderAbout,
  renderSources,
} from '../../src/curl/render';
import type { BlogPostSummary, BlogPostFull, ProjectSummary } from '../../src/curl/render';

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[\d+m/g, '');
}

describe('renderHome', () => {
  it('contains ANSI escape codes', () => {
    const result = renderHome();
    expect(result).toContain('\x1b[');
  });

  it('contains lsalik.dev title', () => {
    const result = renderHome();
    expect(result).toContain('lsalik.dev');
  });

  // Drift guard: the homepage curl-demo island must stream the exact
  // same bytes a real `curl lsalik.dev` terminal client receives.
  // If these ever diverge, the dual-rendering contract is broken.
  it('is the single source of truth for the homepage curl demo', async () => {
    const demoSource = await import('node:fs').then(fs =>
      fs.readFileSync('src/islands/curl-demo.ts', 'utf8'),
    );
    expect(demoSource).toContain("import { renderHome } from '../curl/render'");
    expect(demoSource).toContain('renderHome()');
    // No private nav list allowed in the island.
    expect(demoSource).not.toContain("curl lsalik.dev/blog'");
    expect(demoSource).not.toContain("curl lsalik.dev/links");
  });

  it('lists all 6 nav paths in the curl output', () => {
    const out = stripAnsi(renderHome());
    expect(out).toContain('curl lsalik.dev/about');
    expect(out).toContain('curl lsalik.dev/projects');
    expect(out).toContain('curl lsalik.dev/blog');
    expect(out).toContain('curl lsalik.dev/resume');
    expect(out).toContain('curl lsalik.dev/contact');
    expect(out).toContain('curl lsalik.dev/sources');
  });

  it('does not still advertise the old /links path', () => {
    const out = stripAnsi(renderHome());
    expect(out).not.toContain('curl lsalik.dev/links');
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
});

describe('renderResume', () => {
  it('shows ~/resume header', () => {
    const result = renderResume('Resume content here.');
    expect(result).toContain('~/resume');
  });

  it('includes the content', () => {
    const result = renderResume('Resume content here.');
    expect(result).toContain('Resume content here.');
  });
});

describe('renderContact', () => {
  it('emits the ~/contact heading', () => {
    const out = stripAnsi(renderContact([{ label: 'GitHub', url: 'https://github.com/lsalik2' }]));
    expect(out).toContain('~/contact');
    expect(out).toContain('https://github.com/lsalik2');
  });

  it('includes link labels and urls', () => {
    const result = renderContact([{ label: 'GitHub', url: 'https://github.com/lsalik2' }]);
    expect(result).toContain('GitHub');
    expect(result).toContain('https://github.com/lsalik2');
  });
});

describe('renderAbout', () => {
  it('emits the ~/about heading and body text', () => {
    const out = stripAnsi(renderAbout('hi there'));
    expect(out).toContain('~/about');
    expect(out).toContain('hi there');
  });
});

describe('renderSources', () => {
  it('emits the ~/sources heading and body text', () => {
    const out = stripAnsi(renderSources('the body'));
    expect(out).toContain('~/sources');
    expect(out).toContain('the body');
  });
});
