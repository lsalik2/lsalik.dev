---
title: "SLKBOT (currently Chroma)"
date: 2025-04-01
stack: [Python, discord.py]
status: "Alpha"
repo: "https://github.com/lsalik2/Chroma"
description: "The all-purpose, general utility bot to kill server bot bloat."
permissions: "drwxr-xr-x"
---

SLKBOT takes the complete opposite appoach of most bots in Discord. Generally, most bots try to cram as many features as possible, but inevitably leave some gaps that end up needing to be filled by other bots, which also cram in many features. This ends up in a **"bot bloat"**, where multiple bots are added with overlapping functionalities. This can confuse end-users on which bot does what.

SLKBOT attempts to solve this with three principles:
  1. **Commands are granularly and modularly named**, to ensure that users have an easy time finding what they need without overlapping functionality between two bots.
  2. **Countless general purpose tools** are integrated with SLKBOT to ensure that server admins rarely have to add obscure and highly specific bots in their server.
  3. The foundation of SLKBOT's commands is **speed and user-experience**. Any and all commands have this in mind by design, ensuring that users don't have to wait for long time for a command to run, and that actually using the commands is never confusing or frustrating.

Let's look at an example. You install a **core bot** (such as Mee6) that can handle several server-wide functionalities, such as auto-moderation, utility, logs, etc. However, this leaves "gaps" in functionality that server admins will need to fill in with other bots. Do you want a scheduler bot? You'll have to add one. How about a music bot? Sure, but it also adds features that overlap with your core bot. Maybe you have a very niche need, such as a timer that will ping any members that react to that timer message at the end. You'll need to add an extremely small and obscure bot that has that functionality (and most times just that functionality).

How does SLKBOT resolve this? By packaging several general purpose tools and niche commands into its ecosystem so it can be used alongside a core bot, and minimize the bot bloat. It leaves the heavy lifting of server maintenance and upkeeping to the core bot, while focusing on filling the gaps left behind by it, all while keeping speed and usability as foundation principles, making sure users have an easy time finding commands, and an even easier time using them.

Another benefit of SLKBOT is that it tries keeping users to the server's ecosystem as much as possible. No need for third-party tools and websites when you can now convert timezones, translate messages and schedule scrims directly from a channel in the server. This ensures users have a more intuitive experience, and server admins with logging and conflict resolutions, as everything is integrated into the Discord server.