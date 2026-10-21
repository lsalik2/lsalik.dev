// Previews for the ~/fun play cards: the man page's opening, a still frame of
// the background, and the screensaver's clock face. Pure, so the page renders
// them on the server and the clock island only refreshes the text.
import { renderMan } from '../curl/render';
import { stripAnsi } from '../curl/ansi';
import { MAN } from '../data/man';
import { LAYER_PHASES, PRESETS, renderLayers } from '../islands/ascii-bg';
import { formatTime, renderBigDigits } from './clock';

// The first `lines` lines of the man page as `curl /man` prints it.
export function manPreview(width: number, lines: number): string {
  return stripAnsi(renderMan(MAN, width))
    .split('\n')
    .slice(0, lines)
    .map(line => line.trimEnd())
    .join('\n');
}

// The preview samples a field this many times larger than the card, keeping
// every Nth cell, so it shows the texture of the full-screen background
// rather than one blown-up wave.
const FRAME_ZOOM = 4;
const FRAME_TIME = 20;

// One still frame of the site background's default (drift) pattern.
export function screensaverFrame(cols: number, rows: number): string {
  const field = renderLayers(cols * FRAME_ZOOM, rows * FRAME_ZOOM, FRAME_TIME, [LAYER_PHASES[0]], {
    field: PRESETS[0].field,
  }).layers[0].split('\n');
  return field
    .filter((_, y) => y % FRAME_ZOOM === 0)
    .map(line => [...line].filter((_, x) => x % FRAME_ZOOM === 0).join(''))
    .join('\n');
}

// The screensaver's default clock: block digits, 12-hour.
export function clockText(d: Date): string {
  return renderBigDigits(formatTime(d, false)).join('\n');
}
