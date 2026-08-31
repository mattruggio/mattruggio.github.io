The SVGs in this directory are vendored from Font Awesome Free 6.7.2, with one
exception noted below.

- Source: https://github.com/FortAwesome/Font-Awesome
- Icons: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Copyright 2024 Fonticons, Inc.

Only the artwork is vendored, not the icon font or its CSS. Each file has had
its `xmlns` and license comment stripped and `class`, `fill`, and `aria-hidden`
added so it can be inlined directly into a page and inherit `currentColor`.
The full 6.5 MB Font Awesome release is not a reasonable dependency for seven
icons, so the paths are copied verbatim and attributed here instead.

`pi.svg` is **not** Font Awesome and is not CC BY. It is original artwork,
covered by this repository's own license. It is the footer easter egg that opens
`/blackjack/`, drawn here rather than typed as a character because `U+03C0` is
absent from all seven of the site's subset webfonts.

The card suits on `/blackjack/` are original artwork too, but they live as raw
path data in `assets/js/blackjack.js` rather than as includes, since the script
builds card faces at runtime. A spade and a club are Pro-only upstream, and
redistributing a Pro icon from a public repository is not permitted even with a
valid Pro license.

To add an icon, copy the `<path>` and `viewBox` from the upstream SVG into a
new file here following the same shape, then `{% include icons/name.svg %}`.
Save the file with no trailing newline — Liquid emits it verbatim, and it
collapses into a word space next to the label.
