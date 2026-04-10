# Site Redesign Design Spec

Redesign lsalik.dev incorporating layout, styling, and feature elements from
Ryan-vanderHeijden.github.io while preserving the existing dual-rendering
(curl/browser) architecture and terminal aesthetic.

Reference repo: https://github.com/Ryan-vanderHeijden/Ryan-vanderHeijden.github.io

## 1. Layout & Background

### Drop page-main wrapper
- Remove `.page-main` from `Page.astro` — content flows directly inside
  `.page-container` as individual `TerminalFrame` cards.
- Each page composes its own frames; the layout only provides nav, container,
  and footer.

### Background opacity
- Decrease ASCII background opacity from `0.30` to `0.22` to compensate for
  content no longer sitting on a semi-transparent surface.

### ASCII background font-size
- Reduce from `14px` to `11px`.

## 2. Navigation

### Nav links
- Add `~/` as first link pointing to `/` (homepage return).
- Change all labels to unix-path style: `~/`, `~/projects`, `~/blog`,
  `~/resume`, `~/contact`.
- Defined in `src/lib/nav.ts`.

### Cursor blink
- Make the blinking `█` cursor thicker — increase font-size from `0.9em` to
  ~`1.1em` (or apply a slight CSS horizontal scale).

### Theme switcher
- Replace the `[theme: name]` text button with colored circle dots (12px).
- Active palette gets `outline: 2px solid var(--fg-muted)` with
  `outline-offset: 2px`.
- Hover: `transform: scale(1.3)`.

### Footer
- Add `border-top: 1px solid var(--border)` separator.
- Duplicate nav links above existing footer content (source, copyright,
  privacy).

### Bottom nav
- Footer nav links mirror the header links (`~/projects`, `~/blog`, etc.).

## 3. Typography

### Roboto Mono
- Add Google Fonts preconnect + import in `Base.astro`.
- Apply Roboto Mono to: `h1`, `h2`, `h3`, page titles, hero title, project
  names, blog post titles.
- Loskeley Mono remains for: body text, nav breadcrumb, terminal frame
  titlebars, curl demo, footer, tags, metadata.

### Page titles
- Remove `~/` prefix from page title text (e.g. just `projects`).
- Remove `ls -la ~section —` prefix from page subtitles — use plain
  descriptions.

## 4. Homepage

### Hero
- Title: `<span class="accent">lsalik</span>.dev` in Roboto Mono, ~1.8rem.
- Tagline: `aerospace and software engineer` in 0.95rem, `--fg-muted`.

### Frame cards
Four `TerminalFrame` sections replacing the current about preview:

1. **whoami** (titlebar: `whoami`)
   - `dl`/`dt`/`dd` grid (max-content + 1fr).
   - Fields: name, role, focus, status, github, linkedin.
   - 0.9rem font-size, 0.3rem/2rem gap.

2. **./about** (titlebar: `./about`)
   - Paragraph bio. Key terms highlighted with `--accent`.

3. **./interests** (titlebar: `./interests`)
   - Bulleted list with `>` character in `--accent`, 0.5ch margin-right.

4. **./resume** (titlebar: `./resume`)
   - Brief summary + download button styled as `-> download resume.pdf`
     linking to the existing PDF.

### Quick links
- Row of `-> projects`, `-> blog`, etc. below the frames.
- Flex, 2rem gap, 0.9rem, `--accent` with hover to `--accent-bright`.

### Curl demo (easter egg)
- Small collapsed frame at the bottom showing `$ curl -L lsalik.dev`.
- Clicking expands to reveal the full typing/streaming demo.
- Smooth CSS transition on expand.
- Animation only starts after expansion.

## 5. Projects Page

### Page header
- Title: `projects` (no `~/` prefix, Roboto Mono).
- Plain description subtitle.

### Project frames
Each project is a clickable `TerminalFrame` wrapped in an `<a>` tag:

- **Titlebar:** `drwxr-xr-x slk` — permission string with `slk` in
  `--green`.
- **Header row:** Project name (bold, Roboto Mono, `--accent`) left-aligned,
  date range right-aligned (year only, e.g. `2024 - present`).
- **Description:** Below the header.
- **Status:** Field shown, e.g. `status: active` in `--amber`.
- **Hashtags:** Bottom of card, `--ansi-cyan`, 0.8rem, `#tag` format. Not
  limited to tech stack.
- **No view button** — entire frame is the link.
- **Hover:** Border to `--accent`, bg to `--bg-surface`.

### Frontmatter changes
- Add optional `endDate: Date` field to project schema in
  `content.config.ts`.
- If omitted, display shows `present`. Display extracts year only from both
  dates.

## 6. Blog Page

### Page header
- Title: `blog` (no `~/` prefix, Roboto Mono).
- Plain description subtitle.

### Blog frames
Each post uses `BlogCard.astro` / `TerminalFrame`:

- **Titlebar:** `-- cat ~/blog/{slug}.md --` (existing pattern).
- **Body:** Title as `# {title}` in `--accent` (Roboto Mono), date + tags
  meta, description.
- **Hover:** Border to `--accent`, bg shift to `--bg-surface`.

No structural changes — current BlogCard already aligns with the new
direction.

## 7. Contact Page

### Page header
- Title: `contact` (no `~/` prefix, Roboto Mono).
- Plain description subtitle.

### Contact frames
One `TerminalFrame` per section (professional, esports) with section name as
titlebar label.

- **Format:** `dl`/`dt`/`dd` grid.
- **dt:** Label in `--fg-muted`.
- **dd:** Link text inline, underlined, `--accent`.
- Grid: `max-content 1fr`, gap `0.4rem` vertical / `2rem` horizontal.
- Font-size: 0.9rem.

## 8. Animation Variant System

### Presets
Define animation presets as parameter objects containing sine-wave
coefficients (NX, NY, NXY, NXMY, NT, PH, LAYER_OFFSET):

- **Preset 1:** Current lsalik.dev parameters.
- **Preset 2:** Ryan's parameters (different coefficient values).

### Selection
- `Math.random()` picks a preset on each page load.
- No persistence — truly random, can repeat.
- Future presets added by pushing another object into the presets array.

## 9. Out of Scope

- Curl/terminal dual-rendering middleware — no changes.
- Content collection markdown files — no changes (except frontmatter
  additions).
- Palette color definitions — no changes to existing palettes.
- Print styles — no changes.

## 10. Implementation Notes

- All work on a new branch off main.
- Approach: evolve existing layout (Approach A) — modify `Page.astro`,
  `Nav.astro`, and page files in place rather than creating parallel layouts.
- `TerminalFrame.astro` component reused as-is; pages compose frames
  individually.
