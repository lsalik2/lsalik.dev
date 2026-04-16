---
title: "A production security pass"
date: 2026-04-16
tags: [security, meta, webdev]
description: "Self-hosted fonts, Vary: User-Agent, anchored UA matching, ANSI stripping, hashed CSP, real 404s, and a few smaller hardening items before shipping."
draft: false
---

Before flipping the switch to prod I ran a two-pass review over the site: an explorer agent mapped the codebase, then a reviewer agent went hunting for security and production-readiness issues. That second pass turned up two real blockers, a handful of high-severity items, and a few smaller things worth bundling in. This post walks through what shipped.

# Critical fixes

## The site's own CSP was blocking its own fonts

`Base.astro` was loading Roboto Mono from `fonts.googleapis.com` and `fonts.gstatic.com`, but the CSP emitted by the middleware was `style-src 'self' 'unsafe-inline'; font-src 'self'`. Neither Google origin was whitelisted, which meant any CSP-enforcing browser (all of them) would block the stylesheet and fall back to whatever local `monospace` resolved to. That's the whole visual identity of the site gone.

I had two options: whitelist the Google origins in CSP, or self-host. Self-hosting is the stronger answer — one fewer third-party request, no cross-origin hop, CSP stays tight. I pulled all six woff2 subsets that the Google stylesheet was serving, dropped them under `public/fonts/roboto-mono/`, and added the `@font-face` block to `global.css` with matching `unicode-range` values for each subset so the browser only downloads what it actually needs. The `<link>` tags to the Google origins are gone from `Base.astro`. CSP didn't have to change at all.

## No `Vary: User-Agent` anywhere

The whole site hinges on a UA-sniffing middleware: `curl lsalik.dev` gets ANSI; a browser gets HTML. That's the entire value prop of the curl feature. But no response was emitting `Vary: User-Agent`. Any proxy that honors `Vary` but doesn't honor `Cache-Control: no-store` (corporate proxies, shared squids, a future CDN tier change) could happily serve HTML to a curl client or a terminal blob to a browser. Vercel's edge cache doesn't honor `Vary: User-Agent` today, but relying on that is fragile.

I moved `SECURITY_HEADERS` out of `middleware.ts` and into `src/lib/security-headers.ts` — plain module, no Astro-runtime dependency, so it's unit-testable. `Vary: User-Agent` is now the first entry, applied via `withHeaders()` to every response: curl output, HTML output, 404s, the sitemap/robots short-circuits, and the `/links` redirect. There's a new `tests/middleware.test.ts` that asserts both UAs get the header.

# High-severity fixes

## Anchor the UA match

The detector was using `.includes()`:

```ts
const TERMINAL_AGENTS = ['curl/', 'wget/', 'httpie/', 'fetch/', 'libfetch/'];
return TERMINAL_AGENTS.some(agent => ua.toLowerCase().includes(agent));
```

`curl/` can appear anywhere in a UA string. Any bot advertising `MyScanner/1.0 (curl/8-based)`, a browser extension spoofing something weird, a Referer bleed into the UA header — all of those get plain text instead of HTML. Not a security bug per se, but definitely a false-positive surface.

Product tokens are always the first token in a real UA, so I anchored the regex:

```ts
return /^(curl|wget|httpie|fetch|libfetch)\//i.test(ua.trim());
```

`curl/8.4.0` still matches. `Mozilla/5.0 (compatible; thing/curl/8)` no longer does.

## ANSI escape injection from markdown bodies

`sanitizePathnameForTerminal()` has been stripping ESC from 404 paths for a while. But the markdown body content (`entry.body`) and frontmatter description (`entry.data.description`) for blog and project pages were being interpolated straight into the curl output with no sanitization. A post author (future contributor, compromised repo) could embed `\x1b[2J` (clear screen), `\x1b]8;;https://evil\x07link\x1b]8;;\x07` (OSC 8 hyperlinks), or iTerm2 OSC 1337 escapes and they'd render live in any curl reader's terminal. The blast radius is small — it's author-controlled content — but the inconsistency with the pathname sanitizer was the actual bug.

I added a `stripDangerousEscapes()` helper in `src/curl/ansi.ts` that takes the opposite approach from `stripAnsi()`: instead of stripping everything, it keeps SGR (the `\x1b[...m` color/style codes) and strips:

- OSC strings (`ESC ]` through `BEL` or `ESC \`),
- non-SGR CSI sequences (`ESC [` with a final byte that isn't `m`),
- bare ESC + single-char sequences (`ESC c`, etc.).

That helper is applied at the boundary in `middleware.ts` before content enters the render functions, so all four surfaces — blog post body, project post body, and both index-page descriptions — are covered. Tests in `ansi.test.ts` cover SGR passthrough, OSC hyperlink removal, screen-clear removal, iTerm2 OSC 1337, and mixed content.

## Auditing the `path-to-regexp` override

`package.json` had a forced override pinning `path-to-regexp` to `^6.3.0`, presumably for CVE-2024-45296 (a ReDoS). I wanted to know if it was still necessary or just stale config rotting in the tree. `npm ls path-to-regexp` showed `@vercel/routing-utils@5.3.3` still requesting `path-to-regexp@6.1.0` — which is the vulnerable version. So the override is load-bearing. I kept it and added a code comment citing the CVE and the dep that pulls in the unpatched version, so the next maintainer knows exactly when it can come out.

# Medium hardening

## Hash-pin the one inline script

The CSP had `script-src 'self' 'unsafe-inline'` for one reason: a five-line palette-restore IIFE that runs before first paint to avoid a theme flash. `'unsafe-inline'` is a big hammer for one small static script. I computed its SHA-256 and swapped the directive:

```
script-src 'self' 'sha256-OVMxEOIbYL7kzB5+NR2bhY5aqbo5+Dk1R68D+NM/8iE='
```

The script runs, CSP doesn't tolerate any other inline script anymore, and the XSS surface is tighter by one directive.

I left `style-src 'unsafe-inline'` in place for now. Astro injects inline component styles at build time and the hashes aren't stable across builds; solving that properly needs a nonce per response, which is a bigger change for marginal benefit on a static-content site.

## Pin the Node engine

Added `"engines": { "node": ">=20.0.0" }` to `package.json`. Vercel's default Node version drifts; an implicit bump could break the adapter or ESM assumptions silently. Now it's declared.

# Low-severity cleanup

**Unicode controls in 404 paths.** The pathname sanitizer stripped `[\x00-\x1f\x7f]` — which kills ESC, great — but left C1 controls (`\x80-\x9f`), BiDi overrides (`U+202A-\u202E`, `U+2066-\u2069`), and zero-width spaces alone. A path like `/ɛvil\u202e...` would render right-to-left in the 404 box. Cosmetic, not exploitable without ESC, but one regex change fixed it.

**Real 404s for missing slugs.** Both `blog/[...slug].astro` and `projects/[...slug].astro` were redirecting to their index page on a miss. That's observability-hostile: search engines index and follow the redirect, and legitimately-gone URLs don't signal gone. Both now return `new Response(null, { status: 404 })`.

# What it looks like on disk

Four commits, in order:

1. `sec: self-host Roboto Mono fonts and add Vary: User-Agent` (C1 + C2)
2. `sec: anchor UA match, strip ANSI from content bodies, audit path-to-regexp` (H1 + H2 + H3)
3. `sec: hash-pin inline script CSP and pin node engine` (M1 + M2)
4. `fix: sanitize unicode control chars in pathname and return real 404 on missing slugs` (L1 + L2)

140 tests passing across 12 files. The site is in a good shape to ship.
