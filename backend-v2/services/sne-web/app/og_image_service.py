from __future__ import annotations

import html
import io
import textwrap
from functools import lru_cache
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SITE_ORIGIN = "https://snelabs.space"
IMAGE_SIZE = (1200, 630)
CANVAS_WIDTH, CANVAS_HEIGHT = IMAGE_SIZE
FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
)

PALETTES = {
    "market": {
        "accent": (255, 140, 66),
        "accent_soft": (255, 185, 122),
        "cool": (49, 86, 122),
        "tag": (255, 177, 108),
    },
    "news": {
        "accent": (112, 163, 255),
        "accent_soft": (161, 201, 255),
        "cool": (46, 76, 108),
        "tag": (130, 182, 255),
    },
    "infra": {
        "accent": (95, 168, 255),
        "accent_soft": (164, 208, 255),
        "cool": (25, 71, 110),
        "tag": (132, 189, 255),
    },
}


def _pick_palette(post: dict[str, Any]) -> dict[str, tuple[int, int, int]]:
    category = str(post.get("category") or "").strip().lower()
    topics = {str(item).strip().lower() for item in post.get("topics") or []}
    if "infra" in topics or "seguranca" in topics or "identidade" in topics:
        return PALETTES["infra"]
    if category == "market":
        return PALETTES["market"]
    return PALETTES["news"]


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    preferred = []
    if bold:
        preferred.extend(path for path in FONT_CANDIDATES if "Bold" in path)
    preferred.extend(FONT_CANDIDATES)
    for candidate in preferred:
        try:
            if Path(candidate).exists():
                return ImageFont.truetype(candidate, size=size)
        except Exception:
            continue
    return ImageFont.load_default()


def _fit_title(text: str, width: int = 28, max_lines: int = 4) -> list[str]:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return ["Intel Brief"]

    for wrap in range(width, 18, -2):
        lines = textwrap.wrap(cleaned, width=wrap)
        if len(lines) <= max_lines:
            return lines

    lines = textwrap.wrap(cleaned, width=18)[:max_lines]
    if lines:
        last = lines[-1]
        if len(last) > 3:
            lines[-1] = last[:-1].rstrip() + "…"
    return lines or ["Intel Brief"]


def _fit_excerpt(text: str, width: int = 48, max_lines: int = 3) -> list[str]:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return []
    lines = textwrap.wrap(cleaned, width=width)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .") + "…"
    return lines


def _draw_background(canvas: Image.Image, palette: dict[str, tuple[int, int, int]]) -> None:
    draw = ImageDraw.Draw(canvas)
    for y in range(CANVAS_HEIGHT):
        depth = int(12 + (y / CANVAS_HEIGHT) * 10)
        draw.line([(0, y), (CANVAS_WIDTH, y)], fill=(6, 8, depth))

    glow = Image.new("RGBA", IMAGE_SIZE, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-120, -40, 480, 460), fill=(*palette["accent"], 82))
    glow_draw.ellipse((640, 80, 1320, 640), fill=(*palette["cool"], 92))
    glow_draw.ellipse((860, -120, 1260, 220), fill=(255, 255, 255, 24))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    canvas.alpha_composite(glow)

    panel = Image.new("RGBA", IMAGE_SIZE, (0, 0, 0, 0))
    panel_draw = ImageDraw.Draw(panel)
    panel_draw.rounded_rectangle((56, 52, 1144, 574), radius=34, fill=(11, 14, 21, 210), outline=(255, 255, 255, 26), width=2)
    panel_draw.rounded_rectangle((84, 438, 1116, 538), radius=24, fill=(255, 255, 255, 10))
    panel = panel.filter(ImageFilter.GaussianBlur(0.4))
    canvas.alpha_composite(panel)


def _draw_tags(draw: ImageDraw.ImageDraw, tags: list[str], palette: dict[str, tuple[int, int, int]], start_y: int) -> None:
    if not tags:
        return

    font = _load_font(22)
    x = 92
    y = start_y
    for tag in tags[:4]:
        label = tag.upper()
        bbox = draw.textbbox((0, 0), label, font=font)
        width = bbox[2] - bbox[0]
        pill_width = width + 34
        if x + pill_width > 1080:
            y += 44
            x = 92
        draw.rounded_rectangle((x, y, x + pill_width, y + 34), radius=17, fill=(255, 255, 255, 14), outline=(*palette["tag"], 110), width=1)
        draw.text((x + 17, y + 8), label, font=font, fill=(*palette["tag"], 255))
        x += pill_width + 10


@lru_cache(maxsize=256)
def _render_cached(slug: str, title: str, subtitle: str, excerpt: str, editorial_kind: str, category: str, topic_key: str, chain_key: str, asset_key: str) -> bytes:
    palette = _pick_palette(
        {
            "category": category,
            "topics": topic_key.split(",") if topic_key else [],
            "chains": chain_key.split(",") if chain_key else [],
            "assets": asset_key.split(",") if asset_key else [],
        }
    )

    image = Image.new("RGBA", IMAGE_SIZE, (5, 8, 12, 255))
    _draw_background(image, palette)
    draw = ImageDraw.Draw(image)

    eyebrow_font = _load_font(22, bold=True)
    title_font = _load_font(54, bold=True)
    body_font = _load_font(28)
    footer_font = _load_font(22, bold=True)

    draw.text((92, 92), "INTEL BRIEF", font=eyebrow_font, fill=(214, 220, 230, 190))

    kind_label = "DOSSIÊ" if editorial_kind == "dossier" else "BRIEFING"
    kind_bbox = draw.textbbox((0, 0), kind_label, font=eyebrow_font)
    kind_width = kind_bbox[2] - kind_bbox[0]
    draw.rounded_rectangle((920, 86, 920 + kind_width + 36, 122), radius=18, fill=(*palette["accent"], 38), outline=(*palette["accent_soft"], 145), width=1)
    draw.text((938, 94), kind_label, font=eyebrow_font, fill=(*palette["accent_soft"], 255))

    y = 154
    for line in _fit_title(title):
        draw.text((92, y), line, font=title_font, fill=(246, 248, 252, 255))
        y += 64

    excerpt_lines = _fit_excerpt(excerpt or subtitle)
    if excerpt_lines:
        y += 8
        for line in excerpt_lines:
            draw.text((92, y), line, font=body_font, fill=(214, 220, 230, 215))
            y += 36

    tags = [tag for tag in [*(asset_key.split(",") if asset_key else []), *(chain_key.split(",") if chain_key else []), *(topic_key.split(",") if topic_key else [])] if tag]
    _draw_tags(draw, tags, palette, 456)

    draw.text((92, 554), "snelabs.space", font=footer_font, fill=(214, 220, 230, 176))
    draw.text((1024, 554), f"/intel/{slug}", font=footer_font, fill=(214, 220, 230, 120), anchor="ra")

    output = io.BytesIO()
    image.convert("RGB").save(output, format="PNG", optimize=True)
    return output.getvalue()


def build_intel_og_image(post: dict[str, Any]) -> bytes:
    return _render_cached(
        str(post.get("slug") or ""),
        str(post.get("title") or "Intel Brief"),
        str(post.get("subtitle") or ""),
        str(post.get("excerpt") or ""),
        str(post.get("editorial_kind") or "briefing"),
        str(post.get("category") or "news"),
        ",".join(str(item).strip() for item in post.get("topics") or [] if str(item).strip()),
        ",".join(str(item).strip() for item in post.get("chains") or [] if str(item).strip()),
        ",".join(str(item).strip() for item in post.get("assets") or [] if str(item).strip()),
    )


def build_intel_share_url(slug: str) -> str:
    return f"{SITE_ORIGIN}/share/intel/{slug}"


def build_intel_og_image_url(slug: str) -> str:
    return f"{SITE_ORIGIN}/api/og/intel/{slug}.png"


def build_static_share_html(
    *,
    title: str,
    description: str,
    canonical_url: str,
    image_url: str,
    label: str,
) -> str:
    escaped_title = html.escape(title)
    escaped_description = html.escape(description)
    escaped_canonical = html.escape(canonical_url)
    escaped_image = html.escape(image_url)
    escaped_label = html.escape(label)

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escaped_title}</title>
    <meta name="description" content="{escaped_description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="{escaped_canonical}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="SNE OS" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:title" content="{escaped_title}" />
    <meta property="og:description" content="{escaped_description}" />
    <meta property="og:url" content="{escaped_canonical}" />
    <meta property="og:image" content="{escaped_image}" />
    <meta property="og:image:secure_url" content="{escaped_image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="{escaped_canonical}" />
    <meta name="twitter:title" content="{escaped_title}" />
    <meta name="twitter:description" content="{escaped_description}" />
    <meta name="twitter:image" content="{escaped_image}" />
    <style>
      :root {{
        color-scheme: dark;
      }}
      body {{
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #05070c;
        color: #f4f7fb;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }}
      .card {{
        width: min(92vw, 560px);
        padding: 28px;
        border-radius: 24px;
        background: rgba(15, 18, 26, 0.92);
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 24px 80px rgba(0,0,0,0.4);
      }}
      .eyebrow {{
        color: rgba(214,220,230,0.58);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }}
      h1 {{
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.2;
      }}
      p {{
        margin: 0 0 18px;
        color: rgba(214,220,230,0.78);
        line-height: 1.55;
      }}
      a {{
        color: #ffb17f;
        text-decoration: none;
      }}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="eyebrow">{escaped_label}</div>
      <h1>{escaped_title}</h1>
      <p>{escaped_description}</p>
      <a href="{escaped_canonical}">Abrir página</a>
    </div>
  </body>
</html>
"""


def build_intel_share_html(post: dict[str, Any], surface: str = "share") -> str:
    slug = str(post.get("slug") or "")
    title = str(post.get("title") or "Intel Brief | SNE OS")
    description = str(post.get("excerpt") or post.get("subtitle") or "Leitura editorial do Intel Brief.")
    share_url = build_intel_share_url(slug)
    article_url = f"{SITE_ORIGIN}/intel/{slug}"
    image_url = build_intel_og_image_url(slug)
    article_surface = surface == "article"
    og_url = article_url if article_surface else share_url

    escaped_title = html.escape(title)
    escaped_description = html.escape(description)
    escaped_article = html.escape(article_url)
    escaped_share = html.escape(share_url)
    escaped_image = html.escape(image_url)
    escaped_og_url = html.escape(og_url)
    redirect_script = (
        f"<script>window.setTimeout(function () {{ window.location.replace({article_url!r}); }}, 150);</script>"
        if not article_surface
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escaped_title}</title>
    <meta name="description" content="{escaped_description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="{escaped_og_url}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="SNE OS" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:title" content="{escaped_title}" />
    <meta property="og:description" content="{escaped_description}" />
    <meta property="og:url" content="{escaped_og_url}" />
    <meta property="og:image" content="{escaped_image}" />
    <meta property="og:image:secure_url" content="{escaped_image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="{escaped_og_url}" />
    <meta name="twitter:title" content="{escaped_title}" />
    <meta name="twitter:description" content="{escaped_description}" />
    <meta name="twitter:image" content="{escaped_image}" />
    <style>
      :root {{
        color-scheme: dark;
      }}
      body {{
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #05070c;
        color: #f4f7fb;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }}
      .card {{
        width: min(92vw, 560px);
        padding: 28px;
        border-radius: 24px;
        background: rgba(15, 18, 26, 0.92);
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 24px 80px rgba(0,0,0,0.4);
      }}
      .eyebrow {{
        color: rgba(214,220,230,0.58);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }}
      h1 {{
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.2;
      }}
      p {{
        margin: 0 0 18px;
        color: rgba(214,220,230,0.78);
        line-height: 1.55;
      }}
      a {{
        color: #ffb17f;
        text-decoration: none;
      }}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="eyebrow">Intel Brief • {html.escape('Article' if article_surface else 'Share')}</div>
      <h1>{escaped_title}</h1>
      <p>{escaped_description}</p>
      <a href="{escaped_article}">Abrir leitura</a>
    </div>
    {redirect_script}
  </body>
</html>
"""
