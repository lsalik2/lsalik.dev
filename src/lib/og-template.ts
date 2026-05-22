// Build-time Open Graph card for blog posts. Returns a Satori-compatible node
// tree (plain { type, props } objects — Satori accepts these directly, no JSX
// required). Styled as a terminal window: titlebar with traffic-light dots,
// body with a shell prompt, the post title, a rule, and a date/tags meta line.
//
// Pure and dependency-free so it can be unit-tested without Satori or fonts.

export interface OgData {
  readonly title: string;
  readonly date: string;
  readonly tags: readonly string[];
  readonly slug: string;
}

interface OgNode {
  readonly type: string;
  readonly props: {
    readonly style: Record<string, unknown>;
    readonly children?: unknown;
  };
}

const C = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  fg: '#e6edf3',
  muted: '#8b949e',
  green: '#3fb950',
  red: '#ff5f56',
  yellow: '#ffbd2e',
  brightGreen: '#27c93f',
} as const;

const FONT = 'Roboto Mono';

function el(
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
): OgNode {
  return { type, props: { style, children } };
}

function dot(color: string): OgNode {
  return el('div', {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color,
  });
}

export function buildOgTree(data: OgData): OgNode {
  const metaLine = `${data.date}    ${data.tags.map(t => `#${t}`).join('  ')}`;

  const titleBar = el(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      height: 72,
      paddingLeft: 32,
      paddingRight: 32,
      backgroundColor: C.surface,
      borderBottom: `2px solid ${C.border}`,
    },
    [
      el(
        'div',
        { display: 'flex', alignItems: 'center', gap: 14 },
        [dot(C.red), dot(C.yellow), dot(C.brightGreen)],
      ),
      el(
        'div',
        {
          display: 'flex',
          marginLeft: 28,
          fontSize: 28,
          color: C.muted,
        },
        'lsalik.dev',
      ),
    ],
  );

  const body = el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      justifyContent: 'center',
      padding: 72,
    },
    [
      el(
        'div',
        { display: 'flex', fontSize: 32, color: C.green, marginBottom: 28 },
        `$ cat ${data.slug}.md`,
      ),
      el(
        'div',
        {
          display: 'flex',
          fontSize: 68,
          fontWeight: 700,
          color: C.fg,
          lineHeight: 1.15,
        },
        data.title,
      ),
      el('div', {
        display: 'flex',
        height: 2,
        backgroundColor: C.border,
        marginTop: 32,
        marginBottom: 32,
      }),
      el(
        'div',
        { display: 'flex', fontSize: 30, color: C.muted },
        metaLine,
      ),
    ],
  );

  return el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      width: 1200,
      height: 630,
      backgroundColor: C.bg,
      color: C.fg,
      fontFamily: FONT,
    },
    [titleBar, body],
  );
}
