// Layout primitives for the terminal renderer: single-line Unicode boxes,
// horizontal rules, section headers, word-wrapping, and two-column alignment.
//
// Every helper is pure and ANSI-aware: widths are measured after stripping
// SGR escapes so colored text doesn't throw off padding.

import { bold, borderDim, titleBright, stripAnsi, visibleWidth } from './ansi';

export const PAGE_WIDTH = 80;

const TL = '\u250C'; // ┌
const TR = '\u2510'; // ┐
const BL = '\u2514'; // └
const BR = '\u2518'; // ┘
const H = '\u2500';  // ─
const V = '\u2502';  // │

export interface BoxOptions {
  readonly title?: string;
  readonly width?: number;
  readonly padX?: number;
}

// Wrap a list of pre-styled lines in a single-line Unicode frame. Each line
// may itself contain ANSI escapes; padding is computed from the visible width
// so colored content aligns correctly.
//
// If `title` is given, it's inlined on the top border like `┌─ title ─...─┐`.
// Lines longer than the inner width are soft-wrapped via `wrap()`.
export function box(lines: readonly string[], opts: BoxOptions = {}): string {
  const width = opts.width ?? PAGE_WIDTH;
  const padX = opts.padX ?? 1;
  const inner = width - 2 - padX * 2;

  const wrapped: string[] = [];
  for (const line of lines) {
    if (line === '') {
      wrapped.push('');
      continue;
    }
    const sub = wrap(line, inner);
    for (const s of sub.split('\n')) wrapped.push(s);
  }

  const top = buildTop(width, opts.title);
  const bottom = borderDim(BL + H.repeat(width - 2) + BR);
  const pad = ' '.repeat(padX);

  const body = wrapped.map(line => {
    const w = visibleWidth(line);
    const filler = w < inner ? ' '.repeat(inner - w) : '';
    return borderDim(V) + pad + line + filler + pad + borderDim(V);
  });

  return [top, ...body, bottom].join('\n');
}

function buildTop(width: number, title?: string): string {
  if (!title) {
    return borderDim(TL + H.repeat(width - 2) + TR);
  }
  // ┌─ title ──...──┐
  const label = ` ${title} `;
  const labelWidth = visibleWidth(label);
  const remaining = width - 2 - 2 - labelWidth; // 2 corners + 2 leading dashes
  const leading = H.repeat(2);
  const trailing = H.repeat(Math.max(0, remaining));
  return (
    borderDim(TL + leading) +
    bold(titleBright(label)) +
    borderDim(trailing + TR)
  );
}

// Horizontal rule in dim border color.
export function hr(width: number = PAGE_WIDTH): string {
  return borderDim(H.repeat(width));
}

// Bold bright-cyan label followed by a dim rule line the same width as the
// containing page.
export function sectionHeader(text: string, width: number = PAGE_WIDTH): string {
  return [bold(titleBright(text)), hr(width)].join('\n');
}

// Word-wrap `text` to `width` visible columns, preserving ANSI escapes across
// break boundaries. A long unbreakable token is hard-split at the boundary so
// no line ever exceeds the requested width. Existing '\n' characters in the
// input are treated as hard breaks.
export function wrap(text: string, width: number): string {
  if (width <= 0) return text;
  const output: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph === '') {
      output.push('');
      continue;
    }
    output.push(...wrapParagraph(paragraph, width));
  }
  return output.join('\n');
}

function wrapParagraph(text: string, width: number): string[] {
  // Split into tokens while preserving whitespace runs, so indentation and
  // multiple spaces don't collapse.
  const tokens = text.match(/\s+|\S+/g) ?? [];
  const lines: string[] = [];
  let current = '';
  let currentWidth = 0;

  const flush = () => {
    if (current.length > 0) {
      lines.push(current);
      current = '';
      currentWidth = 0;
    }
  };

  for (const token of tokens) {
    const isSpace = /^\s+$/.test(token);
    const plain = stripAnsi(token);
    const tokenWidth = plain.length;

    if (isSpace) {
      if (current.length === 0) continue; // drop leading whitespace on wrapped lines
      if (currentWidth + tokenWidth > width) {
        flush();
        continue;
      }
      current += token;
      currentWidth += tokenWidth;
      continue;
    }

    if (tokenWidth > width) {
      // Hard-split oversized token. ANSI codes might straddle the cut; keep
      // them attached to the first slice and accept one cosmetic bleed — this
      // path is rare (e.g. a giant unbroken URL).
      if (currentWidth > 0) flush();
      let remaining = token;
      let remainingPlain = plain;
      while (remainingPlain.length > width) {
        lines.push(remaining.slice(0, width));
        remaining = remaining.slice(width);
        remainingPlain = remainingPlain.slice(width);
      }
      current = remaining;
      currentWidth = remainingPlain.length;
      continue;
    }

    if (currentWidth + tokenWidth > width) {
      flush();
    }
    current += token;
    currentWidth += tokenWidth;
  }

  flush();
  if (lines.length === 0) lines.push('');
  return lines;
}

// Two-column row: `left` flush-left, `right` flush-right, padded with spaces
// between them. If the content doesn't fit on one line, `right` drops to a
// new line right-aligned below `left`.
export function twoCol(
  left: string,
  right: string,
  width: number = PAGE_WIDTH,
  gap: number = 2,
): string {
  const lw = visibleWidth(left);
  const rw = visibleWidth(right);
  if (lw + gap + rw <= width) {
    const filler = ' '.repeat(width - lw - rw);
    return left + filler + right;
  }
  // Fallback: stack right-aligned under left.
  const fillerRight = ' '.repeat(Math.max(0, width - rw));
  return left + '\n' + fillerRight + right;
}
