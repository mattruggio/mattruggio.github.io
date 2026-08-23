---
title: "Syntax highlighting test page"
date: 2099-01-01
tags: [test]
description: "Local-only page for checking Rouge syntax highlighting coverage."
---

A scratch page for eyeballing the Rouge theme. It lives in `_drafts/` and is dated
far in the future, so two flags are needed and it can never be published by
accident:

```bash
bundle exec jekyll serve --drafts --future
```

If a token renders as plain body text when it should not, add its Rouge class to
the matching group in the syntax block in `assets/css/main.css`.

## Ruby

```ruby
# frozen_string_literal: true

require "bigdecimal"

module Payroll
  STATUSES = %i[draft posted voided].freeze
  RATE_PATTERN = /\A\d+(\.\d{1,2})?\z/

  class Entry < ApplicationRecord
    include Comparable

    attr_reader :hours, :rate

    def initialize(hours:, rate: BigDecimal("0"))
      @hours = hours
      @rate  = rate
      raise ArgumentError, "bad rate: #{rate}" unless rate.to_s =~ RATE_PATTERN
    end

    def gross
      (@hours * @rate).round(2)
    end

    def self.build(**opts) = new(**opts)

    private

    def audit!(status = :draft)
      Rails.logger.info("entry #{id} -> #{status}\n")
      true && !false
    end
  end
end
```

## Go

```go
package payroll

import (
	"errors"
	"fmt"
)

type Entry struct {
	Hours float64 `json:"hours"`
	Rate  float64 `json:"rate"`
}

var ErrNegative = errors.New("negative hours")

func (e *Entry) Gross() (float64, error) {
	if e.Hours < 0 {
		return 0, fmt.Errorf("gross: %w", ErrNegative)
	}
	return e.Hours * e.Rate, nil
}
```

## JavaScript

```javascript
import { round } from "./math.js";

const STATUSES = ["draft", "posted"];

export class Entry {
  #rate = 0;

  constructor({ hours, rate = 0 }) {
    this.hours = hours;
    this.#rate = rate;
  }

  get gross() {
    return round(this.hours * this.#rate, 2);
  }

  static async load(id) {
    const res = await fetch(`/entries/${id}`);
    if (!res.ok) throw new Error(`failed: ${res.status}`);
    return new Entry(await res.json());
  }
}
```

## C#

```csharp
using System;
using System.Collections.Generic;

namespace Payroll
{
    public record Entry(decimal Hours, decimal Rate)
    {
        private const int Scale = 2;

        public decimal Gross => Math.Round(Hours * Rate, Scale);

        public static IEnumerable<Entry> Load(IEnumerable<string> rows)
        {
            foreach (var row in rows)
            {
                yield return Parse(row);
            }
        }
    }
}
```

## Shell

```bash
#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-rugg.io}"

for record in $(dig +short "$DOMAIN" A); do
  printf '%-16s %s\n' "$record" "ok"
done
```

## YAML

```yaml
plugins:
  - jekyll-feed
  - jekyll-seo-tag

defaults:
  - scope:
      path: ""
    values:
      image:
        width: 1200
        alt: "rugg.io"
```

## Diff

```diff
--- a/_config.yml
+++ b/_config.yml
@@ -6,7 +6,7 @@
-url: "https://mattruggio.github.io"
+url: "https://rugg.io"
 baseurl: ""
```

## Inline and plain

Inline `code` spans stay amber, and a fenced block with no language should render
as plain text:

```
no lexer here, just text
```
