import { describe, it, expect } from 'vitest';
import {
  renderHome,
  renderBlogIndex,
  renderBlogPost,
  renderProjectsIndex,
  renderResume,
  renderLinks,
} from '../../src/curl/render';
import type { BlogPostSummary, BlogPostFull, ProjectSummary } from '../../src/curl/render';

describe('renderHome', () => {
  it('contains ANSI escape codes', () => {
    const result = renderHome();
    expect(result).toContain('\x1b[');
  });

  it('contains navigation hints', () => {
    const result = renderHome();
    expect(result).toContain('curl lsalik.dev/blog');
  });

  it('contains lsalik.dev title', () => {
    const result = renderHome();
    expect(result).toContain('lsalik.dev');
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

describe('renderLinks', () => {
  it('shows ~/links header', () => {
    const result = renderLinks([{ label: 'GitHub', url: 'https://github.com/lsalik2' }]);
    expect(result).toContain('~/links');
  });

  it('includes link labels and urls', () => {
    const result = renderLinks([{ label: 'GitHub', url: 'https://github.com/lsalik2' }]);
    expect(result).toContain('GitHub');
    expect(result).toContain('https://github.com/lsalik2');
  });
});
