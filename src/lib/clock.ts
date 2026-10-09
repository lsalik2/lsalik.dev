// Clock text for the screensaver: time/date formatting, a 5-row block font
// for the big digital clock, and a per-minute drift so a static clock never
// burns into an OLED panel. Pure; the clock layer owns timers and the DOM.

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function formatTime(d: Date, h24: boolean): string {
  const h = d.getHours();
  const m = pad(d.getMinutes());
  if (h24) return `${pad(h)}:${m}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Each glyph is 5 rows; widths vary per glyph but are constant within one.
export const BIG_FONT: Readonly<Record<string, readonly string[]>> = {
  '0': ['████', '█  █', '█  █', '█  █', '████'],
  '1': ['  █ ', ' ██ ', '  █ ', '  █ ', ' ███'],
  '2': ['████', '   █', '████', '█   ', '████'],
  '3': ['████', '   █', ' ███', '   █', '████'],
  '4': ['█  █', '█  █', '████', '   █', '   █'],
  '5': ['████', '█   ', '████', '   █', '████'],
  '6': ['████', '█   ', '████', '█  █', '████'],
  '7': ['████', '   █', '  █ ', ' █  ', ' █  '],
  '8': ['████', '█  █', '████', '█  █', '████'],
  '9': ['████', '█  █', '████', '   █', '████'],
  ':': [' ', '█', ' ', '█', ' '],
  ' ': ['  ', '  ', '  ', '  ', '  '],
  'A': [' ██ ', '█  █', '████', '█  █', '█  █'],
  'P': ['███ ', '█  █', '███ ', '█   ', '█   '],
  'M': ['█   █', '██ ██', '█ █ █', '█   █', '█   █'],
};

export function renderBigDigits(text: string): string[] {
  const rows = ['', '', '', '', ''];
  [...text].forEach((ch, i) => {
    const glyph = BIG_FONT[ch];
    if (!glyph) throw new Error(`clock font has no glyph for ${JSON.stringify(ch)}`);
    for (let r = 0; r < 5; r++) rows[r] += (i > 0 ? ' ' : '') + glyph[r];
  });
  return rows;
}

export const DRIFT_MAX_PX = 12;

function hash01(n: number): number {
  let t = (n | 0) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function driftOffset(minuteIndex: number): { x: number; y: number } {
  return {
    x: Math.round((hash01(minuteIndex * 2) * 2 - 1) * DRIFT_MAX_PX),
    y: Math.round((hash01(minuteIndex * 2 + 1) * 2 - 1) * DRIFT_MAX_PX),
  };
}
