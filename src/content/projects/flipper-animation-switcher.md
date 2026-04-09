---
title: "Flipper Animation Switcher"
date: 2026-02-18
stack: [C]
status: "Stable"
url: "https://lab.flipper.net/apps/animation_switcher"
repo: "https://github.com/lsalik2/FlipperAnimationSwitcher"
description: "A Flipper Zero application for creating, managing, and switching which background animations play on your Flipper."
permissions: "-rwxr-xr-x"
---

The background animations for the Flipper Zero are controlled by a single manifest.txt file. However, by default, the Flipper does not provide the user with the ability to truly switch between different animations (or presets of animations) at will. This app aims to solve that, allowing you to create and apply new manifest.txt files on the fly! Just select the animations you want, configure their butthurt, level and weight parameters, name the playlist and apply it.

Features include:
- *Create Playlist* - Select animations, optionally fine-tune per-animation settings, then save as a named playlist.
- *Choose Playlist* - Apply a saved playlist (overwrites manifest.txt).
- *Delete Playlist* - Remove any saved playlist.
- *About / Help* - App info and help section.