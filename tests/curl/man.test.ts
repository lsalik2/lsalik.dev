import { describe, it, expect } from 'vitest';
import { renderMan } from '../../src/curl/render';
import { stripAnsi } from '../../src/curl/ansi';
import { MAN, type Man } from '../../src/data/man';
import { PAGE_WIDTH } from '../../src/curl/box';

const FIXTURE: Man = {
  name: 'demo',
  section: 1,
  category: 'Test Manual',
  date: '2026-01-02',
  version: 'demo.dev 0.1',
  sections: [
    {
      heading: 'name',
      blocks: [{ type: 'prose', text: 'demo — example page used in tests.' }],
    },
    {
      heading: 'synopsis',
      blocks: [{ type: 'lines', lines: ['demo [arg]', 'demo --help'] }],
    },
    {
      heading: 'options',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: '-a', def: 'first option, described briefly.' },
            { term: '-b', def: 'second option, described briefly.' },
          ],
        },
      ],
    },
  ],
};

describe('renderMan', () => {
  it('emits ANSI escape codes', () => {
    expect(renderMan(FIXTURE)).toContain('\x1b[');
  });

  it('contains a header and footer with the NAME(section) tag', () => {
    const out = stripAnsi(renderMan(FIXTURE));
    const lines = out.split('\n');
    expect(lines[0]).toContain('DEMO(1)');
    expect(lines[lines.length - 1]).toContain('DEMO(1)');
  });

  it('renders the category in the header bar', () => {
    const out = stripAnsi(renderMan(FIXTURE));
    expect(out.split('\n')[0]).toContain('Test Manual');
  });

  it('renders the version and date in the footer bar', () => {
    const out = stripAnsi(renderMan(FIXTURE));
    const last = out.split('\n').slice(-1)[0];
    expect(last).toContain('demo.dev 0.1');
    expect(last).toContain('2026-01-02');
  });

  it('renders every section heading uppercased', () => {
    const out = stripAnsi(renderMan(FIXTURE));
    for (const section of FIXTURE.sections) {
      expect(out).toContain(section.heading.toUpperCase());
    }
  });

  it('renders prose blocks word-by-word', () => {
    const out = stripAnsi(renderMan(FIXTURE));
    expect(out).toContain('example page used in tests');
  });

  it('renders lines blocks verbatim', () => {
    const out = stripAnsi(renderMan(FIXTURE));
    expect(out).toContain('demo [arg]');
    expect(out).toContain('demo --help');
  });

  it('renders definitions with term and def', () => {
    const out = stripAnsi(renderMan(FIXTURE));
    expect(out).toContain('-a');
    expect(out).toContain('first option, described briefly.');
    expect(out).toContain('-b');
    expect(out).toContain('second option, described briefly.');
  });

  it('keeps every line within PAGE_WIDTH columns', () => {
    for (const source of [FIXTURE, MAN]) {
      const out = stripAnsi(renderMan(source));
      for (const line of out.split('\n')) {
        expect(line.length).toBeLessThanOrEqual(PAGE_WIDTH);
      }
    }
  });

  it('renders the real MAN fixture without throwing and contains key sections', () => {
    const out = stripAnsi(renderMan(MAN));
    expect(out).toContain('LSALIK(1)');
    expect(out).toContain('NAME');
    expect(out).toContain('SYNOPSIS');
    expect(out).toContain('DESCRIPTION');
    expect(out).toContain('ROUTES');
    expect(out).toContain('EXAMPLES');
    expect(out).toContain('SEE ALSO');
    expect(out).toContain('AUTHOR');
  });
});
