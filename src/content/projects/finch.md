---
title: "Finch"
date: 2026-09-15
stack: [Rust, Slint, libmpv, SQLite]
status: "Beta"
description: "A free, open-source media player for the couch, built for the Steam Deck and any Linux PC running Steam Big Picture."
permissions: "drwx------"
active: true
---

Plug in a drive full of shows and movies, see them as a library, press A, watch. Finch has no accounts, no ads, no telemetry and no update nags; every network call it will ever make is opt-in and visible. It's named after my cat.

It sorts folders and network shares (SMB, NFS) into shows, seasons, episodes and movies from their filenames, keeps per-profile progress, and plays through libmpv with hardware decoding: MKV, HEVC, AV1, styled subtitles and all. The UI is built in Slint and designed controller-first, so everything works from the couch.
