---
title: "Sprinkling in Domain-Driven Design"
date: 2026-08-29
tags: [domain-driven-design, modeling, architecture]
description: "Three ideas from Domain-Driven Design that changed how I model software: ubiquitous language, isolating the domain, and bounded context."
image:
  path: /assets/images/og-sprinkling-in-domain-driven-design.png
  width: 1200
  height: 630
  alt: "Sprinkling in Domain-Driven Design"
---

Software engineers spend a surprising amount of time naming things. I have always taken pride in that part of the work, and I genuinely enjoy it. I have also always found it difficult. Every so often I reach for a name and come back with another `Service`, `Factory`, `Builder`, or `Manager`, not because it is especially meaningful, but because it fits a technical pattern I already understand.

Learning [Domain-Driven Design](https://www.domainlanguage.com/ddd/), or DDD, changed how I approach that problem. Eric Evans's original book presents a broad framework for tackling complexity by deeply understanding a domain and allowing that understanding to shape the software. Its vocabulary of tactical and strategic patterns is large enough that DDD can feel like something an organization must formally adopt or a system must comprehensively implement.

That has not been its primary value to me. I do not announce that every project is doing DDD or reach for every pattern associated with it. I sprinkle it in. A few ideas have worked their way into my normal approach to software: language, isolation, and context. They changed how I name things, where I begin a design, and how much responsibility I expect one model to carry. Each corrected an instinct that software engineering had spent years reinforcing in me.

> **Call things what they are. Model before machinery. Let meaning change.**

## Language: Call Things What They Are

Naming is often treated as a test of an engineer's creativity. We stare at a piece of behavior, search for the abstraction that contains it, and try to produce a concise technical name. When we cannot find one, the generic nouns are always nearby. Something coordinates work, so it becomes a service. The problem is that a name may explain how a class participates in the implementation while concealing what it means to the people using it. DDD's **Ubiquitous Language** reverses the starting point: developers and domain experts build a shared language from the domain model, then use it in conversation, documentation, diagrams, and code. For me, naming became less an act of invention and more an act of discovery.

I experienced this while building [RetroLive](https://retro.live/), a basketball simulation game in which people run a league through a draft, a season, and the playoffs. I could have modeled the draft as a `DraftEngine` or `DraftService`. Either name could describe software that coordinates a draft, but neither says much about how a basketball organization experiences one. The domain already had better language. A team has a front office. The front office enters a draft room, evaluates prospects, organizes a draft board, and makes a pick when it is on the clock. Those nouns and verbs give us `FrontOffice`, `DraftRoom`, `Prospect`, `DraftBoard`, and `Pick`, along with actions such as scout, select, and place on the board. Unlike `DraftService.execute`, a front office making a pick in a draft room begins to explain itself.

Domain experts do not always use consistent language, and their words do not arrive prepackaged as classes. Two experts may use the same word differently, or one informal term may conceal several concepts the software must distinguish. Ubiquitous Language is not transcription. It is a continuing collaboration in which language, model, and implementation become more precise together. I may not become the foremost expert in every field I work in, but I should learn enough to model the part my software claims to support. There is no technical shortcut around that responsibility.

## Isolation: Model Before Machinery

I want to open a blank file, temporarily forget the surrounding application, and model the essential behavior from scratch. The instinct is hard to name, because I experience it as a sense of purity. Before deciding how something will be stored, exposed, authenticated, or deployed, I want to understand what it is and what it does. In DDD terms, this overlaps with **Model-Driven Design** and **Layered Architecture**. The implementation should express the domain model directly, while domain logic remains concentrated in one layer and separated from user interface, application, and infrastructure concerns. Evans is direct about the point of that separation: "The key goal here is isolation." The goal is not purity for its own sake. It is to keep the important business knowledge visible enough to reason about, test, and refine.

Frameworks make the opposite impulse hard to resist. Their productivity is real. Ruby on Rails can turn an idea into working software quickly, and an Active Record model arrives with persistence, associations, validation, and callbacks. If I begin there, I may start thinking about tables and record lifecycles before deciding what a draft room must know, when a front office may pick, or what changes after a selection. The framework has done nothing wrong. The database has begun describing the domain rather than supporting one I already understand. Starting with a blank file changes that sequence. Front offices enter the draft in an established order, and only the one on the clock can make the next pick, which removes a prospect and advances the draft. Those rules can be expressed and tested before a table exists.

Infrastructure eventually matters. RetroLive must persist leagues, authenticate users, present an interface, and coordinate work across requests. Isolation allows those connections to follow the model rather than define it. Persistence stores the draft and an endpoint invokes it. Authentication may be necessary without belonging to the core domain. If the distinctive value is simulating a basketball league, the league, draft, season, games, and playoffs should remain clearer than the machinery supporting them. I would rather understand the critical workflow, model its language and rules, and then choose the tools that deliver it. Sometimes the simplest implementation remains a Rails model. What changed is that I reach for it last.

## Context: Let Meaning Change

The urge to build one authoritative representation of every important thing runs deep. If an application contains a `Team`, it feels natural to define that model once and reuse it everywhere. Soon it has a roster, schedule, record, statistics, fatigue, draft picks, scouting preferences, and postseason seeding. Every addition is related to a team, yet the model becomes comprehensive in the least useful sense. It expresses no particular purpose clearly. DDD's **Bounded Context** provides a way out. A domain model applies within an explicit context where its language and rules remain coherent. Beyond that boundary, another model may represent the same real-world thing differently because it serves a different purpose.

During a RetroLive season, only part of that list earns its place. Roster, schedule, record, and fatigue decide the next game; draft picks and scouting preferences do not. The season model plays games and tracks their consequences over time. The draft has different concerns entirely. It needs a selection order, available prospects, front offices, draft boards, and picks. A team's record may help determine its draft position, but the draft room does not need the entire season model to make a selection. Its meaningful actor may be the `FrontOffice` rather than the `Team`, while the person available for selection is a `Prospect`, not yet a `Player` on a roster.

This removed the pressure to discover the one correct model of a team. There is no complete `Team` waiting in the real world for me to reproduce in software. A model is never the whole of reality. It emphasizes some facts and ignores others. The useful question is whether it captures what must be true for its purpose. Context also qualifies Ubiquitous Language. Ubiquitous does not mean that an entire enterprise must agree on one definition for every word. Sales, billing, support, and identity may each need a different truth about the same customer. Forcing those needs into one canonical customer model can create more coupling than clarity.

The season and draft models can refer to the same organization or person without being the same software object. They may share an identifier and exchange information when one workflow leads into another. A completed pick crosses the boundary and eventually places the prospect on a roster. What crosses is explicit; the complete draft model does not have to travel with it. Boundaries do not eliminate integration. They make it more honest. When information crosses contexts, the design must decide what is shared, who owns it, and how its meaning is translated. A system boundary, service boundary, and bounded context may align, but they are not automatically the same thing. What matters is knowing where a model remains valid and noticing when we have crossed beyond it.

## A Few Ideas, Applied at Any Scale

Language, isolation, and context are not the whole of Domain-Driven Design. They are the ideas that most changed my day-to-day work, and they reinforce one another. I can sprinkle these habits into a class, workflow, system, or conversation with a domain expert, and they scale further across the [three levels of architecture](/2026/08/26/architecture-at-three-levels/) I find useful. Enterprise architecture asks what the business means. System architecture asks where that meaning holds and where it must be translated. Software architecture asks how that meaning can remain visible in implementation.

DDD did not give me a formula for architecting every system. It changed where I begin. Learn the domain and use its language. Give the important model enough space to reveal its natural shape. Establish the context in which that shape remains useful. Then connect it to the systems, frameworks, and infrastructure required to make it real.

## TL;DR

Three of Domain-Driven Design's patterns are worth using long before a project commits to the rest of it. **Ubiquitous Language** builds one shared vocabulary from the domain model and uses it in conversation, documentation, diagrams, and code, so a concept has the same name for the business and for engineering. **Layered Architecture** concentrates domain code in its own layer, letting the problem determine the model's structure instead of the storage and delivery mechanisms around it. **Bounded Context** scopes a model to the region where its meaning holds, which removes the pressure to make one model authoritative everywhere and turns integration between contexts into an explicit act of translation.

## Domain Language

Bounded Context
: The scope within which a single model's terminology carries one agreed meaning, beyond which the same words may denote something else.

Layered Architecture
: Evans's pattern for isolating the domain, giving business rules a layer of their own so that infrastructure, application, and interface concerns cannot dictate their shape.

Model-Driven Design
: An approach that keeps code and model tightly bound, so that a change to either compels a corresponding change in the other.

Ubiquitous Language
: A single vocabulary, drawn from the model and used by everyone on a project, in speech and writing as well as in the software itself.

## Further Reading

Eric Evans's [*Domain-Driven Design: Tackling Complexity in the Heart of Software*](https://www.domainlanguage.com/ddd/blue-book/) introduced the vocabulary and broader approach discussed in this essay.

Evans's freely available [*Domain-Driven Design Reference*](https://www.domainlanguage.com/ddd/reference/) provides concise definitions and pattern summaries, including Ubiquitous Language, Model-Driven Design, Layered Architecture, and Bounded Context.

Martin Fowler's explanations of [Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html) and [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) offer accessible introductions to the relationship among language, models, and contextual boundaries.
