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
        { key: 'os', value: 'Gentoo Desktop 23.0' },
        { key: 'kernel', value: '7.0.1 gentoo-kernel' },
        { key: 'wm', value: 'sway' },
        { key: 'terminal', value: 'kitty' },
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
        { key: 'daily', value: 'Python · TypeScript · C · Java' },
        { key: 'occasional', value: 'Assembly · Rust · Lua · C++' },
      ],
    },
    {
      heading: 'tools',
      items: [
        { key: 'vcs', value: 'git' },
        { key: 'search', value: 'ripgrep · fd' },
        { key: 'browse', value: 'fzf · zoxide' },
        { key: 'monitor', value: 'btop' },
        { key: 'files', value: 'eza · bat · yazi' },
        { key: 'disk', value: 'dust' },
        { key: 'http', value: 'curl' },
        { key: 'media', value: 'ffmpeg · imagemagick' },
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
        { key: 'cpu', value: 'amd ryzen 7 7700' },
        { key: 'gpu', value: 'amd rx 7900 xtx' },
        { key: 'ram', value: '32GB DDR5-6000 g.skill f5' },
        { key: 'storage', value: '2TB samsung 980 pro + 2TB crucial p3 plus' },
        { key: 'motherboard', value: 'msi pro b650-p wifi proseries' },
        { key: 'psu', value: 'corsair rm850x gold' },
        { key: 'keyboard', value: 'custom keychron q1 max' },
        { key: 'monitor', value: 'gigabyte m28 (4k 144hz)' },
        { key: 'mouse', value: 'logitech g305' },
      ],
    },
  ],
};
