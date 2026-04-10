export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/', label: '~/home' },
  { href: '/projects', label: '~/projects' },
  { href: '/blog', label: '~/blog' },

  { href: '/contact', label: '~/contact' },
] as const;
