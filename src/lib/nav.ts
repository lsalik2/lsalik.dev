export interface NavLink {
  readonly href: string;
  readonly label: string;
  // True for routes that exist for terminal clients only — browsers reach
  // the same content through a different UI (e.g. /resume has a download
  // button on the homepage, so the nav doesn't need its own link).
  readonly terminalOnly?: boolean;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/', label: '~/home' },
  { href: '/projects', label: '~/projects' },
  { href: '/blog', label: '~/blog' },
  { href: '/contact', label: '~/contact' },
  { href: '/resume', label: '~/resume', terminalOnly: true },
] as const;

export const BROWSER_NAV_LINKS: readonly NavLink[] = NAV_LINKS.filter(
  link => !link.terminalOnly,
);
