export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/', label: '~/' },
  { href: '/projects', label: '~/projects' },
  { href: '/blog', label: '~/blog' },
  { href: '/resume', label: '~/resume' },
  { href: '/contact', label: '~/contact' },
] as const;
