# mattruggio.github.io

Personal blog and projects site, built with [Jekyll](https://jekyllrb.com) and deployed to
GitHub Pages at <https://mattruggio.github.io>.

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
---

Post body in Markdown. The first paragraph is used as the excerpt on the home page.
```

The `layout: post` front matter is applied automatically via `_config.yml` defaults, so
you don't need to declare it. Posts are published at `/:year/:month/:day/:title/`.

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
  tech: [ruby, cli]
```

Cards render in the order they appear in the file. The title links to `site`, and `image`
renders as a thumbnail beside the text.

If the list ever outgrows a column, promoting these back into a collection with real
project pages is the natural next step.

## Structure

```
_config.yml            site configuration
_data/projects.yml     projects shown on the home page
_drafts/               unpublished posts
_posts/                published blog posts
_layouts/              page templates (default, home, post)
_includes/             header and footer partials
assets/css/main.css    retro-terminal theme
assets/images/         project graphics
index.md               home page whoami block
```

The home page is the whole site: the `whoami` block, then writing and projects side by
side. It has no nav bar, since the `~/mattruggio` hero acts as the header. Posts get a
slim sticky header linking back home.

## Social links

The home page links to GitHub, LinkedIn, and the RSS feed. The LinkedIn URL comes from
`_config.yml`:

```yaml
linkedin_url: "https://www.linkedin.com/in/mattruggio"
```

If that value is left empty the link is simply not rendered, so nothing breaks.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and
publishes it to GitHub Pages.

One-time setup: in the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**.
