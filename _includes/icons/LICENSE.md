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

`spade.svg` is **not** Font Awesome and is not CC BY. It is original artwork,
covered by this repository's own license. A spade is Pro-only upstream, and
redistributing a Pro icon from a public repository is not permitted even with a
valid Pro license. The same path is used by the card faces on `/blackjack/`.

To add an icon, copy the `<path>` and `viewBox` from the upstream SVG into a
new file here following the same shape, then `{% include icons/name.svg %}`.
Save the file with no trailing newline — Liquid emits it verbatim, and it
collapses into a word space next to the label.
