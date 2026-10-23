import { it, expect } from 'vitest';
import { CONTACT_LINKS } from '../../src/data/contact';

// One list with no heading: with esports on ~/fun, there's nothing left on ~/contact to separate.
it('lists the contact links on ~/contact without a section heading', () => {
  expect(CONTACT_LINKS.map(link => link.label)).toEqual(['GitHub', 'LinkedIn', 'Discord User Link']);
});
