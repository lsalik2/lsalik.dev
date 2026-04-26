// src/data/uses.ts
//
// Source-of-truth for the /uses page. Both the browser route
// (src/pages/uses.astro) and the curl renderer (renderUses in
// src/curl/render.ts) read from USES.

export interface UsesItem {
  readonly key: string;
  readonly value: string;
}

export interface UsesCategory {
  readonly heading: string;
  readonly items: readonly UsesItem[];
}

export interface Uses {
  readonly categories: readonly UsesCategory[];
}

// Placeholder values — edit before shipping.
export const USES: Uses = {
  categories: [
    {
      heading: 'system',
      items: [
        { key: 'os', value: 'Ubuntu 24.04 (WSL2)' },
        { key: 'kernel', value: '6.6 microsoft-standard' },
        { key: 'wm', value: 'i3' },
        { key: 'terminal', value: 'Windows Terminal' },
      ],
    },
    {
      heading: 'shell & editor',
      items: [
        { key: 'shell', value: 'bash' },
        { key: 'editor', value: 'neovim' },
        { key: 'multiplexer', value: 'tmux' },
      ],
    },
    {
      heading: 'languages',
      items: [
        { key: 'daily', value: 'TypeScript · Python · Rust' },
        { key: 'occasional', value: 'C · Go · Lua' },
      ],
    },
    {
      heading: 'tools',
      items: [
        { key: 'vcs', value: 'git' },
        { key: 'search', value: 'ripgrep · fd' },
        { key: 'browse', value: 'fzf · zoxide' },
      ],
    },
    {
      heading: 'fonts',
      items: [
        { key: 'ui', value: 'Roboto Mono' },
        { key: 'code', value: 'Loskeley Mono' },
      ],
    },
    {
      heading: 'hardware',
      items: [
        { key: 'laptop', value: 'TBD' },
        { key: 'keyboard', value: 'TBD' },
        { key: 'monitor', value: 'TBD' },
      ],
    },
  ],
};
