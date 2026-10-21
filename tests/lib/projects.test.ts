import { describe, it, expect } from 'vitest';
import { sortProjects } from '../../src/lib/projects';

const p = (id: string, date: string, active?: boolean, order?: number) => ({ id, data: { date: new Date(date), active, order } });

describe('sortProjects', () => {
  it('puts active projects first, newest first within each group', () => {
    const sorted = sortProjects([
      p('old-idle', '2024-01-01'),
      p('new-idle', '2026-05-01'),
      p('old-active', '2025-01-01', true),
      p('new-active', '2026-09-01', true),
    ]);
    expect(sorted.map(x => x.id)).toEqual(['new-active', 'old-active', 'new-idle', 'old-idle']);
  });

  it('treats a missing active flag as inactive', () => {
    const sorted = sortProjects([p('a', '2026-01-01'), p('b', '2020-01-01', true)]);
    expect(sorted.map(x => x.id)).toEqual(['b', 'a']);
  });

  it('puts projects with an order first, lowest first, whatever their date or active flag', () => {
    const sorted = sortProjects([
      p('new-active', '2026-09-01', true),
      p('third', '2020-01-01', false, 3),
      p('first', '2024-01-01', false, 1),
      p('second', '2026-01-01', true, 2),
    ]);
    expect(sorted.map(x => x.id)).toEqual(['first', 'second', 'third', 'new-active']);
  });

  it('sorts projects without an order after the ordered ones, active first, newest first', () => {
    const sorted = sortProjects([
      p('old-idle', '2024-01-01'),
      p('new-active', '2026-09-01', true),
      p('ranked', '2020-01-01', false, 1),
      p('new-idle', '2026-05-01'),
    ]);
    expect(sorted.map(x => x.id)).toEqual(['ranked', 'new-active', 'new-idle', 'old-idle']);
  });

  it('does not mutate the input', () => {
    const input = [p('a', '2020-01-01'), p('b', '2026-01-01')];
    sortProjects(input);
    expect(input.map(x => x.id)).toEqual(['a', 'b']);
  });
});
