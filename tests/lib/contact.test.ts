import { describe, it, expect } from 'vitest';
import { CONTACT_LINKS } from '../../src/data/contact';

describe('CONTACT_LINKS', () => {
  it('links Discord to the profile, which never expires like an invite can', () => {
    const discord = CONTACT_LINKS.find(link => link.label.startsWith('Discord'));
    expect(discord?.url).toMatch(/^https:\/\/discord\.com\/users\/\d+$/);
  });
});
