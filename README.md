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

Create `_projects/project-name.md`:

```markdown
---
title: "Project Name"
description: "One-line summary shown on the projects index."
site: "https://example.com"                        # optional
repo: "https://github.com/mattruggio/project-name" # optional
image: "/assets/images/project-name.png"           # optional
image_alt: "Screenshot of Project Name"            # optional
tech: [ruby, cli]
order: 1
---

Longer write-up in Markdown.
```

Projects are listed on `/projects/` sorted by `order`, and each gets its own page at
`/projects/project-name/`. `layout: project` is applied automatically. If `image` is set,
it renders as a banner on both the index card and the project page.

## Structure

```
_config.yml            site configuration
_drafts/               unpublished posts
_posts/                published blog posts
_projects/             project entries (one file per project)
_layouts/              page templates (default, home, page, post, projects, project)
_includes/             header and footer partials
assets/css/main.css    retro-terminal theme
assets/images/         project graphics
index.md               home page (post list)
about.md               about page
projects.md            projects index
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and
publishes it to GitHub Pages.

One-time setup: in the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**.
