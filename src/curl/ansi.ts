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
