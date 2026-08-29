# frozen_string_literal: true

# Keep tag archives out of sitemap.xml.
#
# _layouts/default.html marks these pages `noindex, follow`. Leaving them in the
# sitemap as well would ask Search Console to index a page we have just told it
# not to, which it reports as the error "Submitted URL marked 'noindex'". The
# sitemap should list only pages we actually want indexed.
#
# jekyll-archives builds these pages in a generator, so they never have front
# matter and `sitemap: false` cannot be written by hand. Setting the key on the
# page data afterwards is equivalent: jekyll-sitemap filters its page list with
# `where_exp:'doc','doc.sitemap != false'`, and Jekyll::Archives::PageDrop
# delegates `fallback_data` to the archive's data hash, so the key set here is
# what that filter reads.
#
# :pre_render is the hook that fits — generators have run by then, so the
# archive pages exist, but nothing has been rendered yet.
#
# Custom plugins run here because .github/workflows/deploy.yml builds with
# `bundle exec jekyll build` rather than the github-pages gem, which would
# ignore this directory.
Jekyll::Hooks.register :site, :pre_render do |site|
  site.pages.each do |page|
    page.data["sitemap"] = false if page.is_a?(Jekyll::Archives::Archive)
  end
end
