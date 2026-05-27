# OG image fonts

TTF copies of Roboto Mono Regular + Bold used by Satori for OG image generation.

Satori does not accept woff2 (the format shipped under `public/fonts/roboto-mono/` for browser delivery). These files are build-only — they are never served to clients.

Source: https://github.com/googlefonts/RobotoMono
License: Apache-2.0

## Refreshing

If a future Roboto Mono release ships a fix you want, refetch the TTFs:

```bash
curl -L -o RobotoMono-Regular.ttf \
  https://github.com/googlefonts/RobotoMono/raw/main/fonts/ttf/RobotoMono-Regular.ttf
curl -L -o RobotoMono-Bold.ttf \
  https://github.com/googlefonts/RobotoMono/raw/main/fonts/ttf/RobotoMono-Bold.ttf
```

Confirm each file is real TrueType data (`file RobotoMono-Regular.ttf` should say `TrueType Font data`) before committing.
