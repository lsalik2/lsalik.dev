export interface ContactLink {
  readonly label: string;
  readonly url: string;
}

export interface ContactSection {
  readonly heading: string;
  readonly links: readonly ContactLink[];
}

export const CONTACT_SECTIONS: readonly ContactSection[] = [
  {
    heading: 'professional',
    links: [
      { label: 'GitHub', url: 'https://github.com/lsalik2' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/luis-salik' },
      { label: 'Discord User Link', url: 'https://discord.com/users/302198984238170113' },
    ],
  },
] as const;
