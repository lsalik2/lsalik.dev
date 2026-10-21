---
title: "BashCraft"
date: 2026-10-01
stack: [Java, Fabric]
status: "Released"
repo: "https://github.com/lsalik2/bashcraft"
description: "A Fabric mod that brings bash to Minecraft commands: chains, pipes, variables, aliases and timers, with an optional client companion that highlights chains in chat."
permissions: "drwxr-xr-x"
active: true
order: 2
---

Minecraft runs one command at a time. BashCraft adds `/sh`, which understands `&&`, `||`, `;` and `|`, so `/sh locate structure #minecraft:village | tp @s` finds the nearest village and takes you there in one line. Pipes pull coordinates, numbers or text out of one command's output and feed them into the next, appended or dropped into `{x}`, `{y}`, `{z}` and `{value}` placeholders.

On top of that come variables and `$( … )`, aliases with arguments, history, and timers: `sleep`, `&`, `jobs` and `kill %N`, which wait without ever freezing the server. Chains work in chat, command blocks, functions and the console, and they report results to command blocks and `/execute store` the way vanilla does.

Only the server needs it, so vanilla clients can join and use everything. The optional client companion colours each command in a chain the way vanilla would, completes inside chains, and shows BashCraft's errors above the chat box. Version 1.0.0 came out on October 13th, 2026, with a 14-page guide whose every example is tested in game.
