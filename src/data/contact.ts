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
  {
    heading: 'esports',
    links: [
      { label: 'Liquipedia', url: 'https://liquipedia.net/rocketleague/SLK' },
      { label: 'X', url: 'https://x.com/slkrl_' },
      { label: 'Twitch', url: 'https://twitch.tv/slkrl' },
      { label: 'YouTube', url: 'https://youtube.com/@slk-rl' },
      { label: 'Steam', url: 'https://steamcommunity.com/id/SlkRL' },
    ],
  },
] as const;
