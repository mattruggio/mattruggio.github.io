---
layout: post
title: "Ruby Patterns I Reach For Over and Over"
date: 2026-04-19
tags: [ruby, patterns, software-design]
---

After years of writing Ruby, a handful of patterns have become so natural I barely think about them anymore. Here are the ones I reach for most often.

## Service Objects

When a controller action or model method starts doing too much, I extract it into a service object — a plain Ruby class with a single `call` method and a clear name.

```ruby
class CreateUserAccount
  def initialize(params)
    @params = params
  end

  def call
    user = User.create!(@params)
    WelcomeMailer.deliver_later(user)
    user
  end
end
```

Simple, testable, named after what it *does*. You can unit test it without touching your HTTP stack.

## Value Objects

When a concept in your domain deserves its own behavior and equality semantics, make it a first-class object.

```ruby
class Money
  attr_reader :amount, :currency

  def initialize(amount, currency)
    @amount   = amount
    @currency = currency
  end

  def ==(other)
    amount == other.amount && currency == other.currency
  end

  def +(other)
    raise ArgumentError, "currency mismatch" unless currency == other.currency
    Money.new(amount + other.amount, currency)
  end
end
```

No magic, no ActiveRecord. Just a Ruby object that models a real-world concept.

## The Null Object Pattern

Instead of sprinkling `if user.present?` everywhere, define a `GuestUser` or `NullUser` that responds to the same interface with safe defaults.

```ruby
class GuestUser
  def name    = "Guest"
  def admin?  = false
  def email   = nil
end
```

Code that calls `current_user.name` no longer needs to guard against nil.

---

None of these are groundbreaking. They've been written about by better engineers than me. But the value is in *reaching for them habitually* — making them the first tool you pick up when complexity starts to creep in.

More patterns in future posts.
