# lsalik.dev tracker

## BUGS
**curl logo still broken**
- Issue description: logo comes out with proper colors, but it is broken and choppy
- Intended behavior: shows the "SLK" logo but connected properly. Take a look carefully at the ysap.sh example in resources to understand how its done. The current logo output:
 ▄▄  ▄▄▄▄ ▄▄     ▄▄  ▄▄
▄▄  ▄▄    ▄▄     ▄▄ ▄▄
 ▄▄▄▄     ▄▄     ▄▄▄▄
   ▀▄▄    ▄▄     ▄▄ ▄▄
▄▄▄▄      ▄▄▄▄▄▄ ▄▄  ▄▄
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

**background animation has empty blotches of text**
- Issue description: the background animation ends up with empty blotches with no text. There are also micro stutters every 5-8 seconds.
- Intended behavior: the animation should fill the entire screen, and always have some text moving in it. If the whole animation needs to be refactored, then please do so.

**background animation doesn't persist**
- Issue description: the background animation will restart when switching pages.
- Intended behavior: it should persist across page changes, and the animation should only restart when reload the entire page

## FEATURES
- Add 3 new color palettes. Make sure they are different colors than the already existing palettes.
- Add two text field underneath "A terminal-inspired personal website". One of will be for a quick website introduction, one will be for explaining you can also curl the website in a terminal.
- Add heading "~/resume" and "~/links" respectively.
- Add text fields underneath "~/projects", "~/blog", "~/resume" and "~/links". These will be for quick introductions to the respective pages. 
- Add navs for about me, contact, sources. The layout should now be "about me, projects, blog, resume, links, contact, sources"
  - The new navs should also have the "~/heading" and text fields as appropriate 
