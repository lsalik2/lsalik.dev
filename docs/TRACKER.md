# lsalik.dev tracker

## BUGS
**curl demo on website returns spaced out text blocks**
- Issue description: while the logo is perfect on curl, when using the curl demo on the website, the logo shows spaces between the text blocks.
- Intended behavior: logo is connected perfectly in the curl demo.

**resume lines too close**
- Issue description: jumping from " - Refactored website architecture (...)" to "Software Engineer" doesn't create as much space between the lines as I would like. I've already attempted backslashes and direct <br> breaks. I also tried changing resume.astro global(p) to white-space: pre-line and that didn't work either.
- Intended behavior: jumping from both lines of text includes some space between them to separate the two different roles.

**default astro 404**
- Issue description: when the website 404s, it returns a default astro page with a 404. this causes curl to display html code
- Intended behavior: if possible, create a 404 section that is curl friendly and still contains some of the website's core aesthetics. if not possible or easily implemented, don't worry

**curl demo block starts small, and expands as curl return appears**
- Issue description: when the curl demo starts, the block starts at a smaller size. as the curl result comes in, it expands to fit everything.
- Intended behavior: i would like the block to start at the bigger size so that it doesn't need to resize as the result comes in. it should only resize if it needs to (for example with a different browser window size)

## FEATURES
- in contact, I would like two separate link sections -- one that contains links for my social professionally, one that is for other personal endeavors not related to work or coding (i'm a professional esports player, so links related to that)
- let's replace the sources page. instead, i would like a small footer section with a source: link-to-source-code, and a copyright section © luis salik - lsalik.dev
