// src/data/man.ts
//
// Source-of-truth for the /man page. Both the browser route
// (src/pages/man.astro) and the curl renderer (renderMan in
// src/curl/render.ts) read from MAN.
//
// Sections are modeled after a real Unix manual page (section 1, user
// commands): NAME / SYNOPSIS / DESCRIPTION / ROUTES / EXAMPLES /
// SHORTCUTS / SEE ALSO / AUTHOR.

export interface ManDefinition {
  readonly term: string;
  readonly def: string;
}

export type ManBlock =
  | { readonly type: 'prose'; readonly text: string }
  | { readonly type: 'definitions'; readonly items: readonly ManDefinition[] }
  | { readonly type: 'lines'; readonly lines: readonly string[] };

export interface ManSection {
  readonly heading: string;
  readonly blocks: readonly ManBlock[];
}

export interface Man {
  readonly name: string;
  readonly section: number;
  readonly category: string;
  readonly date: string;
  readonly version: string;
  readonly sections: readonly ManSection[];
}

export const MAN: Man = {
  name: 'lsalik',
  section: 1,
  category: 'User Commands',
  date: '2026-05-14',
  version: 'lsalik.dev 1.0',
  sections: [
    {
      heading: 'name',
      blocks: [
        {
          type: 'prose',
          text: 'lsalik — personal portfolio site, browsable in a terminal or a browser.',
        },
      ],
    },
    {
      heading: 'synopsis',
      blocks: [
        {
          type: 'lines',
          lines: [
            'curl -L lsalik.dev[/route]',
            'open  https://lsalik.dev[/route]',
          ],
        },
      ],
    },
    {
      heading: 'description',
      blocks: [
        {
          type: 'prose',
          text: 'lsalik.dev is a dual-rendered personal site built with Astro 6. Every route serves either ANSI-coloured plain text to terminal clients (curl, wget, httpie, fetch, libfetch) or a styled HTML page to graphical browsers. Content, navigation, and structure stay the same across both surfaces; only the chrome differs.',
        },
        {
          type: 'prose',
          text: 'The browser side is fully server-rendered, ships a handful of small TypeScript islands for interactive bits (palette switcher, keyboard shortcuts, blog filter), and otherwise behaves like a static site. No tracking, no analytics, no cookies.',
        },
      ],
    },
    {
      heading: 'routes',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: '/', def: 'home — landing page with logo, intro, and nav.' },
            { term: '/projects', def: 'projects index; each entry links to /projects/{slug}.' },
            { term: '/blog', def: 'blog index with a search bar and tag chips for client-side filtering.' },
            { term: '/blog/{slug}', def: 'individual blog post; rendered from markdown in src/content/blog.' },
            { term: '/uses', def: 'tools, software, and hardware. neofetch-style two-column layout under curl.' },
            { term: '/contact', def: 'contact links and channels.' },
            { term: '/resume', def: 'browsers redirect to /resume.pdf; curl receives the terminal resume.' },
            { term: '/man', def: 'this page.' },
            { term: '/rss.xml', def: 'RSS 2.0 feed of every published blog post.' },
          ],
        },
      ],
    },
    {
      heading: 'examples',
      blocks: [
        {
          type: 'lines',
          lines: [
            'curl -L lsalik.dev              # home page in your terminal',
            'curl -L lsalik.dev/blog         # list every blog post',
            'curl -L lsalik.dev/uses         # neofetch-style /uses page',
            'curl -LO lsalik.dev/resume.pdf  # download the resume',
            'curl -L lsalik.dev/man          # render this manual page',
          ],
        },
      ],
    },
    {
      heading: 'shortcuts',
      blocks: [
        {
          type: 'prose',
          text: 'In the browser, vim-style chord shortcuts navigate between top-level routes:',
        },
        {
          type: 'definitions',
          items: [
            { term: 'g h', def: 'go home' },
            { term: 'g p', def: 'go to projects' },
            { term: 'g b', def: 'go to blog' },
            { term: 'g u', def: 'go to uses' },
            { term: 'g c', def: 'go to contact' },
            { term: '?', def: 'toggle the keyboard shortcuts overlay' },
            { term: 'Esc', def: 'close the overlay' },
          ],
        },
      ],
    },
    {
      heading: 'see also',
      blocks: [
        {
          type: 'lines',
          lines: [
            'curl(1), wget(1), httpie(1)',
            'https://github.com/lsalik2/lsalik.dev',
          ],
        },
      ],
    },
    {
      heading: 'author',
      blocks: [
        {
          type: 'prose',
          text: 'Written by Luis Salik. Source at https://github.com/lsalik2/lsalik.dev.',
        },
      ],
    },
  ],
};
