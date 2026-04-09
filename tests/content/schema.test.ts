import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const blogSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()),
  description: z.string(),
  draft: z.boolean().default(false),
});

const projectSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  stack: z.array(z.string()),
  status: z.string(),
  url: z.string().url().optional(),
  repo: z.string().url().optional(),
  description: z.string(),
  permissions: z.string().default('drwxr-xr-x'),
});

describe('blog schema', () => {
  it('validates a complete blog entry', () => {
    const result = blogSchema.safeParse({
      title: 'Test Post',
      date: '2026-04-01',
      tags: ['test', 'dev'],
      description: 'A test blog post.',
      draft: false,
    });
    expect(result.success).toBe(true);
  });

  it('defaults draft to false', () => {
    const result = blogSchema.safeParse({
      title: 'Test',
      date: '2026-04-01',
      tags: [],
      description: 'Test.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.draft).toBe(false);
    }
  });

  it('rejects missing title', () => {
    const result = blogSchema.safeParse({
      date: '2026-04-01',
      tags: [],
      description: 'Test.',
    });
    expect(result.success).toBe(false);
  });
});

describe('project schema', () => {
  it('validates a complete project entry', () => {
    const result = projectSchema.safeParse({
      title: 'lsalik.dev',
      date: '2026-03-15',
      stack: ['Astro', 'TypeScript', 'Vercel'],
      status: 'Alpha',
      url: 'https://lsalik.dev',
      repo: 'https://github.com/lsalik2/lsalik.dev',
      description: 'Terminal-inspired personal website.',
      permissions: 'drwxr-xr-x',
    });
    expect(result.success).toBe(true);
  });

  it('allows optional url', () => {
    const result = projectSchema.safeParse({
      title: 'slkards',
      date: '2026-01-20',
      stack: ['Python'],
      status: 'Live',
      repo: 'https://github.com/lsalik2/slkards',
      description: 'Discord-based TCG bot.',
    });
    expect(result.success).toBe(true);
  });

  it('allows omitting repo for closed-source projects', () => {
    const result = projectSchema.safeParse({
      title: 'slkards',
      date: '2026-01-20',
      stack: ['Python'],
      status: 'Beta',
      url: 'https://slkards.wiki',
      description: 'Discord-based TCG bot.',
    });
    expect(result.success).toBe(true);
  });

  it('defaults permissions to drwxr-xr-x', () => {
    const result = projectSchema.safeParse({
      title: 'Test',
      date: '2026-01-01',
      stack: [],
      status: 'Live',
      repo: 'https://github.com/test/test',
      description: 'Test.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permissions).toBe('drwxr-xr-x');
    }
  });
});
