---
title: "Necessary Is Not Strategic"
date: 2026-08-21
tags: [strategy, build-vs-buy, engineering-leadership]
---

One of the easiest mistakes to make in software strategy is confusing necessary work with strategic work. A capability can be essential to your product without being strategically valuable to build. That distinction matters because every organization operates with finite engineering time, capital, and attention. If we treat every important capability as something we should own and build ourselves, we can spend enormous amounts of energy recreating things that only bring us up to the standard the market already expects.

The question I like to ask is simple:

> **If we build this successfully, will it move us ahead of the market, or will it simply help us catch up?**

I tend to think about that question in terms of **competitive advantages** and **competitive disadvantages**. A competitive advantage is something that meaningfully differentiates the product. It might be a capability competitors do not have, something your company is uniquely good at, or an area where your understanding of the problem creates an advantage that is difficult to reproduce. A competitive disadvantage is different. I do not mean that the capability itself is bad or unimportant. In many cases, it is absolutely necessary. The disadvantage is simply that you are investing resources into something the market already expects you to have. Success gets you to parity rather than setting you apart.

I saw this clearly while working in the payroll industry. If you are building a payroll product, you need a way for customers to enter payroll. Employees, hours, earnings, deductions, and other inputs all have to make their way into the system before payroll can be processed. There is nothing optional about that capability. At the same time, every serious payroll provider already has some version of it. If a newer company spends a year building a competent payroll entry experience, that work may be critical to the product, but at the end of the year the company has mostly accomplished what its competitors could already do. It has achieved parity. **The work was necessary, but it was not necessarily strategic.**

This is where the distinction becomes useful in **build versus buy** decisions. Engineering teams often start by asking whether they can build something better, how difficult an integration would be, or how much control they would give up by using a vendor. Those are all valid questions, but I think there is an earlier one: **is this a capability where we actually want to differentiate?** If the capability represents proprietary knowledge, a core part of the customer experience, or an area where the company can build an enduring advantage, internal investment may compound over time. If the goal is simply to meet an established industry standard, buying or integrating an existing solution may be the more strategic choice.

A useful rule of thumb is:

> **Build differentiation. Buy parity.**

It is not an absolute rule. Security, regulation, integration complexity, vendor risk, cost, or the absence of a suitable external option can all change the decision. The goal is not to create a rigid policy around what must be built or bought. The goal is to make the strategic value of the capability part of the decision.

The deeper issue is **opportunity cost**. The cost of building table stakes is not only the money spent on the project. It is also the differentiating work the organization did not pursue instead. Every year of engineering capacity invested in reproducing a commodity capability is a year that cannot be invested in deepening the areas where the company is uniquely positioned to win. That does not mean parity work should be avoided. Every product has table stakes, and sometimes closing an obvious gap is the most important thing a company can do. The strategic mistake is treating all necessary work as though it deserves the same level of internal investment.

That is why I keep coming back to the same question when thinking about roadmaps, platforms, and build versus buy decisions: **are we investing to participate, or are we investing to differentiate?** Both kinds of work may be necessary, but they serve very different purposes. Knowing which is which helps an organization protect its most limited resources for the capabilities that can actually become an advantage.

## TL;DR

A capability can be necessary to your product without being strategically valuable to build. Some investments create **competitive advantage** by differentiating the product, while others close a **competitive disadvantage** and bring the product to parity. When deciding where to spend engineering capacity, a useful default is to **build differentiation and buy parity**, while recognizing that security, regulation, vendor risk, integration complexity, and other constraints can change the calculus.

## Domain Language

Competitive Advantage
: A capability, asset, or area of expertise that meaningfully differentiates a company from its competitors and improves its ability to win in the market.

Competitive Disadvantage
: A gap between a product and the capabilities customers already expect from the market. Closing the gap may be necessary, but doing so generally creates parity rather than differentiation.

Parity
: The state in which a product meets the established capabilities or expectations of its competitors without meaningfully exceeding them.

Table Stakes
: Capabilities customers consider fundamental to participating in a market. Their absence can create a disadvantage, but their presence alone rarely creates an advantage.

Build versus Buy
: The strategic decision of whether a capability should be developed internally or obtained through an external product, platform, service, or vendor.

Opportunity Cost
: The value of the alternative work an organization gives up when it commits finite capital, engineering capacity, or attention to a particular investment.
