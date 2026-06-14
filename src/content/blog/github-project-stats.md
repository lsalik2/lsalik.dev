---
title: "Live GitHub stats on the projects page"
date: 2026-06-13
tags: [meta, webdev]
description: "Stars and last-commit recency on every project, fetched at build time into a committed JSON cache and shown in both the browser and the curl view."
draft: false
---

Project entries now wear their GitHub vitals: a `★ 42 · updated 3d ago` line on each card and detail page, in both the browser and the `curl` terminal view. It's the "live projects github stats: stars, last commit, etc." item from the old roadmap, and the interesting part wasn't the GitHub API — it was deciding *when* to call it.

# Build-time, not request-time

The site runs with `output: 'server'`, so pages are server-rendered per request on Vercel's edge. The naive version — fetch `api.github.com` inside the project page's frontmatter — would hit GitHub on *every page view*. The unauthenticated REST API allows 60 requests an hour per IP; a single crawler would blow through that and start serving pages with no stats (or worse, slow pages waiting on a third party in the hot path).

So the fetch happens once, at build time, and the result is written to a committed file: `src/data/github-stats.json`, a map keyed by lowercased `owner/name`. Pages just import that JSON and read from it — no network on the request path at all. The repo rebuilds on every push to `main`, so the numbers refresh on each deploy, which for a portfolio is plenty live. Committing the file means it doubles as both the dev/offline fixture and a last-known cache.

This is the same shape as the OG image integration from [the previous writeup](/blog/og-image-generation): an Astro integration hooked into the build. The one difference is timing — OG images run at `astro:build:done` because they emit static assets, while stats run at `astro:build:start` because pages need the data *before* they render. It also means I got to re-meet an old friend: reading project frontmatter inside a build hook can't go through `astro:content` (the Vite module runner is torn down by then), so `src/integrations/github-stats.ts` walks `src/content/projects/*.md` with `fs/promises` and parses frontmatter with `js-yaml` loaded via `createRequire` — exactly the workaround the OG integration needed for the same lifecycle reason.

# A pure lib doing the boring parts

Everything that *isn't* I/O lives in `src/lib/github-stats.ts` and is fully unit-tested:

- `parseRepo(url)` pulls `{ owner, name }` out of a repo URL, tolerating a trailing slash and a `.git` suffix, and returning `null` for anything that isn't a GitHub URL.
- `repoApiToStats(json)` narrows the GitHub response down to the two fields I actually show — `stargazers_count` and `pushed_at`.
- `relativeTime(iso, now)` turns a timestamp into `3d ago` / `2mo ago`, with `now` injected so the buckets are deterministic in tests.
- `formatStars(n)` keeps small counts verbatim and compacts thousands (`1234 → 1.2k`).
- `statsForRepo(repoUrl, map)` is the lookup the pages call; closed-source projects have no `repo`, so it just returns `null`.

The integration is a thin shell around these: collect repos → fetch each → `repoApiToStats` → merge → write. Keeping the logic pure meant the integration itself needs no tests, the same way the OG integration leans on its tested template helpers.

# The same line in four places

The site has a dual-rendering contract — every browser page has a `curl` equivalent — so the stats had to land in four spots: the project list and the project detail, each in HTML and in terminal text. The browser pages build the line from `formatStars` + `relativeTime`; the terminal renderer (`renderProjectsIndex` and `renderProjectPost` in `src/curl/render.ts`) takes a pre-formatted string via a new optional `stats` field that the middleware fills in with `formatStatsText`. So `curl -L lsalik.dev/projects` shows the same `★ 8 · updated 3w ago` a browser does, which is the whole point of the terminal view existing.

# When the fetch fails

Stats are an enhancement, never load-bearing, and the code treats them that way. Each repo is fetched in its own try/catch; a failure is logged and skipped, and `mergeStats(existing, fresh)` layers fresh results over the committed file so a transient outage keeps the last-known numbers instead of wiping them. The integration never throws — a GitHub hiccup must not fail a deploy.

The first build proved the point immediately: two of my repos returned `HTTP 404`. They're private, and the unauthenticated API reports private repos as 404 rather than 403 so it can't be used to probe for their existence. Those projects simply render no stats line — exactly the closed-source path — and they'll light up automatically if the repos go public or if I set a `GITHUB_TOKEN` with read access in Vercel's env, which also bumps the rate limit to 5,000/hour.

# Wrap-up

Another roadmap line closed, and a satisfying amount of the work was reusing patterns the site already had — the build-time integration, the dual-render parity, the tested-pure-core discipline. The stars are small numbers on small projects, but "updated 3d ago" is the one that earns its place: it's the signal that something is still alive.
