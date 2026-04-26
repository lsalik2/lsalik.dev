// src/lib/shortcuts.ts
//
// Pure state machine for the vim-style keyboard shortcut island. Kept
// DOM-free so it's testable in isolation. The island in
// src/islands/keyboard-shortcuts.ts owns the side effects (navigation,
// overlay show/hide, focus restore).

export type ChordLeader = 'g' | null;

export interface ChordState {
  readonly leader: ChordLeader;
  readonly leaderAt: number;
}

export type ChordAction =
  | { type: 'navigate'; href: string }
  | { type: 'toggle-help' }
  | { type: 'close-help' }
  | { type: 'none' };

export interface ChordResult {
  readonly next: ChordState;
  readonly action: ChordAction;
}

export const INITIAL_CHORD_STATE: ChordState = { leader: null, leaderAt: 0 };

export const CHORD_TIMEOUT_MS = 1500;

const G_BINDINGS: Readonly<Record<string, string>> = {
  h: '/',
  p: '/projects',
  b: '/blog',
  c: '/contact',
  u: '/uses',
};

const CLEARED: ChordState = INITIAL_CHORD_STATE;

export function resolveChord(
  state: ChordState,
  key: string,
  now: number,
  timeoutMs: number,
): ChordResult {
  // Special keys take precedence and always clear any pending leader.
  if (key === '?') {
    return { next: CLEARED, action: { type: 'toggle-help' } };
  }
  if (key === 'Escape') {
    return { next: CLEARED, action: { type: 'close-help' } };
  }

  // Treat an expired leader as never having been set.
  const leaderActive = state.leader === 'g' && now - state.leaderAt <= timeoutMs;
  const effective: ChordState = leaderActive ? state : CLEARED;

  if (effective.leader === 'g') {
    const href = G_BINDINGS[key];
    if (href) {
      return { next: CLEARED, action: { type: 'navigate', href } };
    }
    return { next: CLEARED, action: { type: 'none' } };
  }

  if (key === 'g') {
    return { next: { leader: 'g', leaderAt: now }, action: { type: 'none' } };
  }

  return { next: CLEARED, action: { type: 'none' } };
}
