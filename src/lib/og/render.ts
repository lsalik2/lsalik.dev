import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { OgTemplate, type OgTemplateProps } from './template';

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fonts');

// Loaded once per process, reused for every render.
let fontCache: Array<{
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
}> | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const [regular, bold] = await Promise.all([
    readFile(join(FONT_DIR, 'RobotoMono-Regular.ttf')),
    readFile(join(FONT_DIR, 'RobotoMono-Bold.ttf')),
  ]);
  fontCache = [
    { name: 'Roboto Mono', data: regular, weight: 400, style: 'normal' },
    { name: 'Roboto Mono', data: bold, weight: 700, style: 'normal' },
  ];
  return fontCache;
}

export async function renderOgPng(props: OgTemplateProps): Promise<Buffer> {
  const fonts = await loadFonts();
  // Satori's types want React.ReactNode; our plain-object tree is structurally
  // compatible. Cast at the boundary to keep the rest of our code React-free.
  const svg = await satori(OgTemplate(props) as never, {
    width: 1200,
    height: 630,
    fonts,
  });
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  })
    .render()
    .asPng();
  return Buffer.from(png);
}
