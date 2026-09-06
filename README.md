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

`last_modified_at` is a third optional field, for when a published post gets a
substantive revision:

```yaml
last_modified_at: 2026-09-15
```

It feeds `dateModified` in the post's JSON-LD and `lastmod` in `sitemap.xml`, both of
which otherwise report the original publication date forever. Set it by hand and only for
revisions that change what the post *says*: a typo fix is not worth re-dating, and a
sitemap that claims everything changed recently tells a crawler nothing.

This is deliberately manual. The `jekyll-last-modified-at` plugin derives the date from
git history instead, but `actions/checkout` clones at `fetch-depth: 1`, so in CI it would
read a commit date that isn't there and publish a wrong one.

### Social sharing cards

Cards are generated ahead of time and checked in, since Jekyll has no image pipeline. The
generator matches the site's palette and typeface:

```bash
python3 script/og-image.py --title "Your Post Title" \
                           --blurb "One line saying what the post is about" \
                           --out assets/images/og-your-post-slug.png
```

It needs Pillow (`pip install Pillow`) and downloads IBM Plex Mono into `.cache/fonts/`
on first run. `--default` rewrites the site-wide card and `--favicons` rewrites
`favicon.ico` and the Apple touch icon; neither is needed for a normal post.

**Every post card carries a blurb, so give new ones one too.** The card is the only
place a title appears with no surrounding context: in a Slack or LinkedIn preview
there is no excerpt and no tags to lean on, so a title like "How to Draw Software
Cartoons" reads as being about comic strips. The blurb is the fix. Keep it to **57
characters**, which is one line at the card's 30px mono; longer wraps to two and
starts competing with the title. The front matter `description` is far too long to
reuse here, so write a short one by hand. The current set:

| Post | Blurb |
| --- | --- |
| Necessary Is Not Strategic | On competitive advantage, parity, and build versus buy |
| Architecture at Three Levels | Enterprise, system, and software, and how they align |
| Sprinkling in Domain-Driven Design | Ubiquitous language, isolation, and bounded context |
| How to Draw Software Cartoons | A formula for lightweight architecture documentation |

Note that jekyll-seo-tag reads `image` from the **page**, never from a top-level site
key. The default card is therefore applied through a `defaults` block in `_config.yml`
rather than a `site.image` setting, which would silently do nothing.

### Diagrams

Diagrams live in `_includes/diagrams/` and are placed in a post with Liquid:

```liquid
{% include diagrams/your-diagram.html %}
```

**They are built as HTML and CSS, not as SVG or a linked image.** Two reasons, both learned
the hard way:

- An SVG scales as a single unit. Type sized to look right in the 68ch content column is
  rendered at roughly half that on a phone, so it can be legible at one width or the other
  but not both. HTML inherits the page's type scale and wraps at any width.
- An SVG loaded through `<img>` is an isolated document: it cannot reach the page's
  `@font-face` rules or its CSS custom properties, so it silently falls back to system fonts
  and to whatever colours are hardcoded in the file.

Style diagrams with the palette variables (`var(--green)`, `var(--bg-card)`, `var(--border)`,
`var(--muted)`) so they track the theme for free. Keep diagram titles at `h3` size or smaller
and use `<p>` rather than a heading element: a diagram should never outrank a real heading
or inject entries into the document outline.

**The one exception is geometry.** `flattening-a-system.html` is an *inline* `<svg>`, because
an isometric cube has no honest expression in flow layout: boxes-and-labels is what HTML is
good at, and this drawing is neither. Both objections above are weaker for that case. The
type-scaling one barely applies to a figure carrying two short labels, and the isolated
document one does not apply at all, since an inline SVG sits in the page and resolves
`var(--green)` and `var(--font-mono)` exactly like any other element. An SVG in an `<img>`
still cannot, so keep it inline.

Its geometry is generated rather than hand-written. Isometric points are easy to get subtly
wrong, and the first attempt drew the cube's vertical edge running up from the centre of the
hexagon instead of down, which renders as a hollow box rather than a solid. If you need to
change the cut position or the extraction offset, recompute the polygons from the projection
rather than nudging coordinates by eye.

Two things there are load-bearing and look like styling. Faces are painted opaque before they
are tinted, because translucent fills let the far half of the cube show its edges through the
near half and the solid collapses into a set of overlapping planes. And the polygons are
emitted strictly back to front, which is the only reason the slice reads as half extracted:
the near half of the cube has to paint over the buried portion of it.

To preview one without a browser, substitute the custom properties for literals and render
it, since `rsvg-convert` has no page context to resolve them from:

```bash
sed -e 's/var(--text)/#c8c8c8/g; s/var(--green-dim)/#1a7a08/g; s/var(--green)/#39ff14/g' \
    -e 's/var(--muted)/#909090/g; s/var(--font-mono)/monospace/g' \
    _includes/diagrams/flattening-a-system.html \
  | sed 's/<figure[^>]*>//; s/<\/figure>//' \
  | rsvg-convert -w 640 -b '#0d0d0d' -o /tmp/diagram.png
```

### Punctuation

**No em dashes anywhere in this repository**, including prose, code comments, and rendered
UI. Use a colon where the second half explains the first, parentheses or commas for an
aside, and a full stop where the two halves are really separate sentences.

Where a dash was doing layout work rather than grammar, such as between a post's date and
its reading time, use the `.meta-row` class instead. It draws a real vertical rule between
items, which says "separate fields" rather than implying the two are one sentence.

Check before committing:

```bash
grep -rn '—\|&mdash;' --include=*.html --include=*.md --include=*.yml --include=*.css . \
  | grep -v '^./_site'
```

### Reading time

Every post shows an estimated reading time, both on the post itself and in the listings on
the home page and tag archives. It is computed at build time from the post's own content,
so **there is nothing to set in front matter.**

The estimate assumes 200 words per minute and rounds to the nearest minute. That figure is
deliberately conservative: over-estimating is the safer error, since a reader who finishes
early is never disappointed.

**This number is only honest because these posts are prose.** Reading time is meaningless
for code, which nobody reads top-to-bottom at a fixed rate, so a code-heavy post would need
`_includes/read-time.html` reconsidered rather than merely retuned.

### Drafts

Work-in-progress posts go in `_drafts/` with no date in the filename (e.g.
`_drafts/my-idea.md`). They are excluded from builds until you move them into `_posts/`
with a dated filename.

### Tags

Tag pages are generated automatically by [jekyll-archives][archives]. **Adding a tag to a
post's front matter is the only step**: there is no stub file to create, and removing the
last post carrying a tag removes its page on the next build.

Each tag gets an archive at `/tags/:name/`, and `tags.html` lists all of them at `/tags/`,
linked from the `writing` heading on the home page. Tag names are slugified in URLs, so
`engineering-leadership` becomes `/tags/engineering-leadership/`.

Two things worth knowing before editing `_layouts/tag.html`:

- The tag name is `page.title`, **not** `page.tag`. The plugin's `PageDrop` only exposes
  `posts`, `type`, `title`, `date`, `name`, `path`, `url`, and `permalink`. Reaching for
  `page.tag` fails silently and renders an empty heading.
- This works on GitHub Pages only because the deploy workflow runs `bundle exec jekyll
  build` itself. `jekyll-archives` is not on the Pages plugin whitelist, so the hosted
  builder would ignore it.

Tag chips are cyan because they are links. Grey chips are not: a project's `tech` list
(`.tag--static`) describes a stack rather than a taxonomy and has no page behind it, and
the current tag on its own archive page (`.tag--current`) is dashed to mark "you are here."

**Individual tag archives are deliberately not indexed.** `_layouts/default.html` marks
any page with `page.type == 'tag'` as `noindex, follow`, and
`_plugins/exclude_archives_from_sitemap.rb` keeps them out of `sitemap.xml`. Most hold a
single post and all of them inherit the site-wide description, so indexing them would put
thin near-duplicates into search results competing with the posts they link to. `follow`
matters: the pages stay crawlable and still pass link equity through. `/tags/` itself is a
real page and stays indexed.

The two halves ship together on purpose. A URL that is listed in a sitemap *and* marked
`noindex` is reported by Search Console as the error "Submitted URL marked 'noindex'", so
doing either one alone is worse than doing neither.

[archives]: https://github.com/jekyll/jekyll-archives

## Adding a project

Projects have no pages of their own: they render as cards in the Projects column on the
home page. Add an entry to `_data/projects.yml`:

```yaml
- title: "Project Name"
  description: "A sentence or two shown on the card."
  site: "https://example.com"                        # optional
  repo: "https://github.com/mattruggio/project-name" # optional
  image: "/assets/images/project-name.png"           # optional
  image_alt: "Screenshot of Project Name"            # optional
  tech: [ruby, cli]
```

Cards render in the order they appear in the file. Both the title and the `image` thumbnail
link to `site`, so there is no separate call-to-action link: a third anchor pointing at the
same URL would say nothing the title has not already said. The links row carries only
`[ source ]`, and appears only when `repo` is set.

Everything except `title` and `description` is optional. Omit `site` for private or
login-only products, where sending a reader to a sign-in form would be a dead end: the title
then renders as plain text and the thumbnail is left unlinked.

If the list ever outgrows a column, promoting these back into a collection with real
project pages is the natural next step.

## Structure

```
_config.yml            site configuration
CONTENT-LICENSE.md     what the MIT license does and does not cover
_data/projects.yml     projects shown on the home page
_drafts/               unpublished posts, including the syntax test page
_posts/                published blog posts
_layouts/              page templates (default, home, post, tag)
_includes/             header, footer, analytics, and Person schema partials
_includes/read-time.html  estimated reading time, shown on posts and listings
_includes/icons/       inlined Font Awesome SVGs (see its LICENSE.md)
_includes/diagrams/    post diagrams, built as HTML and themed via CSS variables
_plugins/              build-time Ruby hooks (see below)
assets/css/main.css    retro-terminal theme, @font-face, and the Rouge theme
assets/css/blackjack.css  styles for /blackjack/ only, loaded per page
assets/js/blackjack.js    the blackjack game, the only script on the site
assets/fonts/          self-hosted woff2 files (see its LICENSE.md)
assets/images/         project graphics and social cards
script/og-image.py     social card and favicon generator
404.html               terminal-styled not-found page
blackjack.html         the blackjack table (see below)
index.md               home page whoami block
tags.html              index of every tag, linked from the writing heading
```

The home page is the whole site: the `whoami` block, then writing and projects side by
side. It has no nav bar, since the `~/mattruggio` hero acts as the header. Posts get a
slim sticky header linking back home.

**`_plugins/` runs only because the deploy workflow builds the site itself** with `bundle
exec jekyll build`. The hosted GitHub Pages builder ignores custom plugins entirely, so
anything added here silently does nothing if the workflow is ever replaced with the stock
Pages build. The same caveat applies to `jekyll-archives`.

## Code blocks

Fenced blocks are highlighted by Rouge. The theme lives at the bottom of
`assets/css/main.css` and assigns hues **by role** (keyword, string, type, function,
variable) rather than per language, so a token means the same thing everywhere. When
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

## Blackjack

`/blackjack/` is a game of blackjack, styled like the rest of the site. It is the only
page with JavaScript, the only page with its own stylesheet, and it talks to nothing.

**It is an easter egg.** Nothing links to it except the dim π in the lower right of the
footer, a nod to the disc in *The Net*. The page carries `noindex: true` and
`sitemap: false` in its front matter, because a hidden page that turns up in a `site:`
search is not hidden. `noindex: true` is a general hook read by `_layouts/default.html`;
any page can use it.

House rules, which the page also states for the player: six-deck shoe reshuffled below a
deck, dealer stands on all 17, blackjack pays 3 to 2, dealer peeks when the upcard can
make 21, double on the first two cards only, no split, no insurance. Chips live in
`localStorage` and nowhere else.

**Per-page assets.** `_layouts/default.html` reads two optional front matter keys so a
single page can carry its own files without taxing the other twelve:

```yaml
stylesheet: /assets/css/blackjack.css
script: /assets/js/blackjack.js
```

The script is emitted with `defer`, after the footer. Both blocks render nothing when the
key is absent, which is the case everywhere else.

**Why the card suits are hand-drawn SVG.** They are neither Unicode characters nor Font
Awesome. The vendored fonts are latin-subset, so `♠ ♥ ♦ ♣` (U+2660..2666) are not in
them; the browser would fall back per glyph, and on many systems that fallback is colour
emoji. The card frames are CSS borders for the same reason: box-drawing characters
(U+2500..257F) are missing too, and mismatched advance widths would pull the boxes out of
alignment. Font Awesome Free has no spade or club, and the Pro ones cannot be
redistributed from a public repository. The footer's π is hand-drawn for the same
reason: `U+03C0` is not in the subset either.

**Colour.** Red suits and losing hands use `--syn-var`, the red the palette already has
and that `.notfound-err` already borrows, rather than introducing a new one. Buttons are
amber, because amber means interactive everywhere on this site.

The game markup is addressed entirely through `data-bj` attributes, so the seam between
template and script is obvious from either side, and the DOM is built with `textContent`
and `createElement` rather than `innerHTML`.

## Analytics

Set `goatcounter_code` in `_config.yml` to the code from your
[GoatCounter](https://www.goatcounter.com) site (the `CODE` in `CODE.goatcounter.com`).
While it is empty, no script is rendered at all.

The snippet only loads in production builds, so `jekyll serve` never inflates the numbers.
GoatCounter sets no cookies and stores no personal data, so no consent banner is needed.

## Fonts

IBM Plex Sans, IBM Plex Mono, and VT323 are self-hosted from `assets/fonts` rather than
loaded from Google Fonts. That removes two third-party origins from the critical path and
stops disclosing visitor IPs to a third party for a decorative asset. Only the latin
subset is vendored (~135 KB across seven faces).

The `@font-face` declarations sit at the top of `assets/css/main.css`; the two faces used
above the fold are preloaded in `_layouts/default.html`. See `assets/fonts/LICENSE.md` for
licensing and how to regenerate the files.

## Icons

Icons are vendored Font Awesome artwork, inlined with `{% include icons/name.svg %}`
rather than loaded as an icon font: the full release is 6.5 MB and the eight icons in
use total under 5 KB. They inherit `currentColor`, so hover states need no extra rules.
Adding one is described in `_includes/icons/LICENSE.md`.

They are reserved for brand marks and the feed icon, where a pictogram is recognised
faster than the word. Directional and action links use text and arrows instead.

`pi.svg` is the one exception to all of the above: it is original artwork, not Font
Awesome. It is drawn rather than typed because `U+03C0` is missing from every one of the
site's subset webfonts, so the character would fall back to whatever the system had. The
card suits on `/blackjack/` are original for the same class of reason, but live as path
data inside `assets/js/blackjack.js`: a spade and a club are Pro-only upstream, and
redistributing a Pro icon from a public repository is not allowed even with a valid Pro
licence.

## Social links

The home page links to GitHub, LinkedIn, YouTube Music, and the RSS feed. The LinkedIn and
YouTube URLs come from `_config.yml`:

```yaml
linkedin_url: "https://www.linkedin.com/in/mattruggio"
youtube_url: "https://music.youtube.com/@mattruggio"
```

If either value is left empty the link is simply not rendered, so nothing breaks.

The YouTube link is labelled `music` rather than `youtube`. The icon already identifies the
platform, so the label is free to describe what's actually there: playlists rather than
videos, which is what "youtube" would imply.

The footer carries a `source` link to this repository, from `repo_url`:

```yaml
repo_url: "https://github.com/mattruggio/mattruggio.github.io"
```

It is kept separate from `github_username` because it points at the site's own source
rather than at the profile. Empty it while the repository is private (a public link into
a private repo 404s for every visitor), and note that it only reads as an invitation
because `LICENSE` exists. Without one, it points at code nobody is permitted to reuse.

### sameAs (structured data)

A separate `social:` block in `_config.yml` feeds jekyll-seo-tag, which emits the URLs as
schema.org `sameAs`, the documented way to tell a search engine that these profiles are the
same entity rather than four accounts that happen to share a name.

**These URLs are duplicated,** because Jekyll does not interpolate values inside `_config.yml`.
Changing `linkedin_url` or `youtube_url` does not update `social.links`. Keep both in sync by
hand, and check with:

```bash
bundle exec jekyll build
grep -o '"sameAs":[^]]*]' _site/index.html
```

Two behaviours of the gem are worth knowing: `sameAs` is emitted only on the home page and
`/about` (posts do not carry it), and it attaches to the top-level `WebSite` entity rather than
to the nested `Person`.

`_includes/person-schema.html` is the hand-written second JSON-LD block that fills that
gap, emitted on every page from `_layouts/default.html`:

```json
{ "@type": "Person", "@id": "https://rugg.io/#person", "name": "…", "url": "…", "sameAs": [ … ] }
```

The `@id` is the point of it. A stable node identifier lets a crawler merge these
statements into one entity across the whole site, instead of reading each page's author as
a new person who happens to share a name. Without it, every post credits an unidentified
`Matt Ruggio` while the links that would resolve which one sit on a different entity on a
different page.

Its `sameAs` array loops `site.social.links` rather than repeating the URLs, so this block
is not a third copy to keep in sync. Emitting several `ld+json` blocks on one page is
valid; the two describe different nodes and do not conflict. After changing it, confirm
both blocks still parse:

```bash
bundle exec jekyll build
grep -o '<script type="application/ld+json">.*</script>' _site/index.html
```

Do not list a profile here that is empty or abandoned: an entity link to a dead account is
worse than no link.

## Search Console

Verify the site in [Google Search Console][gsc] as a **Domain property, using a DNS TXT
record** rather than the HTML meta tag. A domain property covers `http` and `https`, apex
and `www`, and every subdomain in one place, and it cannot be broken by a template edit.
`jekyll-seo-tag` can emit a verification meta tag from `webmaster_verifications.google` in
`_config.yml` if that is ever preferred, but it verifies less and is easier to lose.

Submit `https://rugg.io/sitemap.xml` there once verified. It lists posts, the home page,
and `/tags/` only. See the Tags section for why the individual tag archives are excluded.

[gsc]: https://search.google.com/search-console

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
   sitemap, and the feed are all built from it. DNS alone is not enough.

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

All four A records are needed: they are redundant endpoints, not alternatives. The AAAA
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

## License

Split deliberately, because the two halves of this repository want different answers:

- **Code** (layouts, includes, `assets/css/main.css`, `script/`, configuration) is
  [MIT](LICENSE). Reuse the theme freely.
- **Writing and images** (`_posts/`, `_drafts/`, the bio copy in `index.md`, and
  `assets/images/`) are all rights reserved. Linking and short quotes with attribution
  are explicitly fine; full republication needs a quick ask.

A single MIT file covering the whole repository would license away the essays, which is
not the intent. `LICENSE` is kept as unmodified MIT text so GitHub still detects it;
[CONTENT-LICENSE.md](CONTENT-LICENSE.md) carries the scope, and it also points at the
separate terms for the vendored fonts and icons, which neither license covers.
