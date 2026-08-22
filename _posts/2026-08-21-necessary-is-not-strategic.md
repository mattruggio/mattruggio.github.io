---
title: "Necessary Is Not Strategic"
date: 2026-08-21
tags: [strategy, build-vs-buy, engineering-leadership]
description: "A capability can be necessary to your product without being strategically valuable to build. On competitive advantage, parity, and when to build versus buy."
image:
  path: /assets/images/og-necessary-is-not-strategic.png
  width: 1200
  height: 630
  alt: "Necessary Is Not Strategic"
---

One of the easiest mistakes to make in software strategy is confusing necessary work with strategic work. A capability can be essential to your product without being strategically valuable to build. That distinction matters because every organization operates with finite engineering time, capital, and attention. If we treat every important capability as something we should own ourselves, we can spend enormous amounts of energy recreating things that only bring us up to the standard the market already expects.

I did not arrive at this distinction because I consistently made the right build-versus-buy decisions. Some of the clarity came from looking back at systems I helped build and asking whether owning them actually made the business better at the things that mattered most. Earlier in my career, working in print, we built a considerable amount of custom software around running the business. In hindsight, I wonder whether we should have leaned more heavily on the job-shop systems already available and reserved more of our engineering capacity for the parts of the business where we could truly differentiate. We sometimes treated *specific to our business* as though it meant *strategic to our business*. Those are not the same thing.

That experience helped shape a question I still use today:

> **If we build this successfully, will it move us ahead of the market, or will it simply help us catch up?**

I think about that question in terms of **competitive advantages** and **competitive disadvantages**. A competitive advantage meaningfully differentiates the product. It might be a capability competitors do not have, an area where the company has unique expertise, or something that deepens the reason customers choose you. A competitive disadvantage is different. It is not necessarily bad or unimportant. In many cases, it is required. The disadvantage is that you are investing resources into something the market already expects. Success closes a gap and gets you to parity.

Payroll entry is a simple example. If you are building a payroll product, customers need a way to enter employees, hours, earnings, deductions, and other inputs. There is nothing optional about it. At the same time, every serious payroll provider already offers some version of that capability. A company could spend a year building an excellent payroll-entry experience and still emerge having mostly achieved what its competitors could already do. The work was necessary, but it was not necessarily strategic.

The same lesson can apply much deeper in the stack. In payroll, we also chose at times to build infrastructure ourselves, including a custom pub/sub eventing system, rather than relying on established technology such as [Apache Kafka](https://kafka.apache.org/documentation/) or another available solution. There were reasonable technical motivations for those decisions, and hindsight makes alternatives look simpler than they often were. Still, I would start with a different question today: **was owning eventing infrastructure part of our competitive advantage as a payroll company?** Probably not. Our best opportunities to differentiate lived much closer to the payroll domain.

This is a difficult instinct for engineers because we like to build. We value control, we see weaknesses in existing tools, and we often understand our own requirements better than a vendor does. Sometimes we genuinely can build something better. But **being able to build something better is not the same as that thing being strategically valuable to build**. That is why I think build-versus-buy decisions should begin with strategic value, not technical possibility. If a capability represents proprietary knowledge, a core customer experience, or an area where internal investment can create a durable advantage, building it may compound in value. If the goal is simply to meet an established standard, buying or integrating an existing solution may be the better use of the organization's time.

A useful rule of thumb is:

> **Build differentiation. Buy parity.**

It is not an absolute rule. Security, regulation, vendor risk, integration complexity, cost, or the lack of a suitable external option can all change the decision. The goal is not to create a rigid policy about what must be built or bought. It is to make the strategic value of the capability explicit before engineering momentum takes over.

The deeper issue is opportunity cost. Every year of engineering capacity invested in reproducing a commodity capability is a year that cannot be invested in the areas where the company is uniquely positioned to win. Sometimes closing a competitive gap is exactly the right thing to do, but we should recognize it for what it is. Necessary work allows us to participate. Strategic work gives us a reason to win.

That is the distinction I keep coming back to when thinking about roadmaps, platforms, and architecture decisions: **are we investing to participate, or are we investing to differentiate?** Both may be necessary, but they serve very different purposes. Knowing which is which helps protect our most limited resources for the capabilities that can actually become an advantage.

## TL;DR

A capability can be necessary to your product without being strategically valuable to build. Some investments create **competitive advantage** by differentiating the product, while others close a **competitive disadvantage** and bring the product to parity. A useful default is to **build differentiation and buy parity**, while recognizing that real-world constraints can change the decision.

## Domain Language

Competitive Advantage
: A capability, asset, or area of expertise that meaningfully differentiates a company from its competitors and improves its ability to win in the market.

Competitive Disadvantage
: A gap between a product and the capabilities customers already expect from the market. Closing the gap may be necessary, but doing so generally creates parity rather than differentiation.

Opportunity Cost
: The value of the alternative work an organization gives up when it commits finite capital, engineering capacity, or attention to a particular investment.

Table Stakes
: Capabilities customers consider fundamental to participating in a market. Their absence creates a disadvantage, but their presence alone rarely creates an advantage.

## Further Reading

Michael Porter's [*What Is Strategy?*](https://hbr.org/1996/11/what-is-strategy) explores the distinction between operational effectiveness and strategic positioning, which overlaps with the idea in this essay that necessary capabilities do not always create strategic advantage.
