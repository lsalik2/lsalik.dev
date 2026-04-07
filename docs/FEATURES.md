# ASCII Animated Background

Using the Pretext demo as inspiration (see `./resources/REFERENCES.md` and `./resources/pretext-demos`), a reactive art hero using ASCII characters is displayed in the background of the website, behind all elements, in an opaque and non-intrusive way. It should reflow dynamically as the viewport resizes by having Pretext re-layout the text in real time, and be animated using a source field as in the Pretext demo.

# Curl-Friendly Terminal Rendering

Since the website will be hosted on Vercel, detecting the `User-Agent` header via Vercel's Edge Middleware is possible. This allows the website to serve different content for `curl`/`wget` vs browsers; exactly like `ysap.sh` (see `./resources/ysap`). Browser users see the normal website, terminal users get clean plain text readable in their terminal.

## Artistic Elements

Using the website through `curl` should also return some exclusive elements on the response, such as a logo, website title, description, src, etc., much like `ysap.sh`. The logo specifically should include colored "underline lines" according to the color palette.

```bash
readarray -t LOGO << EOF
AA  AA  AAAA     AAA   AAAAA 
CC  CC CC  BB  ACB BCA CC  CC
 BCCB   BBBBCA CCAAACC CCAACB
  CC   BCAAACB CC   CC CC    
DDDDDDDDDDDDDDDDDDDDDDDDDDDDD
EEEEEEEEEEEEEEEEEEEEEEEEEEEEE
EOF
```

## Curl Demo in the website

An island component that simulates typing `curl lsalik.dev` and streams the plain-text terminal response character by character should be shown in the homepage, just like ysap.sh. This is a cosmetic effect, but also lets users know they can curl the website in their terminal.

# Blog System

The website will allow for blog posts, while still following the terminal-style. In the main blogs page, each blog gets displayed in a terminal-frame style:

```bash
┌── cat ~/blog/building-lsalik-dev.md ───────────────────┐
│                                                        │
│  # Building lsalik.dev                                 │
│  2026-04-01 · webdev, project, opensource              │
│                                                        │
│  Post description here rendered from Markdown...       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Clicking on one of the blog cards opens it fully for reading, while still having the entire post inside a terminal-frame style.

# Projects Page TODO

The main projects page follows a terminal `ls -la` entry, which the user can then click into to learn more about the project, relevant links, etc.

```plaintext
drwxr-xr-x  slk  2026-03-15  lsalik.dev/
  Terminal-inspired personal website.
  Stack: TBD · TBD · TBD
  Status: Alpha (in development)
  → github.com/lsalik2/lsalik.dev

drwxr-xr-x  slk  2026-01-20  slkards/
  Discord-based TCG bot.
  Stack: Python
  Status: Live
  → slkards.wiki
```

Clicking on one of the entries allows the user to see more in-depth information about the project, links, etc.

# Resume Page

Rendered as a printable page that also looks like a terminal dump. Include a "Download PDF" link.

# Color Toggle

A toggle in the nav that switches between different color palettes. Not a traditional "light/dark" theme switch, but allows for choosing different aesthetics for the website.

- Dark Terminal (default)
- Amber-on-Black CRT
- more planned in the future...