import { it, expect } from 'vitest';
import { CONTACT_SECTIONS } from '../../src/data/contact';

it('keeps only the professional section on ~/contact', () => {
  expect(CONTACT_SECTIONS.map(s => s.heading)).toEqual(['professional']);
});
