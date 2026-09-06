#!/usr/bin/env python3
"""Generate terminal-styled social sharing cards and favicons.

These images are checked into the repo as build artifacts; Jekyll has no image
pipeline, so they are generated ahead of time rather than at build time.

Usage:
    # The site-wide default card (assets/images/og-default.png)
    python3 script/og-image.py --default

    # A card for a specific post
    python3 script/og-image.py --title "Necessary Is Not Strategic" \
                               --out assets/images/og-necessary-is-not-strategic.png

    # A card whose title needs disambiguating in a feed
    python3 script/og-image.py --title "How to Draw Software Cartoons" \
                               --blurb "A formula for lightweight architecture documentation" \
                               --out assets/images/og-how-to-draw-software-cartoons.png

    # Favicons (only needed if the mark ever changes)
    python3 script/og-image.py --favicons

Requires Pillow. IBM Plex Mono is downloaded to a local cache on first run so
the cards use the same typeface as the site.
"""

import argparse
import pathlib
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFont

# Mirrors the custom properties in assets/css/main.css.
BG = (13, 13, 13)
GREEN = (57, 255, 20)
AMBER = (255, 176, 0)
TEXT = (200, 200, 200)
MUTED = (144, 144, 144)

WIDTH, HEIGHT = 1200, 630
PAD = 80

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_CACHE = ROOT / ".cache" / "fonts"
FONT_URL = "https://github.com/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-{}.ttf"


def font_path(weight):
    """Return a local IBM Plex Mono TTF, downloading it on first use."""
    FONT_CACHE.mkdir(parents=True, exist_ok=True)
    path = FONT_CACHE / f"IBMPlexMono-{weight}.ttf"
    if not path.exists():
        print(f"downloading IBMPlexMono-{weight}.ttf ...", file=sys.stderr)
        urllib.request.urlretrieve(FONT_URL.format(weight), path)
    return str(path)


def load(weight, size):
    return ImageFont.truetype(font_path(weight), size)


def wrap(text, font, max_width, draw):
    """Greedy word wrap against measured pixel width."""
    words, lines, current = text.split(), [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def fit(text, max_width, draw, max_lines=3, start=76, floor=44):
    """Shrink the title until it wraps into at most `max_lines`."""
    size = start
    while size > floor:
        font = load("Bold", size)
        lines = wrap(text, font, max_width, draw)
        if len(lines) <= max_lines:
            return font, lines, size
        size -= 4
    font = load("Bold", floor)
    return font, wrap(text, font, max_width, draw)[:max_lines], floor


def scanlines(img):
    """Faint horizontal banding, echoing the site's CRT treatment.

    Kept very low contrast: at the ~250px wide thumbnail most feeds render,
    anything stronger turns into moire.
    """
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(0, img.height, 4):
        draw.line([(0, y), (img.width, y)], fill=(0, 0, 0, 26))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def card(title=None, blurb=None, subtitle="rugg.io"):
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    # Green rule down the left edge, matching the whoami block's border.
    draw.rectangle([0, 0, 5, HEIGHT], fill=GREEN)

    # Prompt: ~/ in amber, "matt" in text, "ruggio" in green -- same as the site h1.
    prompt_font = load("Bold", 38)
    x, y = PAD, PAD
    for part, colour in (("~/", AMBER), ("matt", TEXT), ("ruggio", GREEN)):
        draw.text((x, y), part, font=prompt_font, fill=colour)
        x += draw.textlength(part, font=prompt_font)
    # Block cursor.
    draw.rectangle([x + 8, y + 6, x + 8 + 18, y + 40], fill=GREEN)

    max_width = WIDTH - (PAD * 2)

    if title:
        font, lines, size = fit(title, max_width, draw)
    else:
        size = 58
        font = load("Bold", size)
        lines = wrap("Software engineering, system design, and the strategy "
                     "behind technical decisions.", font, max_width, draw)

    line_height = int(size * 1.28)

    # A blurb sits under the title for posts whose title alone could be read as
    # being about something else. It is measured into the same block as the
    # title so the pair stays optically centred rather than the title drifting
    # up by half the blurb's height.
    blurb_font, blurb_lines, blurb_height, BLURB_GAP = None, [], 0, 26
    if blurb:
        blurb_font = load("Regular", 30)
        blurb_lines = wrap(blurb, blurb_font, max_width, draw)[:2]
        blurb_height = BLURB_GAP + int(30 * 1.4) * len(blurb_lines)

    top = (HEIGHT - (line_height * len(lines) + blurb_height)) // 2 + 20
    for i, line in enumerate(lines):
        draw.text((PAD, top + i * line_height), line, font=font, fill=TEXT)

    if blurb_lines:
        blurb_top = top + line_height * len(lines) + BLURB_GAP
        for i, line in enumerate(blurb_lines):
            draw.text((PAD, blurb_top + i * int(30 * 1.4)), line,
                      font=blurb_font, fill=MUTED)

    footer_font = load("Regular", 30)
    draw.text((PAD, HEIGHT - PAD - 6), subtitle, font=footer_font, fill=MUTED)

    return scanlines(img)


def favicons():
    """A green terminal prompt on the site background.

    Drawn oversized and downsampled so the glyph stays legible at 16px, where
    antialiasing does most of the work.
    """
    out = ROOT / "assets" / "images"
    out.mkdir(parents=True, exist_ok=True)
    size = 512
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    font = load("Bold", 340)
    # Center on the glyph's actual ink, not its advance box.
    box = draw.textbbox((0, 0), ">", font=font)
    draw.text(
        ((size - (box[2] - box[0])) / 2 - box[0],
         (size - (box[3] - box[1])) / 2 - box[1]),
        ">", font=font, fill=GREEN,
    )

    img.resize((180, 180), Image.LANCZOS).save(out / "apple-touch-icon.png")
    img.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote favicon.ico, assets/images/apple-touch-icon.png")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--title", help="Post title to render on the card")
    parser.add_argument("--blurb", help="Optional line under the title, for titles "
                                        "that could be misread out of context")
    parser.add_argument("--out", help="Output path, relative to the repo root")
    parser.add_argument("--default", action="store_true",
                        help="Write the site-wide default card")
    parser.add_argument("--favicons", action="store_true", help="Regenerate favicons")
    args = parser.parse_args()

    if args.favicons:
        favicons()
    if args.default:
        path = ROOT / "assets" / "images" / "og-default.png"
        path.parent.mkdir(parents=True, exist_ok=True)
        card().save(path, optimize=True)
        print(f"wrote {path.relative_to(ROOT)}")
    if args.title:
        if not args.out:
            parser.error("--title requires --out")
        path = ROOT / args.out
        card(args.title, blurb=args.blurb).save(path, optimize=True)
        print(f"wrote {path.relative_to(ROOT)}")
    if not (args.favicons or args.default or args.title):
        parser.print_help()


if __name__ == "__main__":
    main()
