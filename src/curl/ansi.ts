// ANSI SGR helpers for the curl terminal renderer.
//
// Two palettes live here:
//   - Classic 8-color codes (30-37) kept for accent use across existing routes.
//   - 256-color helpers (38;5;N) used by the new box-drawing / layout chrome to
//     give the output a cohesive, softer look. Color numbers chosen to match
//     the ysap.sh reference palette.
//
// Every helper resets only the dimension it set (weight, fg color) rather
// than emitting a full reset so wrappers can nest without bleeding.

export function bold(text: string): string {
  return `\x1b[1m${text}\x1b[22m`;
}

export function dim(text: string): string {
  return `\x1b[2m${text}\x1b[22m`;
}

export function underline(text: string): string {
  return `\x1b[4m${text}\x1b[24m`;
}

export function green(text: string): string {
  return `\x1b[32m${text}\x1b[39m`;
}

export function blue(text: string): string {
  return `\x1b[34m${text}\x1b[39m`;
}

export function amber(text: string): string {
  return `\x1b[33m${text}\x1b[39m`;
}

export function red(text: string): string {
  return `\x1b[31m${text}\x1b[39m`;
}

export function cyan(text: string): string {
  return `\x1b[36m${text}\x1b[39m`;
}

export function reset(): string {
  return '\x1b[0m';
}

// 256-color palette helpers. Numbers match ysap.sh's reference palette.
export function borderDim(text: string): string {
  return `\x1b[38;5;241m${text}\x1b[39m`;
}

export function titleBright(text: string): string {
  return `\x1b[38;5;87m${text}\x1b[39m`;
}

export function bodyWarm(text: string): string {
  return `\x1b[38;5;223m${text}\x1b[39m`;
}

export function accentMagenta(text: string): string {
  return `\x1b[38;5;211m${text}\x1b[39m`;
}

export function accentGreen(text: string): string {
  return `\x1b[38;5;120m${text}\x1b[39m`;
}

// Matches any SGR sequence: ESC [ <params> m, where params is digits
// optionally separated by semicolons (covers `31m`, `38;5;87m`, `0m`, etc).
const ANSI_SGR_RE = /\x1b\[[\d;]*m/g;

// Strip every SGR escape from a string. Used when measuring visible width
// or asserting plain-text content in tests.
export function stripAnsi(text: string): string {
  return text.replace(ANSI_SGR_RE, '');
}

// Remove dangerous ANSI escape sequences from untrusted content (e.g. content
// collection body / description fields) while preserving SGR colour/style codes
// that the terminal renderer emits intentionally.
//
// Sequences removed:
//   - OSC strings: ESC ] ... BEL  or  ESC ] ... ESC \  (hyperlinks, iTerm2 1337, etc.)
//   - Non-SGR CSI: ESC [ ... <final-byte>  where final-byte is not 'm'
//     (cursor moves, screen clears, alt-screen, etc.)
//   - Two-character ESC sequences: ESC + single non-'['/non-']' byte
//     (e.g. ESC c = full reset, ESC 7/8 = save/restore cursor)
//   - Lone ESC bytes that aren't part of any recognised sequence
//
// SGR sequences (ESC [ <digits/semicolons> m) are passed through unchanged.
export function stripDangerousEscapes(text: string): string {
  // 1. OSC sequences: ESC ] ... BEL  or  ESC ] ... ST (ESC \)
  // eslint-disable-next-line no-control-regex
  let out = text.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '');
  // 2. Non-SGR CSI: ESC [ followed by parameter bytes, ending in a final byte
  //    that is NOT 'm'. This preserves ESC[...m (SGR) intact.
  // eslint-disable-next-line no-control-regex
  out = out.replace(/\x1b\[[\d;?]*[A-Za-ln-z@`[\]^_{|}~]/g, '');
  // 3. Two-character ESC sequences (ESC + one byte that isn't '[' or ']').
  // eslint-disable-next-line no-control-regex
  out = out.replace(/\x1b[^\[\]]/g, '');
  // 4. Any remaining lone ESC that isn't starting an SGR (ESC[...m).
  //    ESC followed by '[' is left intact here; it only survives to this point
  //    if it's part of an SGR sequence (step 2 already consumed non-SGR CSI).
  // eslint-disable-next-line no-control-regex
  out = out.replace(/\x1b(?!\[)/g, '');
  return out;
}

// Count the visible (printable) character width of a string, ignoring any
// ANSI escape sequences. Box-drawing glyphs, bullets, etc. still count as one
// column each — that's correct for the Unicode chars this renderer uses.
export function visibleWidth(text: string): number {
  return stripAnsi(text).length;
}
