import { ansiToNodes } from '../lib/ansi-to-dom';
import { renderHome } from '../curl/render';
import { fitDemo } from '../lib/demo-layout';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Width of one column of the output's monospace font, in px.
function columnWidth(container: HTMLElement): number {
  const probe = document.createElement('span');
  probe.style.whiteSpace = 'pre';
  probe.textContent = '0'.repeat(80);
  container.appendChild(probe);
  const width = probe.getBoundingClientRect().width / 80;
  probe.remove();
  return width;
}

async function runCurlDemo(container: HTMLElement): Promise<void> {
  const COMMAND = '$ curl -L lsalik.dev';
  // Render at the width that fits the box, like a terminal that size would
  // (?cols=), shrinking the font on phones where even 40 columns don't fit.
  const baseFont = parseFloat(getComputedStyle(container).fontSize);
  const { cols, fontPx } = fitDemo(container.clientWidth, columnWidth(container), baseFont);
  if (fontPx !== baseFont) container.style.fontSize = `${fontPx}px`;
  const response = renderHome(cols);

  // Pre-measure the full content to set the container height before animation starts.
  // This prevents the block from expanding as content streams in. We only GROW the
  // min-height beyond the CSS baseline — never shrink — so wide viewports stay at
  // the CSS default (no flash) while narrow viewports where content wraps get
  // bumped up to fit.
  const body = container.closest('.curl-demo-body') as HTMLElement | null;
  if (body) {
    const ghost = document.createElement('pre');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;' +
      'font:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Cascadia Mono","DejaVu Sans Mono","Liberation Mono",monospace;' +
      `font-size:${fontPx}px;line-height:1;letter-spacing:0;white-space:pre;margin:0;` +
      `width:${container.offsetWidth}px`;
    ghost.textContent =
      COMMAND + '\n\n' + response.replace(/\x1b\[[\d;]*m/g, '');
    document.body.appendChild(ghost);
    const measured = ghost.offsetHeight;
    document.body.removeChild(ghost);

    const bodyStyle = getComputedStyle(body);
    const paddingY =
      parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);
    const baseline = parseFloat(bodyStyle.minHeight) || 0;
    const needed = measured + paddingY;
    if (needed > baseline) {
      body.style.minHeight = needed + 'px';
    }
  }

  // Wait 800ms before starting
  await delay(800);

  // --- Typing phase ---
  const cmdSpan = document.createElement('span');
  cmdSpan.className = 'ansi-green';

  const cursor = document.createElement('span');
  cursor.className = 'cursor-inline';
  cursor.textContent = '█';

  container.textContent = '';
  container.appendChild(cmdSpan);
  container.appendChild(cursor);

  for (const ch of COMMAND) {
    cmdSpan.textContent = (cmdSpan.textContent ?? '') + ch;
    await delay(randomBetween(40, 100));
  }

  // Pause after typing
  await delay(500);

  // --- Streaming phase ---
  // Remove cursor
  cursor.remove();

  // Add line breaks after command (blank line before response)
  container.appendChild(document.createElement('br'));
  container.appendChild(document.createElement('br'));

  // Create a container for the response lines
  const responseContainer = document.createElement('span');
  container.appendChild(responseContainer);

  // Stream response line by line
  const lines = response.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineNodes = ansiToNodes(lines[i]);
    responseContainer.appendChild(lineNodes);
    if (i < lines.length - 1) {
      responseContainer.appendChild(document.createElement('br'));
    }
    await delay(125);
  }
}

function init(): void {
  const teaser = document.getElementById('curl-teaser');
  const wrapper = document.getElementById('curl-demo-wrapper');
  const container = document.getElementById('curl-demo-output');
  if (!teaser || !wrapper || !container) return;

  // The wrapper opens to its content's real height (a fixed cap would clip
  // the output on narrow screens, where it's taller).
  const fitHeight = () => {
    if (wrapper.classList.contains('expanded')) wrapper.style.maxHeight = `${wrapper.scrollHeight}px`;
  };

  let started = false;
  teaser.addEventListener('click', () => {
    const isExpanded = wrapper.classList.contains('expanded');
    if (isExpanded) {
      wrapper.classList.remove('expanded');
      wrapper.style.maxHeight = '';
      teaser.setAttribute('aria-expanded', 'false');
    } else {
      wrapper.classList.add('expanded');
      teaser.setAttribute('aria-expanded', 'true');
      if (!started) {
        started = true;
        // Sizes the body before its first await, so fitHeight sees the full height.
        void runCurlDemo(container).then(fitHeight);
      }
      fitHeight();
    }
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', init);
}
