// Boots the /screensaver page: resolves settings, runs one background engine
// plus the colour, clock, panel, and power modules, and keeps them in sync.
// The page has no ClientRouter, so this runs once per full page load.

import { createAsciiEngine, PRESETS } from '../ascii-bg';
import {
  defaultSettings,
  resolveSettings,
  toSearchParams,
  stepPattern,
  STORAGE_KEY,
  PATTERN_NAMES,
  type ScreensaverSettings,
  type PatternName,
} from '../../lib/screensaver-settings';
import { keyAction, exitTarget } from '../../lib/screensaver-input';
import { createColorController } from './color-layer';
import { createClockLayer } from './clock-layer';
import { createAutoHide, fullscreenSupported, toggleFullscreen, keepScreenAwake, isFullscreen, isStandalone } from './power';
import { fullscreenMode, isIosPhone } from '../../lib/fullscreen-mode';
import { bindPanel, copyShareUrl } from './panel';
import { effectiveFont } from './sizing';

const IDLE_MS = 3000;
const SAVE_DEBOUNCE_MS = 300;

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(s: ScreensaverSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Private mode / storage disabled: settings just won't persist.
  }
}

function presetFor(name: PatternName) {
  return PRESETS.find(p => p.name === name) ?? PRESETS[0];
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName);
}

function boot(): void {
  const root = document.documentElement;
  const wrapper = document.querySelector<HTMLElement>('[data-ss-wrapper]');
  const stage = document.querySelector<HTMLElement>('[data-ss-stage]');
  const clockEl = document.querySelector<HTMLElement>('[data-ss-clock]');
  const panel = document.querySelector<HTMLElement>('[data-ss-panel]');
  if (!wrapper || !stage || !clockEl || !panel) return;

  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const defaults = defaultSettings(root.dataset.palette);
  let settings = resolveSettings(defaults, readStorage(), location.search);

  // Displayed pattern (differs from settings.pattern when cycling).
  let shown: PatternName =
    settings.pattern === 'cycle'
      ? PATTERN_NAMES[Math.floor(Math.random() * PATTERN_NAMES.length)]
      : settings.pattern;

  const font = effectiveFont(settings.cellSize, innerWidth, innerHeight);
  const engine = createAsciiEngine(stage, {
    preset: presetFor(shown),
    speed: settings.speed,
    fontSize: font.fontSize,
    lineHeight: font.lineHeight,
    layerColors: ['var(--ss-l1)', 'var(--ss-l2)', 'var(--ss-l3)'],
    interactive: false,
    reduceMotion,
  });
  stage.dataset.preset = shown;

  const colors = createColorController(root, wrapper, reduceMotion);
  const clock = createClockLayer(clockEl);
  const autoHide = createAutoHide(panel, IDLE_MS);
  keepScreenAwake();

  let cycleTimer: ReturnType<typeof setInterval> | null = null;
  function showPattern(name: PatternName): void {
    shown = name;
    stage!.dataset.preset = name;
    engine.update({ preset: presetFor(name) });
  }
  function restartCycle(): void {
    if (cycleTimer !== null) clearInterval(cycleTimer);
    cycleTimer = null;
    if (settings.pattern === 'cycle') {
      cycleTimer = setInterval(() => showPattern(stepPattern(shown, 1)), settings.cycleMinutes * 60000);
    }
  }

  function applyAll(prev: ScreensaverSettings | null): void {
    stage!.style.opacity = String(settings.brightness);
    colors.apply(settings);
    clock.apply(settings);
    const f = effectiveFont(settings.cellSize, innerWidth, innerHeight);
    engine.update({ speed: settings.speed, fontSize: f.fontSize, lineHeight: f.lineHeight });
    if (!prev || prev.pattern !== settings.pattern || prev.cycleMinutes !== settings.cycleMinutes) {
      if (settings.pattern !== 'cycle') showPattern(settings.pattern);
      restartCycle();
    }
  }

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function save(): void {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  }
  // Writes a pending debounced save now, so leaving the page (exit, Esc,
  // closing the tab) never drops the last change.
  function flushSave(): void {
    if (saveTimer === null) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    writeStorage(settings);
  }
  window.addEventListener('pagehide', flushSave);

  const panelApi = bindPanel(panel, settings, next => {
    const prev = settings;
    settings = next;
    applyAll(prev);
    save();
  });

  // Viewport changes (resize, rotation, fullscreen) can raise the minimum font.
  window.addEventListener('resize', () => {
    const f = effectiveFont(settings.cellSize, innerWidth, innerHeight);
    engine.update({ fontSize: f.fontSize, lineHeight: f.lineHeight });
  });

  // Buttons.
  const fsButton = panel.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');
  if (fsButton && !fullscreenSupported()) fsButton.hidden = true;

  // Floating control outside the panel: real fullscreen where the browser
  // supports it, otherwise (iPhone) a hint to add the page to the home screen.
  const floatFs = document.querySelector<HTMLButtonElement>('[data-ss-fs]');
  const installHint = document.querySelector<HTMLElement>('[data-ss-install-hint]');
  const mode = fullscreenMode({
    fullscreenApi: fullscreenSupported(),
    standalone: isStandalone(),
    iosPhone: isIosPhone(navigator.userAgent),
  });
  if (floatFs) {
    floatFs.dataset.mode = mode;
    floatFs.hidden = mode === 'none';
    floatFs.setAttribute('aria-label', mode === 'install-hint' ? 'how to go fullscreen' : 'toggle fullscreen');
    if (mode === 'install-hint') floatFs.textContent = '[add to home screen]';
    floatFs.addEventListener('click', async () => {
      if (mode === 'fullscreen') await toggleFullscreen();
      else if (installHint) installHint.hidden = !installHint.hidden;
      floatFs.blur(); // focus inside a fixed control would block auto-hide on some browsers
    });
  }

  const syncFsLabels = () => {
    const on = isFullscreen();
    if (fsButton) fsButton.textContent = on ? '[exit fullscreen]' : '[fullscreen]';
    if (floatFs && mode === 'fullscreen') floatFs.textContent = on ? '[exit fullscreen]' : '[fullscreen]';
  };
  document.addEventListener('fullscreenchange', syncFsLabels);
  document.addEventListener('webkitfullscreenchange', syncFsLabels);
  const shareField = panel.querySelector<HTMLInputElement>('[data-share-url]');
  const status = panel.querySelector<HTMLElement>('[data-ss-status]');
  const exit = () => {
    flushSave();
    location.href = exitTarget(document.referrer, location.origin);
  };

  panel.addEventListener('click', async e => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'fullscreen') await toggleFullscreen();
    if (action === 'exit') exit();
    if (action === 'reset') {
      const prev = settings;
      settings = defaults;
      panelApi.set(settings);
      applyAll(prev);
      save();
    }
    if (action === 'copy') {
      const qs = toSearchParams(settings, defaults).toString();
      const url = `${location.origin}/screensaver${qs ? `?${qs}` : ''}`;
      const result = await copyShareUrl(url, navigator.clipboard);
      if (status) status.textContent = result === 'copied' ? 'link copied' : 'copy the link below';
      if (shareField) {
        shareField.value = url;
        shareField.hidden = result === 'copied';
        if (result === 'fallback') shareField.select();
      }
    }
    // Browsers leave focus on a clicked button, and auto-hide never hides a
    // panel with focus inside it. Drop it — except when the share field was
    // just revealed and selected for the user to copy.
    const keepFocus = action === 'copy' && shareField !== null && !shareField.hidden;
    if (!keepFocus) (e.target as HTMLElement).closest('button')?.blur();
  });

  // Keys.
  window.addEventListener('keydown', e => {
    switch (keyAction(e.key, isTypingTarget(e.target))) {
      case 'fullscreen':
        void toggleFullscreen();
        break;
      case 'toggle-pin':
        autoHide.togglePin();
        break;
      case 'prev-pattern':
      case 'next-pattern': {
        const next = stepPattern(shown, e.key === 'ArrowLeft' ? -1 : 1);
        if (settings.pattern === 'cycle') {
          showPattern(next);
          restartCycle();
        } else {
          const prev = settings;
          settings = { ...settings, pattern: next };
          panelApi.set(settings);
          applyAll(prev);
          save();
        }
        break;
      }
      case 'escape':
        if (isFullscreen()) break; // the browser exits fullscreen itself
        if (isTypingTarget(e.target)) (e.target as HTMLElement).blur();
        if (autoHide.visible()) {
          // An open panel closes first, pinned or not; Esc again exits.
          if (panel.dataset.pinned === 'true') autoHide.togglePin();
          autoHide.hideNow();
        } else {
          exit();
        }
        break;
      default:
        break;
    }
  });

  applyAll(null);
}

boot();
