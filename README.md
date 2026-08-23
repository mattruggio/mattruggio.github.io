# mattruggio.github.io

Personal blog and projects site, built with [Jekyll](https://jekyllrb.com) and deployed to
GitHub Pages at <https://rugg.io>.

The repository keeps its `mattruggio.github.io` name; the site is served from the custom
apex domain `rugg.io`, configured by the `CNAME` file at the repository root. See
[Custom domain](#custom-domain) below.

## Requirements

Ruby is pinned in `.tool-versions` for [asdf](https://asdf-vm.com):

```
asdf install
```

## Local development

```
bundle install
bundle exec jekyll serve
```

The site is served at <http://127.0.0.1:4000>. Add `--drafts` to preview unpublished
posts, and `--livereload` to auto-refresh the browser.

```
bundle exec jekyll serve --drafts --livereload
```

Build without serving:

```
bundle exec jekyll build
```

## Writing a post

Create `_posts/YYYY-MM-DD-slug.md`:

```markdown
---
title: "Your Post Title"
date: 2026-08-21
tags: [ruby, testing]
description: "One or two sentences, under ~155 characters."
image:
  path: /assets/images/og-your-post-slug.png
  width: 1200
  height: 630
  alt: "Your Post Title"
---

Post body in Markdown. The first paragraph is used as the excerpt on the home page.
```

The `layout: post` front matter is applied automatically via `_config.yml` defaults, so
you don't need to declare it. Posts are published at `/:year/:month/:day/:title/`.

`description` and `image` are both optional but worth setting:

- Without `description`, jekyll-seo-tag falls back to the auto-excerpt, which is the
  entire first paragraph. Search engines cut the snippet off around 155 characters, so a
  long excerpt gets truncated mid-sentence.
- Without `image`, the post falls back to the site-wide card
  (`/assets/images/og-default.png`). A per-post card is nicer when the link is shared.

### Social sharing cards

Cards are generated ahead of time and checked in — Jekyll has no image pipeline. The
generator matches the site's palette and typeface:

```bash
python3 script/og-image.py --title "Your Post Title" \
                           --out assets/images/og-your-post-slug.png
```

It needs Pillow (`pip install Pillow`) and downloads IBM Plex Mono into `.cache/fonts/`
on first run. `--default` rewrites the site-wide card and `--favicons` rewrites
`favicon.ico` and the Apple touch icon; neither is needed for a normal post.

Note that jekyll-seo-tag reads `image` from the **page**, never from a top-level site
key. The default card is therefore applied through a `defaults` block in `_config.yml`
rather than a `site.image` setting, which would silently do nothing.

### Drafts

Work-in-progress posts go in `_drafts/` with no date in the filename (e.g.
`_drafts/my-idea.md`). They are excluded from builds until you move them into `_posts/`
with a dated filename.

## Adding a project

Projects have no pages of their own — they render as cards in the Projects column on the
home page. Add an entry to `_data/projects.yml`:

```yaml
- title: "Project Name"
  description: "A sentence or two shown on the card."
  site: "https://example.com"                        # optional
  repo: "https://github.com/mattruggio/project-name" # optional
  image: "/assets/images/project-name.png"           # optional
  image_alt: "Screenshot of Project Name"            # optional
  note: "private — no public site"                   # optional
  tech: [ruby, cli]
```

Cards render in the order they appear in the file. The title links to `site`, and `image`
renders as a thumbnail beside the text.

Everything except `title`, `description`, and `tech` is optional. Omit `site` for private or
login-only products, where sending a reader to a sign-in form would be a dead end: the title
then renders as plain text and the `[ visit ]` link is suppressed rather than emitted empty.

`note` fills the links row for those cards — shown in parentheses, in a muted colour, so it
cannot be mistaken for a link and so the missing `[ visit ]` reads as deliberate rather than
as an oversight. It is ignored when `site` or `repo` is present.

If the list ever outgrows a column, promoting these back into a collection with real
project pages is the natural next step.

## Structure

```
_config.yml            site configuration
_data/gems.yml         published RubyGems shown on the home page
_data/projects.yml     projects shown on the home page
_drafts/               unpublished posts, including the syntax test page
_posts/                published blog posts
_layouts/              page templates (default, home, post)
_includes/             header, footer, and analytics partials
_includes/icons/       inlined Font Awesome SVGs (see its LICENSE.md)
assets/css/main.css    retro-terminal theme, @font-face, and the Rouge theme
assets/fonts/          self-hosted woff2 files (see its LICENSE.md)
assets/images/         project graphics and social cards
script/gems.rb         refreshes gem versions from the RubyGems API
script/og-image.py     social card and favicon generator
404.html               terminal-styled not-found page
index.md               home page whoami block
```

The home page is the whole site: the `whoami` block, then writing and projects side by
side, then the open source listing. It has no nav bar, since the `~/mattruggio` hero acts
as the header. Posts get a slim sticky header linking back home.

## Code blocks

Fenced blocks are highlighted by Rouge. The theme lives at the bottom of
`assets/css/main.css` and assigns hues **by role** — keyword, string, type, function,
variable — rather than per language, so a token means the same thing everywhere. When
adding a Rouge class, put it in the group it belongs to instead of picking a new colour.

`_drafts/syntax-test.md` renders Ruby, Go, JavaScript, C#, shell, YAML, and diff samples
for checking coverage. It is dated far in the future so it needs both flags and can never
publish by accident:

```bash
bundle exec jekyll serve --drafts --future
```

To check for gaps mechanically, diff the classes Rouge emits against the ones the
stylesheet targets:

```bash
ruby -e 'require "rouge"; puts Rouge::Formatters::HTML.new.format(
  Rouge::Lexers::Ruby.new.lex(File.read("some.rb"))
).scan(/class="([a-z]+)"/).flatten.uniq.sort.join(" ")'
```

## Analytics

Set `goatcounter_code` in `_config.yml` to the code from your
[GoatCounter](https://www.goatcounter.com) site (the `CODE` in `CODE.goatcounter.com`).
While it is empty, no script is rendered at all.

The snippet only loads in production builds, so `jekyll serve` never inflates the numbers.
GoatCounter sets no cookies and stores no personal data, so no consent banner is needed.

## Open source

The `open source` section on the home page is driven by `_data/gems.yml`, styled to look like
`gem list` output. Each entry needs a name, version, one-line description, and repo/gem URLs.
Entries are ordered alphabetically, matching what the real command prints.

Descriptions are hand-written on purpose — the summaries published on RubyGems run several
sentences and are far too long for a single-line listing. Keep them under about 60 characters:
past that they wrap onto a second line and the listing stops reading like command output.

Each row links the gem name to RubyGems and carries a `[ source ]` link to `repo` on the right.
That column is plain text rather than a repeated GitHub mark — seven identical icons in a column
read as texture rather than as links.

To refresh versions after a release:

```bash
ruby script/gems.rb           # rewrite _data/gems.yml in place
ruby script/gems.rb --check   # report drift without writing; exits 1 if stale
```

The script only touches `version`, so hand-written descriptions survive a refresh. It rewrites the
file textually rather than dumping parsed YAML, which keeps the header comment and avoids
requoting every string into an unreviewable diff.

Download counts are deliberately not shown. RubyGems totals include mirrors, CI, and bots, so
publishing them would overstate real reach.

This is run by hand rather than on a schedule. A scheduled workflow committing with `GITHUB_TOKEN`
would not trigger the deploy workflow — GitHub suppresses workflow-triggered pushes to prevent
loops — so the versions would update in the repository but never reach the site.

## Post discussions

There is no comment system, by design. Discussion happens where technical readers already are.
After submitting a post, add either or both ids to its front matter:

```yaml
hn: 41234567        # the id in news.ycombinator.com/item?id=...
lobsters: mbmn1f    # the short id in lobste.rs/s/...
```

That renders `$ discuss [ hacker news ] [ lobste.rs ]` above the back-link. With neither key set
the block does not render at all, so there is never a dead link.

## Fonts

IBM Plex Sans, IBM Plex Mono, and VT323 are self-hosted from `assets/fonts` rather than
loaded from Google Fonts. That removes two third-party origins from the critical path and
stops disclosing visitor IPs to a third party for a decorative asset. Only the latin
subset is vendored (~132 KB across seven faces).

The `@font-face` declarations sit at the top of `assets/css/main.css`; the two faces used
above the fold are preloaded in `_layouts/default.html`. See `assets/fonts/LICENSE.md` for
licensing and how to regenerate the files.

## Icons

Icons are vendored Font Awesome artwork, inlined with `{% include icons/name.svg %}`
rather than loaded as an icon font — the full release is 6.5 MB and the five icons in
use total under 4 KB. They inherit `currentColor`, so hover states need no extra rules.
Adding one is described in `_includes/icons/LICENSE.md`.

They are reserved for brand marks, the feed icon, and the RubyGems link, where a pictogram
is recognised faster than the word. Directional and action links use text and arrows instead.

`gem.svg` is the one exception to the brand-mark rule: Font Awesome Free ships no RubyGems
mark, so the generic solid gem stands in for it. It reads correctly in context and keeps every
icon on the site under a single licence.

## Social links

The home page links to GitHub, LinkedIn, YouTube Music, and the RSS feed. The LinkedIn and
YouTube URLs come from `_config.yml`:

```yaml
linkedin_url: "https://www.linkedin.com/in/mattruggio"
youtube_url: "https://music.youtube.com/@mattruggio"
```

If either value is left empty the link is simply not rendered, so nothing breaks.

The YouTube link is labelled `music` rather than `youtube`. The icon already identifies the
platform, so the label is free to describe what's actually there — playlists rather than
videos, which is what "youtube" would imply.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and
publishes it to GitHub Pages.

One-time setup: in the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**.

## Custom domain

The site is served from the apex domain `rugg.io`. Two things make that work:

1. The `CNAME` file at the repository root, containing `rugg.io`. Jekyll copies it into
   `_site/` on every build, and GitHub Pages reads it to set the custom domain. **Deleting
   it unsets the domain**, so leave it in place.
2. `url:` in `_config.yml`, which must match. Canonical tags, Open Graph URLs, the
   sitemap, and the feed are all built from it — DNS alone is not enough.

### DNS records

Apex domains cannot use a `CNAME` record, so they point at GitHub's Pages IPs directly:

| Type | Name | Value |
|------|------|-------|
| A    | `@`  | `185.199.108.153` |
| A    | `@`  | `185.199.109.153` |
| A    | `@`  | `185.199.110.153` |
| A    | `@`  | `185.199.111.153` |
| AAAA | `@`  | `2606:50c0:8000::153` |
| AAAA | `@`  | `2606:50c0:8001::153` |
| AAAA | `@`  | `2606:50c0:8002::153` |
| AAAA | `@`  | `2606:50c0:8003::153` |
| CNAME | `www` | `mattruggio.github.io.` |

All four A records are needed — they are redundant endpoints, not alternatives. The AAAA
records add IPv6 and are optional but recommended. The `www` record is optional; with it,
GitHub redirects `www.rugg.io` to the apex automatically.

After DNS propagates, set the domain under **Settings → Pages → Custom domain** and enable
**Enforce HTTPS** once the certificate is issued (this can take up to 24 hours).

`mattruggio.github.io` keeps working: GitHub redirects it to the custom domain, so old
links and any existing search results are preserved.

### Subdomains stay available

Serving the blog from the apex does not consume `rugg.io` for other uses. Any subdomain
(`retro.rugg.io`, and so on) can point somewhere else entirely. What the apex costs is the
option of using `rugg.io` itself as a landing page for several properties.
