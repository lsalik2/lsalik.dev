---
title: "BashCraft: a bash shell for Minecraft's command line"
date: 2026-10-14
tags: [bashcraft, minecraft, java]
description: "BashCraft 1.0 brings bash-style chains, pipes, variables, aliases and timers to Minecraft commands: how it runs nested commands, reads their output, waits without freezing the server, and tests its own guide."
draft: false
---

Minecraft's command line runs one command at a time. To find the nearest village and go there, you run `/locate`, read the coordinates out of chat, and type them into `/tp`. Anything that depends on whether a command worked needs a command block contraption or a datapack. I spend a lot of my day in a real shell, and I kept wanting the small ideas from bash that turn that kind of thing into a one-liner.

[BashCraft](/projects/bashcraft) is a Fabric mod for Minecraft 26.3 that adds them. It went from its first commit on October 1st to a 1.0.0 release on October 13th, and it's now 126 commits, about 5,300 lines of Java and a little over 300 unit tests. It's [on GitHub](https://github.com/lsalik2/bashcraft), and the Modrinth and CurseForge listings are waiting for approval.

# What it looks like

Everything goes through `/sh`:

```text
/sh locate structure #village | surface | tp @s
/sh time set night ; sleep 5s ; time set day
/sh alias home = tp @s 0 100 0
/sh list | each data get entity {value} XpLevel
```

The first line finds the nearest village, drops the coordinates onto the ground with the `surface` builtin, and teleports you there. `&&`, `||` and `;` follow bash's rules, groups `( … )` nest, and numbers like `[2]` on an error tell you which command in a chain failed. There are variables (`x=5`, `$x`, `$( … )`), aliases with `$1` and defaults, `!!` history, and `sleep`, `&`, `jobs` and `kill %N` for timers. Chains work in chat, command blocks, functions and the console, and a server can turn on a mode where chains don't even need the `/sh`.

The mod only has to be on the server. Vanilla clients can join and use every feature.

# Running a command to completion

The first problem showed up before any parsing. Modern Minecraft doesn't run a command the moment you call it: commands go into an execution context's queue, and a command that runs another one from inside itself just queues it behind the current one. But `a && b` needs `a`'s result before it can decide whether `b` runs at all.

The spike on day one tested one way around it: clear the current execution context around each command BashCraft runs, so that command gets a fresh context of its own and finishes before the call returns. All six probes passed, and the same run turned up two catches. Inside a function, Minecraft silences every command's feedback before anything can read it, so piping inside functions needed a mixin that catches the messages earlier. And `/function` only reports a result when the function executes `return`. Treating "no result" as failure would have meant `sh function setup && say done` never says done, so a command that finishes without a result counts as success unless it sent an error.

# Reading what a command said

Commands don't return text. They return a number and send feedback messages, and the messages are what pipes read. BashCraft looks at a message's translation key rather than its text: 23 vanilla messages, like `commands.locate.structure.success` and `commands.list.players`, have exact adapters that know which argument holds the coordinates, the number or the player list. Because it keys on the translation key, a server running in German pipes the same way as one in English. Anything without an adapter falls back to the first coordinates in the message, then the last number, then the whole text.

Lists are real lists. `/list`, `/tag … list`, `/team list` and NBT lists come through as separate items, which is what `grep`, `each` and `store` work on.

# Waiting without freezing the server

`sleep` was the part I was most careful with. The server can't stop and wait, so `/sh` returns at once, and the rest of the chain is saved and picked up on a later tick, the way `/schedule` works. A chain can pause halfway through an `&&` list inside a group, so the executor keeps a stack of frames and resumes them innermost first. `&` puts part of a chain in the background, `jobs` lists what's waiting with the ticks left, and `kill %N` cancels one.

Waiting chains follow `/tick freeze` and `/tick rate`, pause along with an empty server, and are capped at 8 per player and 64 in total. The rule that took longest to get right was permissions. A chain you typed wakes up as you are *then*: where you're standing, with the permissions you have at that moment, and it ends if you leave. A chain from a command block or a function never wakes with more permission than the player whose command started it has by then. Chains never give anyone more than they already have.

# The red in the chat box

The mod worked, but typing a chain looked broken. Vanilla's chat box parses the whole line as one command and colours everything after the first thing it can't parse in red, so every chain was red from the first `&&` onwards.

The optional client companion fixes that by handing vanilla's own suggestion code one command at a time. It works out which command the cursor is in and gives vanilla a reader over just that slice, with the positions unchanged, so vanilla's colouring, tab completion and usage hints all work on each command as if it were alone. Operators get their own colour, `{x}` and `$x` get another, and BashCraft's own errors, like an unclosed `(`, show above the chat box. It only switches on after the server says hello on a `bashcraft:hello` channel, so it can't make a chain look valid on a server that can't run it. Its hooks sit in mixin configs that aren't required, so if a future Minecraft update breaks them, the chat box falls back to vanilla instead of crashing.

The last bug before release came from smoke-testing the actual jar: `/sh list | each echo {value} is online` ran fine but showed red after `each`. The highlighter treated whatever followed `each` as a vanilla command, and `echo` is BashCraft's own. It was a small fix, with a check that failed first.

# A guide that tests itself

The guide is 14 pages and about 7,100 words, with an optional "New to bash?" page at the front. Most sections end in a "Give it a try!" block you can paste into the game: 64 of them, 100 commands in total. An in-game test opens a fresh creative world for each page, pastes every block at reading pace, and fails on any red message.

It earned its keep quickly. It caught that `/time query daytime` no longer exists in 26.3, that `alias tick` is refused because `tick` is a vanilla command, that `#pillager_outpost` isn't a structure tag, and that `locate` returns the *distance* as its result. Standing on the village, that's 0, which counts as failure for `&&`. That one is now a troubleshooting entry.

Running the client headless was its own detour. I develop on WSL, where every Linux window pops up on the Windows desktop, so the in-game tests run on Xvfb. My Xvfb has no OpenGL visual that Minecraft will accept, so the client starts on Vulkan instead, through Mesa's software renderer. The same setup now runs on GitHub Actions for every pull request, in about seven and a half minutes.

# Art from the game's own files

The icon, the README banner and the gallery images are drawn by about 440 lines of standard-library Python that reads textures and the font straight out of the Minecraft jar. The first icons were built on the command block texture, and they leaned on it so hard that the mod looked like it was about command blocks. The one that stuck is `/sh` over `&&_` in Minecraft's own font, on vanilla's dirt, with the `&&` in aqua. The last tweak darkened the text shadow, which was too close to the dirt's own dark pixels. The banner's cave background puts its ores at the heights they actually generate at, so copper never sits below diamond.

# Wrap-up

BashCraft started as "I want `&&` in Minecraft" and turned into a small shell, with a guide, a test for every example in it, and a release workflow that turns the changelog's Unreleased section into a version, tests it and publishes it from one button. What's next is the part that would make it a scripting language rather than a command combiner: arithmetic and tests like `$(( $x + 5 ))` and `[ $hp -lt 10 ]`, and then `if`, `for` and `while`.
