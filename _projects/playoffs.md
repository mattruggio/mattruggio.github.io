---
title: "Playoffs"
description: "Underlying data structures to power a bracket-style tournament of teams/competitors."
repo: "https://github.com/mattruggio/playoffs"
tech: [ruby, tournaments, data-structures]
featured: true
order: 1
---

Playoffs models the messy parts of bracket generation so you don't have to: seeding,
byes, round progression, and match resolution. It's deliberately domain-only — no web
framework, no persistence layer — so it can be dropped into whatever you're building.

Reach for it when you need tournament structure without inheriting somebody else's
idea of how a tournament should be stored or rendered.
