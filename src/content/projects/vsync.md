---
title: "vsync"
date: 2026-09-15
stack: [Python]
status: "Beta"
description: "Two-way sync between a folder in your Obsidian vault and a project's docs/ folder in its git repo."
permissions: "drwx------"
active: true
---

I write notes in Obsidian, but my projects keep their docs in the repo. vsync keeps the two identical in both directions: edit in Obsidian and the change shows up in the repo, pull in the repo and it shows up in the vault. They're two real copies reconciled by vsync's own three-way sync, so neither side needs the other running, and a change made on both sides is never overwritten. vsync merges what it can and tells you about the rest.

It works on Linux, macOS and Windows through WSL, with a background watcher and a `vsync doctor` for when something stops working.
