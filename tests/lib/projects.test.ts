import { describe, it, expect } from 'vitest';
import { sortProjects } from '../../src/lib/projects';

const p = (id: string, date: string, active?: boolean) => ({ id, data: { date: new Date(date), active } });

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

  it('does not mutate the input', () => {
    const input = [p('a', '2020-01-01'), p('b', '2026-01-01')];
    sortProjects(input);
    expect(input.map(x => x.id)).toEqual(['a', 'b']);
  });
});
