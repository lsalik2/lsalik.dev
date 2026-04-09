import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    description: z.string(),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    stack: z.array(z.string()),
    status: z.string(),
    url: z.string().url().optional(),
    repo: z.string().url().optional(),
    description: z.string(),
    permissions: z.string().default('drwxr-xr-x'),
  }),
});

export const collections = { blog, projects };
