---
title: "Architecture at Three Levels"
date: 2026-08-26
tags: [architecture, systems, engineering-leadership]
description: "A practical model for connecting business workflows, systems, and software: enterprise, system, and software architecture, and why the mappings between them matter."
image:
  path: /assets/images/og-architecture-at-three-levels.png
  width: 1200
  height: 630
  alt: "Architecture at Three Levels"
---

For much of my career, I was fascinated by the line between software engineering and software architecture. Are you an engineer or an architect, and does one title exclude the other? I have come to think it is mostly a false choice. Engineering and architecture emphasize different activities, but they are not separate worlds.

Several years ago, I pursued formal training through Carnegie Mellon University's [SEI Software Architecture Professional Certificate](https://www.sei.cmu.edu/credentials/sei-software-architecture-professional-certificate/). I had already held the titles of Senior Software Architect and Principal Software Architect across my work in medical and payroll software, so I was not there to earn the role or qualify for a job. I had been programming since I was young, long enough for many architectural decisions to feel instinctive before I had the language to describe them. I could perform the work, but I could not always explain what I was seeing as clearly as I wanted. The certificate was professional development in the most literal sense: a way to make practiced judgment more deliberate, transferable, and communicable.

The SEI curriculum gave me a more disciplined way to reason about stakeholders, business drivers, architectural drivers, quality attributes, [architectural views](https://www.sei.cmu.edu/library/views-and-beyond-collection/), design decisions, and tradeoffs. Some of it validated language I was already using; the rest expanded my vocabulary and made my communication more structured. I came away with a model that has served me especially well: architecture can be considered at three levels: enterprise, system, and software. The three-level model is my synthesis rather than an SEI framework, but it helps me identify what kind of problem I am looking at, which stakeholders belong in the conversation, and where a decision needs to be made.

## Architecture Is Already Happening

Software architecture is a way of reasoning about the structures and consequential decisions that allow a system to exhibit the qualities its stakeholders need, such as modifiability, availability, and security. The [SEI frames it the same way](https://www.sei.cmu.edu/software-architecture/). Functional requirements tell us what a system must do, while quality attributes tell us how well it must do it and under what conditions. Architecture is where the tradeoffs among those qualities become visible.

The SEI methods also gave me a useful distinction between business drivers and architectural drivers. Business drivers are the forces around the effort: time to market, cost, regulation, risk, revenue, or another organizational goal. [Architectural drivers](https://www.sei.cmu.edu/library/quality-attribute-workshop-collection/) are the prioritized requirements, constraints, quality attributes, and stakeholder concerns that significantly influence the design. A request to deliver something by the end of the week shapes an architecture differently than the same request with a timeline measured in months, perhaps favoring an existing system over a new platform. Drivers explain *why* the architecture went one way rather than another, while decisions explain *how* it responds.

Architecture does not require a large document or weeks of diagramming before implementation begins. If I sit down and start coding a prototype, I have not avoided design; I have combined design and implementation into one tight loop. I am still choosing responsibilities, interfaces, dependencies, data structures, and control flow, even if I am making those choices in real time. Sometimes that is the right amount of architecture for the uncertainty and risk involved.

The consequences appear when that prototype must support thousands of requests, protect sensitive data, recover from failures, or become easy for several teams to change. At that point we are evaluating the design against qualities it was never intended to provide, and we may find that the system has the functionality we wanted but not the qualities we now require.

> **You can choose not to document an architecture, but you cannot choose not to have one.**

## The Three Levels

{% include diagrams/architecture-three-levels.html %}

### Enterprise Architecture

Enterprise architecture is the level I think many software engineers encounter without always naming it. I have gone back and forth on the word *enterprise* because it can feel vague or inflated, but my practical shortcut is to hear it as the business-level view. It asks what the organization is trying to accomplish, which capabilities it needs, and how work moves through it independent of any particular software implementation.

I saw this clearly while working in medical software, where we spent considerable time learning how a medical practice operated before designing what would support it. We studied how patients scheduled appointments, how practices planned around arrival and no-show rates, and how new patients were onboarded. We followed the visit itself and the work that continued afterward through charting, treatment planning, billing, and account management. The goal was to understand the practice's line of business from end to end: who performed each step, what information they needed, where decisions occurred, and which handoffs created delays or errors.

At this level, the architect has to become a student of the domain. That means finding the actual subject-matter experts, learning their language, and resisting the temptation to translate the problem into software too early. In medical software that meant learning what clinicians mean by a SOAP note: subjective, objective, assessment, and plan. We carried that structure into the domain model rather than inventing our own vocabulary for it. For the organizations we were serving, software was not the business itself: the medical practice existed to care for patients, not to run software. That is why beginning with the enterprise workflow matters even more here, because it is easy to optimize the software while missing the business.

### System Architecture

System architecture describes the relationships among systems that combine to deliver a larger capability. A useful product workflow may involve several services, data stores, third-party platforms, clients, and operational processes rather than one executable or codebase. The questions therefore sit between systems rather than inside any one of them: which system owns the source of truth, how do systems communicate, where is authorization enforced, and what happens when one system is unavailable? Distributed failure, network latency, compatibility, data consistency, integration contracts, and organizational ownership all become first-class concerns.

I ran into this in the print industry, where a customer composed a document in a web application, a third-party service rendered it into a print-ready file, a proofing step caught results that were badly off, and one of our job workflow engines carried the job through printing and finishing. None of those systems independently delivers the complete experience, so the architecture is in their composition. We had to decide which system owned the job at each stage, how their contracts fit together, and what a customer sees when the renderer is slow or unavailable. The proofing step existed because the final stage was physical: a failed request can be retried, but paper and ink cannot. A technically valid design can still fail if it assumes coordination that the participating teams, roadmaps, and operational models cannot sustain.

### Software Architecture

Software architecture is the structure inside a software system: its components, modules, libraries, interfaces, responsibilities, and dependencies. Engineers make decisions at this level constantly when they decide where behavior should live, which component owns data, what belongs behind an interface, or how the system responds when a dependency fails. Not every method or class is individually architectural, because significance comes from the drivers and consequences involved. A requirement for high availability may drive a decision to introduce redundancy, while an aggressive delivery date may drive a decision to reuse an existing service.

At this level, we evaluate whether the software is maintainable, testable, secure, observable, and performant. A payroll editor, for example, might contain components for pay-code mapping, validation, calculation, and integration with other systems. Its internal architecture determines whether those components can evolve independently, whether errors can be traced, and whether sensitive employee data remains protected. The focus is one software system and the design decisions that allow it to fulfill its responsibilities.

## The Levels Must Align

The value of the model is not simply that it gives us three categories; the value lies in the mappings between them. Payroll offers a clear example of that progression. At the enterprise level, the concern is how a payroll administrator manages employees and HR data, applies earnings and deductions, enters payroll information, executes payroll through a banking partner, and ensures employees are paid and accounted for correctly. At the system level, that workflow may involve an HR system, payroll-entry system, calculation engine, tax services, banking integrations, and reporting systems. At the software level, one of those systems may contain a payroll editor, pay-code mapper, validation rules, calculation components, and integration libraries.

The reasoning also travels upward. A software constraint can change the behavior of a system, and a system constraint can limit a business workflow. Many difficult architecture problems are really alignment problems in which an elegant service does not fit the workflow, individually reasonable systems produce a fragile experience, or a business process depends on guarantees the underlying software cannot provide. Looking at only one level can make every local decision appear sensible while the complete result remains wrong.

## Where Architecture Meets Strategy

The payroll example reveals another useful property of the model: not every enterprise capability needs to descend all the way into custom software architecture. We may understand a workflow and map part of it to an HR platform, tax service, or banking integration we can buy. Our architecture must still define the boundary, select the system, integrate it, and evaluate whether it supports the business. We do not, however, need to design and own the software inside it.

Other capabilities may travel all the way down the stack because they contain knowledge unique to the company. The way a payroll product models data, guides administrators through corrections, or performs a specialized calculation may represent the value the company is uniquely positioned to create. That capability maps from an enterprise need to a system the company owns and finally to custom software it designs and implements.

> **Every capability must be understood at the enterprise level, but not every capability must be owned at the software level.**

This is where the model connects to the argument I made in [*Necessary Is Not Strategic*](/2026/08/21/necessary-is-not-strategic/). A capability can be essential to the business without being strategically valuable to implement ourselves. A mapping that stops at a purchased system is not incomplete; it may be evidence of a sound build-versus-buy decision. A mapping that continues into custom software deserves closer scrutiny because we should know whether we are investing in differentiated knowledge or recreating market parity.

Custom software is not automatically a competitive advantage, and companies build commodity capabilities for valid reasons involving regulation, security, integration, or vendor risk. The model does not make that decision for us; it makes the decision visible and connects it to the larger business workflow.

## Engineer and Architect

This returns me to the question that has followed me throughout my career: am I a software engineer or a software architect? The answer is both, with the qualification that not every engineering decision responds to an architectural driver or carries architectural consequences. Every engineer makes design decisions, while the architect role places greater emphasis on identifying stakeholders, understanding the dominant drivers, making consequential decisions explicit, evaluating tradeoffs, and communicating across boundaries. The role may spend less time in low-level implementation, but it should never become detached from how the software is built and operated.

As engineers grow in scope, they do not leave software engineering behind; they expand the context in which their engineering decisions must make sense. Time spent with doctors or payroll administrators before drawing a system boundary can look less technical than writing code, but it gives the technical design its purpose.

The three-level model has stayed with me because it is simple enough to remember and broad enough to apply across industries. Every system already has an architecture at all three levels. The only question is whether you can name the one you are standing on.

## TL;DR

Architecture translates business and architectural drivers into consequential design decisions and system qualities. Enterprise architecture describes business capabilities and workflows, system architecture organizes the systems and owners that deliver them, and software architecture structures the internals of each system. Every system has an architecture, even when it emerges during implementation, but not every enterprise capability needs to become software we build ourselves. The architect's job is to understand the drivers and mappings, expose the tradeoffs, and keep local decisions aligned with the larger business.

## Domain Language

Architecture
: The significant structures and design decisions that shape a system's behavior and qualities.

Architectural Driver
: A prioritized requirement, constraint, quality attribute, or stakeholder concern that exerts significant influence on the architecture.

Business Driver
: An organizational goal or constraint, such as time to market, cost, regulation, revenue, or risk, that motivates the effort and shapes its priorities.

Emergent Architecture
: Architecture produced incrementally through implementation and evolution rather than fully specified in advance.

Enterprise Architecture
: The business-level capabilities, workflows, information, organization, and technology relationships that shape how an enterprise operates and changes.

Quality Attribute
: A measurable or observable characteristic describing how well a system operates, such as availability, performance, security, usability, maintainability, or testability.

Software Architecture
: The organization of components, responsibilities, interfaces, dependencies, and interactions within a software system.

System Architecture
: The organization and interaction of multiple technical and operational systems that together deliver a larger capability.

## Further Reading

Len Bass, Paul Clements, and Rick Kazman's [*Software Architecture in Practice, 4th Edition*](https://www.sei.cmu.edu/library/software-architecture-in-practice-fourth-edition/) provides a broader treatment of software architecture, quality attributes, business context, design, analysis, and evolution.

The SEI's [Attribute-Driven Design Method Collection](https://www.sei.cmu.edu/library/attribute-driven-design-method-collection/) explains how architectural drivers and quality attribute requirements can guide concrete design choices.

The SEI's [Views and Beyond Collection](https://www.sei.cmu.edu/library/views-and-beyond-collection/) focuses on documenting architecture for its stakeholders, while the [Architecture Tradeoff Analysis Method](https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/) focuses on evaluating architecture against quality goals and business drivers.
