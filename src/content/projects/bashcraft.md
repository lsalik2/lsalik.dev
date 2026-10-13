---
title: "BashCraft"
date: 2026-10-01
stack: [Java, Fabric]
status: "Beta"
description: "A server-side Fabric mod that brings bash-style operators (&&, ||, ; and pipes) to Minecraft commands."
permissions: "drwx------"
active: true
---

Minecraft runs one command at a time. BashCraft adds `/sh`, which understands `&&`, `||`, `;` and `|`, so `/sh locate structure #minecraft:village | tp @s` finds the nearest village and takes you there in one line. Pipes pull coordinates, numbers or text out of one command's output and feed them into the next, appended or dropped into `{x}`, `{y}`, `{z}` and `{value}` placeholders.

It runs server-side only, so vanilla clients can use it, and it reports results to command blocks and `/execute store` the way vanilla does.
