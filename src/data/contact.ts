export interface ContactLink {
  readonly label: string;
  readonly url: string;
}

// ~/contact's links, in one list with no heading: esports moved to ~/fun, so there's nothing to separate.
export const CONTACT_LINKS: readonly ContactLink[] = [
  { label: 'GitHub', url: 'https://github.com/lsalik2' },
  { label: 'LinkedIn', url: 'https://linkedin.com/in/luis-salik' },
  { label: 'Discord User Link', url: 'https://discord.com/users/302198984238170113' },
] as const;
