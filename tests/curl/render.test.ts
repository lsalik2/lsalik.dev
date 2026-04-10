import { describe, it, expect } from 'vitest';
import {
  renderHome,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderResume,
  renderContact,
  renderAbout,
  renderProjectPost,
  type ContactSection,
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
  // same bytes a real `curl -L lsalik.dev` terminal client receives.
  // If these ever diverge, the dual-rendering contract is broken.
  it('is the single source of truth for the homepage curl demo', async () => {
    const demoSource = await import('node:fs').then(fs =>
      fs.readFileSync('src/islands/curl-demo.ts', 'utf8'),
    );
    expect(demoSource).toContain("import { renderHome } from '../curl/render'");
    expect(demoSource).toContain('renderHome()');
    // No private nav list allowed in the island.
    expect(demoSource).not.toContain("curl -L lsalik.dev/blog'");
    expect(demoSource).not.toContain("curl -L lsalik.dev/links");
  });

  it('lists all 5 nav paths in the curl output', () => {
    const out = stripAnsi(renderHome());
    expect(out).toContain('curl -L lsalik.dev/about');
    expect(out).toContain('curl -L lsalik.dev/projects');
    expect(out).toContain('curl -L lsalik.dev/blog');
    expect(out).toContain('curl -L lsalik.dev/resume');
    expect(out).toContain('curl -L lsalik.dev/contact');
    expect(out).not.toContain('curl -L lsalik.dev/sources');
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
  const sections: ContactSection[] = [
    {
      heading: 'professional',
      links: [{ label: 'GitHub', url: 'https://github.com/lsalik2' }],
    },
    {
      heading: 'esports',
      links: [{ label: 'Twitch', url: 'https://twitch.tv/test' }],
    },
  ];

  it('emits the ~/contact heading', () => {
    const out = stripAnsi(renderContact(sections));
    expect(out).toContain('~/contact');
  });

  it('includes section headings', () => {
    const out = stripAnsi(renderContact(sections));
    expect(out).toContain('professional');
    expect(out).toContain('esports');
  });

  it('includes link labels and urls', () => {
    const out = stripAnsi(renderContact(sections));
    expect(out).toContain('GitHub');
    expect(out).toContain('https://github.com/lsalik2');
    expect(out).toContain('Twitch');
  });
});

describe('renderAbout', () => {
  it('emits the ~/about heading and body text', () => {
    const out = stripAnsi(renderAbout('hi there'));
    expect(out).toContain('~/about');
    expect(out).toContain('hi there');
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

  it('includes the body content', () => {
    const out = stripAnsi(renderProjectPost(project));
    expect(out).toContain('Project README body.');
  });
});

