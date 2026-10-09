// Binds the panel's controls (marked with data-setting="<field>") to the
// settings object. Every change runs through sanitize() so the panel can
// never produce an out-of-range value.

import { sanitize, type ScreensaverSettings } from '../../lib/screensaver-settings';

type Control = HTMLInputElement | HTMLSelectElement;

function readControl(el: Control): unknown {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'range' || el.type === 'number') return Number(el.value);
  }
  return el.value;
}

function writeControl(el: Control, value: unknown): void {
  if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = Boolean(value);
  else el.value = String(value);
}

function getField(s: ScreensaverSettings, field: string): unknown {
  if (field === 'custom.bg') return s.custom.bg;
  const m = field.match(/^custom\.l([123])$/);
  if (m) return s.custom.layers[Number(m[1]) - 1];
  return (s as unknown as Record<string, unknown>)[field];
}

function withField(s: ScreensaverSettings, field: string, value: unknown): unknown {
  if (field === 'custom.bg') return { ...s, custom: { ...s.custom, bg: value } };
  const m = field.match(/^custom\.l([123])$/);
  if (m) {
    const layers = [...s.custom.layers];
    layers[Number(m[1]) - 1] = value as string;
    return { ...s, custom: { ...s.custom, layers } };
  }
  return { ...s, [field]: value };
}

export function bindPanel(
  root: HTMLElement,
  initial: ScreensaverSettings,
  onChange: (s: ScreensaverSettings) => void,
): { set(s: ScreensaverSettings): void } {
  let current = initial;
  const controls = Array.from(root.querySelectorAll<Control>('[data-setting]'));

  function sync(): void {
    for (const el of controls) writeControl(el, getField(current, el.dataset.setting!));
    root.dataset.colorSource = current.colorSource;
    root.dataset.pattern = current.pattern;
    root.dataset.clock = current.clock;
    for (const out of root.querySelectorAll<HTMLOutputElement>('output[data-for]')) {
      out.textContent = String(getField(current, out.dataset.for!));
    }
  }

  for (const el of controls) {
    el.addEventListener('input', () => {
      current = sanitize(withField(current, el.dataset.setting!, readControl(el)), current);
      sync();
      onChange(current);
    });
  }

  sync();
  return {
    set(s) {
      current = s;
      sync();
    },
  };
}

// Copies the share URL; reports 'fallback' when the Clipboard API is missing
// or refuses, so the caller can reveal a selectable field instead.
export async function copyShareUrl(
  url: string,
  clipboard: { writeText(t: string): Promise<void> } | undefined,
): Promise<'copied' | 'fallback'> {
  if (!clipboard) return 'fallback';
  try {
    await clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'fallback';
  }
}
