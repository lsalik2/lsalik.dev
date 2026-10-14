import { describe, it, expect } from 'vitest';
import { nextPanelState, panelShowing, INITIAL_PANEL, type PanelState } from '../../src/lib/panel-visibility';

const shown: PanelState = INITIAL_PANEL;
const hidden = nextPanelState(shown, 'hide');

describe('panel visibility', () => {
  it('starts with the panel showing', () => {
    expect(panelShowing(INITIAL_PANEL)).toBe(true);
  });

  it('[hide] hides everything and dismisses the panel', () => {
    expect(hidden).toEqual({ idle: true, dismissed: true, pinned: false });
    expect(panelShowing(hidden)).toBe(false);
  });

  it('[hide] also unpins', () => {
    const pinned = nextPanelState(shown, 'toggle-pin');
    expect(nextPanelState(pinned, 'hide')).toEqual({ idle: true, dismissed: true, pinned: false });
  });

  it('after [hide], moving the mouse brings back the cursor but not the panel', () => {
    const moved = nextPanelState(hidden, 'activity');
    expect(moved.idle).toBe(false);
    expect(panelShowing(moved)).toBe(false);
  });

  it('after [hide], a click on the screen or a key brings the panel back', () => {
    expect(panelShowing(nextPanelState(hidden, 'screen-click'))).toBe(true);
    expect(panelShowing(nextPanelState(hidden, 'key'))).toBe(true);
  });

  it('a tap toggles the panel', () => {
    const tapped = nextPanelState(shown, 'screen-tap');
    expect(tapped).toEqual({ idle: true, dismissed: true, pinned: false });
    expect(panelShowing(nextPanelState(tapped, 'screen-tap'))).toBe(true);
  });

  it('a tap after the idle timeout shows the panel again', () => {
    const idle = nextPanelState(shown, 'timeout');
    expect(panelShowing(nextPanelState(idle, 'screen-tap'))).toBe(true);
  });

  it('a tap hides a pinned panel too, and unpins it', () => {
    const pinned = nextPanelState(shown, 'toggle-pin');
    expect(nextPanelState(pinned, 'screen-tap')).toEqual({ idle: true, dismissed: true, pinned: false });
  });

  it('the idle timeout hides everything unless pinned, without dismissing', () => {
    expect(nextPanelState(shown, 'timeout')).toEqual({ idle: true, dismissed: false, pinned: false });
    const pinned = nextPanelState(shown, 'toggle-pin');
    expect(nextPanelState(pinned, 'timeout')).toEqual(pinned);
  });

  it('after the idle timeout, moving the mouse shows the panel again (as before)', () => {
    const idle = nextPanelState(shown, 'timeout');
    expect(panelShowing(nextPanelState(idle, 'activity'))).toBe(true);
  });

  it('Esc closes the panel without dismissing it (as before)', () => {
    const closed = nextPanelState(shown, 'close');
    expect(closed).toEqual({ idle: true, dismissed: false, pinned: false });
    expect(panelShowing(nextPanelState(closed, 'activity'))).toBe(true);
  });

  it('pinning shows the panel and clears a dismissal; unpinning keeps it showing', () => {
    const pinned = nextPanelState(hidden, 'toggle-pin');
    expect(pinned).toEqual({ idle: false, dismissed: false, pinned: true });
    expect(nextPanelState(pinned, 'toggle-pin')).toEqual({ idle: false, dismissed: false, pinned: false });
  });
});
