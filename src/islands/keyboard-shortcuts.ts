// src/islands/keyboard-shortcuts.ts
//
// DOM wiring for the vim-style chord shortcuts. The state machine lives in
// src/lib/shortcuts.ts; this file translates DOM events into resolveChord()
// calls and applies the resulting actions (navigate, show/hide overlay).
//
// Listeners are attached once at module load — the document survives Astro
// view transitions, so re-binding on every astro:page-load would leak.

import { navigate } from 'astro:transitions/client';
import {
  resolveChord,
  INITIAL_CHORD_STATE,
  CHORD_TIMEOUT_MS,
  type ChordState,
} from '../lib/shortcuts';

let state: ChordState = INITIAL_CHORD_STATE;
let overlay: HTMLDivElement | null = null;
let lastFocus: Element | null = null;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function buildOverlay(): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'shortcuts-overlay';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'shortcuts-title');
  root.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:1000',
    'display:none',
    'align-items:center',
    'justify-content:center',
    'background:rgba(0,0,0,0.55)',
  ].join(';');

  const card = document.createElement('div');
  card.className = 'shortcuts-card';
  card.style.cssText = [
    'background:var(--bg-surface)',
    'color:var(--fg)',
    'border:1px solid var(--border)',
    'border-radius:6px',
    'padding:1.25rem 1.5rem',
    'min-width:280px',
    'max-width:90vw',
    'font-family:"Roboto Mono","JetBrains Mono","Fira Code",monospace',
    'font-size:0.9rem',
    'box-shadow:0 8px 24px rgba(0,0,0,0.4)',
  ].join(';');
  card.addEventListener('click', e => e.stopPropagation());

  const heading = document.createElement('h2');
  heading.id = 'shortcuts-title';
  heading.textContent = 'keyboard shortcuts';
  heading.style.cssText = [
    'margin:0 0 0.75rem',
    'color:var(--accent)',
    'font-size:1rem',
    'font-weight:600',
  ].join(';');
  card.appendChild(heading);

  const list = document.createElement('dl');
  list.style.cssText = [
    'display:grid',
    'grid-template-columns:max-content 1fr',
    'gap:0.4rem 1.25rem',
    'margin:0',
  ].join(';');

  const rows: ReadonlyArray<readonly [string[], string]> = [
    [['g', 'h'], 'home'],
    [['g', 'p'], 'projects'],
    [['g', 'b'], 'blog'],
    [['g', 'u'], 'uses'],
    [['g', 'c'], 'contact'],
    [['?'], 'toggle this help'],
    [['Esc'], 'close this help'],
  ];

  for (const [keys, label] of rows) {
    const dt = document.createElement('dt');
    dt.style.cssText = 'display:flex;gap:0.25rem;align-items:center;';
    for (const k of keys) {
      const kbd = document.createElement('kbd');
      kbd.textContent = k;
      kbd.style.cssText = [
        'display:inline-block',
        'min-width:1.5em',
        'padding:0.1em 0.45em',
        'border:1px solid var(--border)',
        'border-radius:3px',
        'background:var(--bg)',
        'color:var(--fg)',
        'font-family:inherit',
        'font-size:0.85em',
        'text-align:center',
      ].join(';');
      dt.appendChild(kbd);
    }
    const dd = document.createElement('dd');
    dd.textContent = label;
    dd.style.cssText = 'margin:0;color:var(--fg-muted);align-self:center;';
    list.appendChild(dt);
    list.appendChild(dd);
  }
  card.appendChild(list);

  const hint = document.createElement('p');
  hint.textContent = 'click outside or press esc to close';
  hint.style.cssText = [
    'margin:1rem 0 0',
    'font-size:0.75rem',
    'color:var(--fg-muted)',
    'opacity:0.7',
  ].join(';');
  card.appendChild(hint);

  root.appendChild(card);
  root.addEventListener('click', () => closeOverlay());
  document.body.appendChild(root);
  return root;
}

function ensureOverlay(): HTMLDivElement {
  if (!overlay) overlay = buildOverlay();
  return overlay;
}

function isOverlayOpen(): boolean {
  return !!overlay && overlay.style.display !== 'none';
}

function openOverlay(): void {
  const el = ensureOverlay();
  lastFocus = document.activeElement;
  el.style.display = 'flex';
  // Move focus into the overlay so Tab doesn't escape behind it on first try.
  const card = el.querySelector('.shortcuts-card') as HTMLElement | null;
  card?.setAttribute('tabindex', '-1');
  card?.focus();
}

function closeOverlay(): void {
  if (!overlay) return;
  overlay.style.display = 'none';
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
  lastFocus = null;
}

function applyAction(action: ReturnType<typeof resolveChord>['action'], event: KeyboardEvent): void {
  switch (action.type) {
    case 'navigate':
      event.preventDefault();
      // Don't navigate if the overlay is open — close it first so the user
      // sees their context returning rather than a surprise page swap.
      if (isOverlayOpen()) closeOverlay();
      navigate(action.href);
      return;
    case 'toggle-help':
      event.preventDefault();
      if (isOverlayOpen()) closeOverlay();
      else openOverlay();
      return;
    case 'close-help':
      if (isOverlayOpen()) {
        event.preventDefault();
        closeOverlay();
      }
      return;
    case 'none':
      return;
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isTypingTarget(event.target)) return;

  const result = resolveChord(state, event.key, performance.now(), CHORD_TIMEOUT_MS);
  state = result.next;
  applyAction(result.action, event);
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', onKeydown);
}
