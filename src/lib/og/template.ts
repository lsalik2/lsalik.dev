// Plain-object Satori tree (no JSX). Satori accepts the same shape React produces.
// Colors hard-coded from the `dark-terminal` palette in src/styles/global.css to
// keep build-time rendering self-contained (no CSS variable resolution at build).

export type OgKind = 'blog' | 'project';

export interface OgTemplateProps {
  kind: OgKind;
  slug: string;
  title: string;
  meta: string;
}

const COLORS = {
  bg: '#0b0c0e',
  fg: '#e6e6e6',
  fgMuted: '#8a8a8a',
  accent: '#f5b041',
  border: '#2a2c30',
};

// Satori expects a plain element object: {type, props: {style, children}}.
// `key` is optional and only matters for list reconciliation, which we don't use.
function el(type: string, props: Record<string, unknown>) {
  return { type, props };
}

export function OgTemplate({ kind, slug, title, meta }: OgTemplateProps) {
  const titlebar = `── cat ~/${kind === 'blog' ? 'blog' : 'projects'}/${slug}.md ──`;

  return el('div', {
    style: {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: COLORS.bg,
      color: COLORS.fg,
      fontFamily: 'Roboto Mono',
      padding: '40px',
    },
    children: [
      // Outer terminal frame
      el('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '4px',
          overflow: 'hidden',
        },
        children: [
          // Titlebar
          el('div', {
            style: {
              padding: '18px 28px',
              borderBottom: `1px solid ${COLORS.border}`,
              backgroundColor: '#15171a',
              color: COLORS.fgMuted,
              fontSize: '28px',
            },
            children: titlebar,
          }),
          // Body
          el('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '60px 56px',
              gap: '32px',
            },
            children: [
              el('div', {
                style: {
                  fontSize: '64px',
                  fontWeight: 700,
                  color: COLORS.fg,
                  lineHeight: 1.15,
                  // Clamp to 3 lines — Satori supports lineClamp via this property.
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                },
                children: title,
              }),
              el('div', {
                style: {
                  fontSize: '28px',
                  color: COLORS.fgMuted,
                },
                children: meta,
              }),
            ],
          }),
          // Footer wordmark
          el('div', {
            style: {
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '18px 28px',
              borderTop: `1px solid ${COLORS.border}`,
              color: COLORS.accent,
              fontSize: '24px',
            },
            children: 'lsalik.dev',
          }),
        ],
      }),
    ],
  });
}
