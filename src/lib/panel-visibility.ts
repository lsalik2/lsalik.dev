// Screensaver panel visibility. Pure: the island turns pointer, key and timer
// events into PanelEvents and applies the resulting state to the page.
//
//   idle       nothing on screen: no cursor, no [fullscreen], no panel
//   dismissed  the panel stays hidden even when not idle ([hide], or a tap)
//   pinned     the panel never auto-hides (the h key)

export interface PanelState {
  readonly idle: boolean;
  readonly dismissed: boolean;
  readonly pinned: boolean;
}

export type PanelEvent =
  | 'activity'     // keeps things awake: a mouse move, or a press on a control
  | 'screen-click' // a mouse click on the screensaver itself, not a control
  | 'screen-tap'   // a touch tap on the screensaver itself, not a control
  | 'key'          // any key except Esc
  | 'hide'         // the [hide] button
  | 'close'        // Esc with the panel open
  | 'timeout'      // no input for a while (the island checks hover and focus)
  | 'toggle-pin';

export const INITIAL_PANEL: PanelState = { idle: false, dismissed: false, pinned: false };

export function panelShowing(s: PanelState): boolean {
  return !s.idle && !s.dismissed;
}

export function nextPanelState(s: PanelState, e: PanelEvent): PanelState {
  switch (e) {
    case 'activity':
      // Brings back the cursor and [fullscreen]; a dismissed panel stays hidden.
      return { ...s, idle: false };
    case 'screen-click':
    case 'key':
      return { ...s, idle: false, dismissed: false };
    case 'screen-tap':
      return panelShowing(s)
        ? { idle: true, dismissed: true, pinned: false }
        : { ...s, idle: false, dismissed: false };
    case 'hide':
      return { idle: true, dismissed: true, pinned: false };
    case 'close':
      return { ...s, idle: true, pinned: false };
    case 'timeout':
      return s.pinned ? s : { ...s, idle: true };
    case 'toggle-pin':
      return s.pinned
        ? { ...s, idle: false, pinned: false }
        : { idle: false, dismissed: false, pinned: true };
  }
}
