# Vision

A **dark, monospace-forward personal website** that feels like peering into a living terminal session. The site should blur the line between "website" and "text interface"; every element should feel like it belongs in a terminal, but with a level of polish and animation that only a browser can deliver. Use ASCII art where possible to keep the immersion alive.

# Color Palette

For the default "Dark Terminal" palette:

```plaintext
--bg:            #0d1117    /* GitHub-dark charcoal          */
--bg-surface:    #161b22    /* Slightly lifted panels        */
--fg:            #c9d1d9    /* Primary text (soft white)     */
--fg-muted:      #8b949e    /* Comments, secondary text      */
--accent:        #58a6ff    /* Links, interactive elements   */
--accent-bright: #79c0ff    /* Hover state                   */
--green:         #3fb950    /* Success / shell prompt $      */
--amber:         #d29922    /* Warnings / highlights         */
--border:        #30363d    /* Subtle separators             */
--cursor:        #58a6ff    /* Blinking cursor               */
```

For the "Amber-on-Black CRT" palette:

```plaintext
  --bg:            #0a0a00    /* Near-black                   */
  --bg-surface:    #0f0f00    /* Slightly lifted near-black   */
  --fg:            #ffb000    /* Primary text (amber)         */
  --fg-muted:      #b07800    /* Comments, secondary text     */
  --accent:        #ff6600    /* Links, interactive elements  */
  --accent-bright: #ff8833    /* Hover state                  */
  --green:         #33ff00    /* Success / shell prompt $     */
  --amber:         #ffb000    /* Warnings / highlights        */
  --border:        #332800    /* Subtle separators            */
  --cursor:        #ffb000    /* Blinking cursor              */
```

# Font

| Role | Font | Fallback/Placeholder |
|------|------|----------|
| **Everything** | `"Loskeley Mono", "JetBrains Mono", "Fira Code"` | `monospace` |
| **ASCII art / Pretext** | `"Loskeley Mono"` at computed size | `monospace` |

Loskeley Mono is available from here: https://github.com/ahatem/IoskeleyMono/releases/tag/v2.0.0-beta.1