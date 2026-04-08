import { renderLogo } from '../curl/logo';
import { ansiToNodes } from '../lib/ansi-to-dom';
import { bold, dim } from '../curl/ansi';

function buildResponse(): string {
  const logo = renderLogo();
  const title = bold('lsalik.dev');
  const description = dim('terminal-inspired personal website');
  const nav = [
    dim('navigate:'),
    `  curl lsalik.dev/blog`,
    `  curl lsalik.dev/projects`,
    `  curl lsalik.dev/resume`,
    `  curl lsalik.dev/links`,
  ].join('\n');
  const source = dim('source: https://github.com/lsalik2/lsalik.dev');

  return [logo, '', title, description, '', nav, '', source].join('\n');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function runCurlDemo(container: HTMLElement): Promise<void> {
  const COMMAND = '$ curl lsalik.dev';
  const response = buildResponse();

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

  // Add line break after command
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
  const container = document.getElementById('curl-demo-output');
  if (!container) return;
  runCurlDemo(container);
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', init);
}
