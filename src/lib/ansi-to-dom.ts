// Converts ANSI escape codes into DOM nodes using safe methods only.
// NO innerHTML — only createElement, textContent, appendChild.

interface StyleState {
  bold: boolean;
  dim: boolean;
  underline: boolean;
  color: string | null;
}

// Matches both simple SGR codes (\x1b[1m) and 256-color codes (\x1b[38;5;87m).
const ANSI_RE = /\x1b\[([\d;]+)m/g;

const COLOR_256_MAP: Record<number, string> = {
  87: 'ansi-title-bright',
  120: 'ansi-accent-green',
  211: 'ansi-accent-magenta',
  223: 'ansi-body-warm',
  241: 'ansi-border-dim',
};

function applyCodes(params: number[], state: StyleState): void {
  let i = 0;
  while (i < params.length) {
    const code = params[i];
    // 256-color foreground: 38;5;N
    if (code === 38 && params[i + 1] === 5 && i + 2 < params.length) {
      const n = params[i + 2];
      state.color = COLOR_256_MAP[n] ?? null;
      i += 3;
      continue;
    }
    switch (code) {
      case 0:
        state.bold = false;
        state.dim = false;
        state.underline = false;
        state.color = null;
        break;
      case 1:
        state.bold = true;
        break;
      case 2:
        state.dim = true;
        break;
      case 4:
        state.underline = true;
        break;
      case 22:
        state.bold = false;
        state.dim = false;
        break;
      case 24:
        state.underline = false;
        break;
      case 31:
        state.color = 'ansi-red';
        break;
      case 32:
        state.color = 'ansi-green';
        break;
      case 33:
        state.color = 'ansi-amber';
        break;
      case 34:
        state.color = 'ansi-blue';
        break;
      case 36:
        state.color = 'ansi-cyan';
        break;
      case 39:
        state.color = null;
        break;
    }
    i++;
  }
}

function appendText(
  fragment: DocumentFragment,
  text: string,
  state: StyleState,
): void {
  if (!text) return;

  const classes: string[] = [];
  if (state.bold) classes.push('ansi-bold');
  if (state.dim) classes.push('ansi-dim');
  if (state.underline) classes.push('ansi-underline');
  if (state.color) classes.push(state.color);

  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.length > 0) {
      if (classes.length > 0) {
        const span = document.createElement('span');
        span.className = classes.join(' ');
        span.textContent = line;
        fragment.appendChild(span);
      } else {
        fragment.appendChild(document.createTextNode(line));
      }
    }
    if (i < lines.length - 1) {
      fragment.appendChild(document.createElement('br'));
    }
  });
}

export function ansiToNodes(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const state: StyleState = {
    bold: false,
    dim: false,
    underline: false,
    color: null,
  };

  let lastIndex = 0;
  ANSI_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ANSI_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      appendText(fragment, text.slice(lastIndex, match.index), state);
    }
    const params = match[1].split(';').map(Number);
    applyCodes(params, state);
    lastIndex = ANSI_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    appendText(fragment, text.slice(lastIndex), state);
  }

  return fragment;
}
