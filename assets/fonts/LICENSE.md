The woff2 files in this directory are self-hosted copies of open source fonts.

- **IBM Plex Sans** and **IBM Plex Mono**: Copyright IBM Corp.
  SIL Open Font License 1.1, https://github.com/IBM/plex
- **VT323**: Copyright The VT323 Project Authors, Peter Hull.
  SIL Open Font License 1.1, https://github.com/phoikoi/VT323

The SIL OFL explicitly permits redistribution and web embedding. Only the font
binaries are vendored; the `@font-face` declarations live at the top of
`assets/css/main.css`.

## Why these are self-hosted

Loading them from Google Fonts meant two extra origins on the critical path
(`fonts.googleapis.com` for the CSS, then `fonts.gstatic.com` for the binaries),
a preconnect for each, and a request chain where the browser could not discover
the font files until the remote stylesheet had arrived. It also disclosed every
visitor's IP address and user agent to a third party in exchange for artwork.

Self-hosting removes all of that. The trade is that updates are manual, which is
fine for a typeface that changes roughly never.

## Regenerating

Only the **latin** subset is vendored. The site is English, and browsers fall
back per-glyph for anything outside it.

Fetch the upstream stylesheet with a browser user agent, or Google serves older
formats than woff2:

```bash
curl -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 \
(KHTML, like Gecko) Chrome/120.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=VT323&family=IBM+Plex+Mono:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400&display=swap"
```

The response contains one `@font-face` per family, weight, style, and subset,
each preceded by a `/* subset */` comment. Keep only the blocks commented
`/* latin */` and download the `.woff2` each one points at, naming the file
`<family-slug>-<weight>[-italic].woff2` to match the declarations in
`main.css`.

Note that IBM Plex Mono ships only 400 and 700 here. CSS font matching resolves
a requested weight above 500 upward first, so `font-weight: 600` on a mono
element silently renders as 700. Ask for 700 explicitly rather than relying on
that.
