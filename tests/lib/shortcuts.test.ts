import { describe, it, expect } from 'vitest';
import { resolveChord, INITIAL_CHORD_STATE, CHORD_TIMEOUT_MS } from '../../src/lib/shortcuts';

const TIMEOUT = CHORD_TIMEOUT_MS;

describe('resolveChord', () => {
  it('sets leader on first `g`', () => {
    const result = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    expect(result.next.leader).toBe('g');
    expect(result.next.leaderAt).toBe(1000);
    expect(result.action).toEqual({ type: 'none' });
  });

  it('navigates home on `g` then `h` within timeout', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_h = resolveChord(after_g.next, 'h', 1500, TIMEOUT);
    expect(after_h.action).toEqual({ type: 'navigate', href: '/' });
    expect(after_h.next.leader).toBeNull();
  });

  it('navigates to /blog on `g` then `b`', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_b = resolveChord(after_g.next, 'b', 1500, TIMEOUT);
    expect(after_b.action).toEqual({ type: 'navigate', href: '/blog' });
  });

  it('navigates to /projects on `g` then `p`', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_p = resolveChord(after_g.next, 'p', 1500, TIMEOUT);
    expect(after_p.action).toEqual({ type: 'navigate', href: '/projects' });
  });

  it('navigates to /contact on `g` then `c`', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_c = resolveChord(after_g.next, 'c', 1500, TIMEOUT);
    expect(after_c.action).toEqual({ type: 'navigate', href: '/contact' });
  });

  it('navigates to /uses on `g` then `u`', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_u = resolveChord(after_g.next, 'u', 1500, TIMEOUT);
    expect(after_u.action).toEqual({ type: 'navigate', href: '/uses' });
  });

  it('clears leader and emits none on `g` then unmapped key', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_x = resolveChord(after_g.next, 'x', 1500, TIMEOUT);
    expect(after_x.next.leader).toBeNull();
    expect(after_x.action).toEqual({ type: 'none' });
  });

  it('expires the leader if the second key arrives after the timeout', () => {
    const after_g = resolveChord(INITIAL_CHORD_STATE, 'g', 1000, TIMEOUT);
    const after_h = resolveChord(after_g.next, 'h', 1000 + TIMEOUT + 1, TIMEOUT);
    expect(after_h.action).toEqual({ type: 'none' });
    expect(after_h.next.leader).toBeNull();
  });

  it('toggles help on `?` regardless of leader state', () => {
    const without_leader = resolveChord(INITIAL_CHORD_STATE, '?', 1000, TIMEOUT);
    expect(without_leader.action).toEqual({ type: 'toggle-help' });

    const with_leader = resolveChord({ leader: 'g', leaderAt: 1000 }, '?', 1500, TIMEOUT);
    expect(with_leader.action).toEqual({ type: 'toggle-help' });
    expect(with_leader.next.leader).toBeNull();
  });

  it('closes help on Escape', () => {
    const result = resolveChord(INITIAL_CHORD_STATE, 'Escape', 1000, TIMEOUT);
    expect(result.action).toEqual({ type: 'close-help' });
  });

  it('Escape also clears any pending leader', () => {
    const result = resolveChord({ leader: 'g', leaderAt: 1000 }, 'Escape', 1500, TIMEOUT);
    expect(result.next.leader).toBeNull();
    expect(result.action).toEqual({ type: 'close-help' });
  });

  it('emits none for an unmapped key with no leader', () => {
    const result = resolveChord(INITIAL_CHORD_STATE, 'a', 1000, TIMEOUT);
    expect(result.action).toEqual({ type: 'none' });
    expect(result.next.leader).toBeNull();
  });
});
