import { describe, it, expect } from 'vitest';
import { CONTACT_SECTIONS } from '../../src/data/contact';

describe('CONTACT_SECTIONS', () => {
  it('links the professional Discord to the profile, which never expires like an invite can', () => {
    const professional = CONTACT_SECTIONS.find(section => section.heading === 'professional');
    const discord = professional?.links.find(link => link.label.startsWith('Discord'));
    expect(discord?.url).toMatch(/^https:\/\/discord\.com\/users\/\d+$/);
  });
});
