The SVGs in this directory are vendored from Font Awesome Free 6.7.2.

- Source: https://github.com/FortAwesome/Font-Awesome
- Icons: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Copyright 2024 Fonticons, Inc.

Only the artwork is vendored, not the icon font or its CSS. Each file has had
its `xmlns` and license comment stripped and `class`, `fill`, and `aria-hidden`
added so it can be inlined directly into a page and inherit `currentColor`.
The full 6.5 MB Font Awesome release is not a reasonable dependency for three
icons, so the paths are copied verbatim and attributed here instead.

To add an icon, copy the `<path>` and `viewBox` from the upstream SVG into a
new file here following the same shape, then `{% include icons/name.svg %}`.
