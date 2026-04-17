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
RENDER_SCALE = 2
RENDER_SIZE = (IMAGE_SIZE[0] * RENDER_SCALE, IMAGE_SIZE[1] * RENDER_SCALE)
CANVAS_WIDTH, CANVAS_HEIGHT = RENDER_SIZE
APP_DIR = Path(__file__).resolve().parent
FONT_CANDIDATES = (
    str(APP_DIR / "assets" / "fonts" / "arialbd.ttf"),
    str(APP_DIR / "assets" / "fonts" / "arial.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
)
INTEL_ASSET_DIR = APP_DIR / "assets" / "intel"
VISUAL_ASSET_FILES = {
    "bitcoin": INTEL_ASSET_DIR / "tokens" / "bitcoin.png",
    "btc": INTEL_ASSET_DIR / "tokens" / "bitcoin.png",
    "ethereum": INTEL_ASSET_DIR / "tokens" / "ethereum.png",
    "eth": INTEL_ASSET_DIR / "tokens" / "ethereum.png",
    "solana": INTEL_ASSET_DIR / "tokens" / "solana.png",
    "sol": INTEL_ASSET_DIR / "tokens" / "solana.png",
    "usd-coin": INTEL_ASSET_DIR / "tokens" / "usd-coin.png",
    "usdc": INTEL_ASSET_DIR / "tokens" / "usd-coin.png",
    "tether": INTEL_ASSET_DIR / "tokens" / "tether.png",
    "usdt": INTEL_ASSET_DIR / "tokens" / "tether.png",
    "polygon": INTEL_ASSET_DIR / "tokens" / "polygon.png",
    "matic": INTEL_ASSET_DIR / "tokens" / "polygon.png",
    "avalanche": INTEL_ASSET_DIR / "tokens" / "avalanche.png",
    "avax": INTEL_ASSET_DIR / "tokens" / "avalanche.png",
    "cardano": INTEL_ASSET_DIR / "tokens" / "cardano.png",
    "ada": INTEL_ASSET_DIR / "tokens" / "cardano.png",
    "xrp": INTEL_ASSET_DIR / "tokens" / "xrp.png",
    "dogecoin": INTEL_ASSET_DIR / "tokens" / "dogecoin.png",
    "doge": INTEL_ASSET_DIR / "tokens" / "dogecoin.png",
    "chainlink": INTEL_ASSET_DIR / "tokens" / "chainlink.png",
    "link": INTEL_ASSET_DIR / "tokens" / "chainlink.png",
    "country-us": INTEL_ASSET_DIR / "flags" / "us.png",
    "country-br": INTEL_ASSET_DIR / "flags" / "br.png",
    "country-ar": INTEL_ASSET_DIR / "flags" / "ar.png",
    "country-cn": INTEL_ASSET_DIR / "flags" / "cn.png",
    "country-eu": INTEL_ASSET_DIR / "flags" / "eu.png",
    "country-uk": INTEL_ASSET_DIR / "flags" / "uk.png",
    "country-jp": INTEL_ASSET_DIR / "flags" / "jp.png",
    "country-sg": INTEL_ASSET_DIR / "flags" / "sg.png",
}

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
    "institutional": {
        "accent": (99, 208, 166),
        "accent_soft": (157, 230, 202),
        "cool": (25, 95, 84),
        "tag": (126, 219, 182),
    },
}


def _s(value: int) -> int:
    return int(value * RENDER_SCALE)


def _pick_palette(post: dict[str, Any]) -> dict[str, tuple[int, int, int]]:
    category = str(post.get("category") or "").strip().lower()
    topics = {str(item).strip().lower() for item in post.get("topics") or []}
    if category == "institutional":
        return PALETTES["institutional"]
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
                return ImageFont.truetype(candidate, size=_s(size))
        except Exception:
            continue
    return ImageFont.load_default()


@lru_cache(maxsize=64)
def _load_visual_asset(icon_symbol: str) -> Image.Image | None:
    path = VISUAL_ASSET_FILES.get(str(icon_symbol or "").strip().lower())
    if not path or not path.exists():
        return None
    try:
        return Image.open(path).convert("RGBA")
    except Exception:
        return None


def _normalize_text(text: str) -> str:
    return " ".join((text or "").split())


def _truncate_text(text: str, limit: int) -> str:
    cleaned = _normalize_text(text)
    if len(cleaned) <= limit:
        return cleaned
    trimmed = cleaned[: limit - 1].rsplit(" ", 1)[0].strip()
    return (trimmed or cleaned[: limit - 1]).rstrip(" .,;:-") + "…"


def _fit_title(text: str, width: int = 18, max_lines: int = 4) -> list[str]:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return ["Intel Brief"]

    for wrap in range(width, 12, -1):
        lines = textwrap.wrap(cleaned, width=wrap)
        if len(lines) <= max_lines:
            return lines

    lines = textwrap.wrap(cleaned, width=12)[:max_lines]
    if lines:
        last = lines[-1]
        if len(last) > 3:
            lines[-1] = last[:-1].rstrip() + "…"
    return lines or ["Intel Brief"]


def _fit_excerpt(text: str, width: int = 38, max_lines: int = 2) -> list[str]:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return []
    lines = textwrap.wrap(cleaned, width=width)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .") + "…"
    return lines


def _wrap_text_to_pixel_width(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> list[str]:
    words = _normalize_text(text).split()
    if not words:
        return ["Intel Brief"]

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = candidate
            continue
        lines.append(current)
        current = word
        if len(lines) >= max_lines:
            break

    if len(lines) < max_lines:
        lines.append(current)

    if len(lines) > max_lines:
        lines = lines[:max_lines]

    remaining_words = words[len(" ".join(lines).split()):]
    if remaining_words and lines:
        lines[-1] = _truncate_text(f"{lines[-1]} {' '.join(remaining_words)}", max(12, len(lines[-1]) + 8))
        while draw.textbbox((0, 0), lines[-1], font=font)[2] > max_width and len(lines[-1]) > 8:
            lines[-1] = lines[-1][:-2].rstrip() + "…"

    return lines or ["Intel Brief"]


def _fit_title_layout(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
) -> tuple[ImageFont.FreeTypeFont | ImageFont.ImageFont, list[str], int]:
    cleaned = _truncate_text(text, 144)
    candidates = (
        (54, 3),
        (50, 3),
        (47, 3),
        (44, 4),
        (41, 4),
    )
    best_font = _load_font(41, bold=True)
    best_lines = _wrap_text_to_pixel_width(draw, cleaned, best_font, max_width, 4)
    best_step = _s(50)
    for font_size, max_lines in candidates:
        font = _load_font(font_size, bold=True)
        lines = _wrap_text_to_pixel_width(draw, cleaned, font, max_width, max_lines)
        if len(lines) <= max_lines and all(draw.textbbox((0, 0), line, font=font)[2] <= max_width for line in lines):
            step = _s(max(font_size + 6, 48))
            return font, lines, step
        best_font = font
        best_lines = lines
        best_step = _s(max(font_size + 6, 48))
    return best_font, best_lines, best_step


def _select_dek(subtitle: str, excerpt: str) -> str:
    preferred = _normalize_text(subtitle)
    fallback = _normalize_text(excerpt)
    if preferred:
        return _truncate_text(preferred, 112)
    return _truncate_text(fallback, 124)


def _stream_label(post: dict[str, Any]) -> str:
    stream = str(post.get("stream") or "").strip().lower()
    if stream == "institutional" or str(post.get("category") or "").strip().lower() == "institutional":
        return "SNELABS"
    return "EXTERNAL"


def _kind_label(editorial_kind: str) -> str:
    return "DOSSIER" if editorial_kind == "dossier" else "BRIEFING"


def _compact_tags(post: dict[str, Any]) -> list[str]:
    tags: list[str] = []
    primary_visual = post.get("primary_visual_entity") or {}
    primary_label = str(primary_visual.get("label") or "").strip()
    if primary_label:
        tags.append(primary_label)
    category = str(post.get("category") or "").strip()
    if category and category.lower() not in {existing.lower() for existing in tags}:
        tags.append(category)
    for source in ("countries", "assets", "chains", "topics", "products"):
        for item in post.get(source) or []:
            label = str(item).strip()
            if label and label.lower() not in {existing.lower() for existing in tags}:
                tags.append(label)
            if len(tags) >= 3:
                return tags[:3]
    return tags[:3]


def _draw_background(canvas: Image.Image, palette: dict[str, tuple[int, int, int]], stream_label: str) -> None:
    draw = ImageDraw.Draw(canvas)
    for y in range(CANVAS_HEIGHT):
        blend = y / CANVAS_HEIGHT
        red = int(4 + blend * 8)
        green = int(6 + blend * 12)
        blue = int(14 + blend * 18)
        draw.line([(0, y), (CANVAS_WIDTH, y)], fill=(red, green, blue))

    glow = Image.new("RGBA", RENDER_SIZE, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((_s(-120), _s(-20), _s(420), _s(440)), fill=(*palette["accent"], 105))
    glow_draw.ellipse((_s(720), _s(40), _s(1460), _s(720)), fill=(*palette["cool"], 112))
    glow_draw.ellipse((_s(1650), _s(-90), _s(2320), _s(260)), fill=(255, 255, 255, 20))
    glow = glow.filter(ImageFilter.GaussianBlur(_s(48)))
    canvas.alpha_composite(glow)

    panel = Image.new("RGBA", RENDER_SIZE, (0, 0, 0, 0))
    panel_draw = ImageDraw.Draw(panel)
    panel_draw.rounded_rectangle(
        (_s(38), _s(36), _s(1162), _s(594)),
        radius=_s(28),
        fill=(8, 10, 16, 208),
        outline=(255, 255, 255, 24),
        width=_s(1),
    )
    panel_draw.rounded_rectangle(
        (_s(78), _s(76), _s(802), _s(554)),
        radius=_s(20),
        fill=(255, 255, 255, 8),
    )
    panel_draw.rounded_rectangle(
        (_s(840), _s(76), _s(1122), _s(554)),
        radius=_s(26),
        fill=(255, 255, 255, 8),
    )
    panel = panel.filter(ImageFilter.GaussianBlur(_s(0)))
    canvas.alpha_composite(panel)

    accent = Image.new("RGBA", RENDER_SIZE, (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent)
    accent_draw.rounded_rectangle(
        (_s(880), _s(114), _s(1080), _s(502)),
        radius=_s(34),
        fill=(*palette["accent"], 34),
        outline=(*palette["accent_soft"], 92),
        width=_s(1),
    )
    accent_draw.ellipse((_s(900), _s(130), _s(1185), _s(415)), fill=(*palette["accent"], 78))
    accent_draw.ellipse((_s(958), _s(212), _s(1260), _s(520)), fill=(255, 255, 255, 18))
    for offset in range(0, _s(360), _s(32)):
        accent_draw.line(
            [(_s(854), _s(196) + offset), (_s(1120), _s(30) + offset)],
            fill=(255, 255, 255, 18),
            width=_s(2),
        )
    accent = accent.filter(ImageFilter.GaussianBlur(_s(10)))
    canvas.alpha_composite(accent)

    guide = ImageDraw.Draw(canvas)
    guide.line([(_s(826), _s(98)), (_s(826), _s(528))], fill=(255, 255, 255, 26), width=_s(1))
    if stream_label == "SNELABS":
        guide.rounded_rectangle(
            (_s(860), _s(442), _s(1100), _s(524)),
            radius=_s(20),
            fill=(255, 255, 255, 10),
            outline=(255, 255, 255, 24),
            width=_s(1),
        )

def _draw_tags(draw: ImageDraw.ImageDraw, tags: list[str], palette: dict[str, tuple[int, int, int]], start_y: int) -> None:
    if not tags:
        return

    font = _load_font(20, bold=True)
    x = _s(88)
    y = start_y
    for tag in tags[:3]:
        label = tag.upper()
        bbox = draw.textbbox((0, 0), label, font=font)
        width = bbox[2] - bbox[0]
        pill_width = width + _s(30)
        if x + pill_width > _s(760):
            break
        draw.rounded_rectangle(
            (x, y, x + pill_width, y + _s(34)),
            radius=_s(17),
            fill=(14, 19, 30, 228),
            outline=(*palette["tag"], 160),
            width=_s(1),
        )
        draw.text((x + _s(15), y + _s(7)), label, font=font, fill=(244, 247, 251, 255))
        x += pill_width + _s(10)


def _draw_metric_rail(
    draw: ImageDraw.ImageDraw,
    post: dict[str, Any],
    palette: dict[str, tuple[int, int, int]],
    stream_label: str,
    editorial_kind: str,
) -> None:
    caption_font = _load_font(14, bold=True)
    value_font = _load_font(22, bold=True)
    soft = (220, 228, 236, 176)
    bright = (244, 247, 251, 255)

    right_x = _s(922)
    primary_visual = post.get("primary_visual_entity") or {}
    primary_label = str(primary_visual.get("label") or "").strip()
    if primary_label:
        primary_label = _truncate_text(primary_label.upper(), 18)
    draw.text((right_x, _s(286)), "ASSET", font=caption_font, fill=soft)
    draw.text((right_x, _s(312)), primary_label or stream_label, font=value_font, fill=bright)

    draw.text((right_x, _s(374)), "FORMAT", font=caption_font, fill=soft)
    draw.text((right_x, _s(400)), _kind_label(editorial_kind), font=value_font, fill=bright)

    category = str(post.get("category") or "news").strip().upper()
    draw.text((right_x, _s(482)), "CATEGORY", font=caption_font, fill=soft)
    draw.text((right_x, _s(506)), category, font=value_font, fill=(*palette["accent_soft"], 255))


def _paste_contained(
    image: Image.Image,
    asset: Image.Image,
    box: tuple[int, int, int, int],
    *,
    rounded: bool = False,
) -> None:
    left, top, right, bottom = box
    max_width = max(1, right - left)
    max_height = max(1, bottom - top)
    source = asset.copy()
    source.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    x = left + (max_width - source.width) // 2
    y = top + (max_height - source.height) // 2

    if rounded:
        mask = Image.new("L", source.size, 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle((0, 0, source.width, source.height), radius=max(8, min(source.size) // 7), fill=255)
        alpha = source.getchannel("A")
        alpha = Image.composite(alpha, Image.new("L", source.size, 0), mask)
        source.putalpha(alpha)

    image.alpha_composite(source, (x, y))


def _draw_visual_assets(
    image: Image.Image,
    draw: ImageDraw.ImageDraw,
    post: dict[str, Any],
    palette: dict[str, tuple[int, int, int]],
) -> None:
    visual_entities = [entity for entity in post.get("visual_entities") or [] if isinstance(entity, dict)]
    primary = post.get("primary_visual_entity") if isinstance(post.get("primary_visual_entity"), dict) else None
    if not primary and visual_entities:
        primary = visual_entities[0]
    if not primary:
        return

    primary_icon = str(primary.get("icon_symbol") or primary.get("iconSymbol") or primary.get("id") or "").strip()
    primary_asset = _load_visual_asset(primary_icon)
    if not primary_asset:
        return

    center_x = _s(980)
    center_y = _s(180)
    outer_radius = _s(80)
    inner_radius = _s(64)
    draw.ellipse(
        (center_x - outer_radius, center_y - outer_radius, center_x + outer_radius, center_y + outer_radius),
        fill=(7, 10, 17, 232),
        outline=(*palette["accent_soft"], 180),
        width=_s(2),
    )
    draw.ellipse(
        (center_x - inner_radius, center_y - inner_radius, center_x + inner_radius, center_y + inner_radius),
        fill=(255, 255, 255, 18),
    )
    _paste_contained(
        image,
        primary_asset,
        (center_x - _s(54), center_y - _s(54), center_x + _s(54), center_y + _s(54)),
    )

    country = next(
        (
            entity
            for entity in visual_entities
            if str(entity.get("kind") or "").strip().lower() == "country"
            and str(entity.get("id") or "") != str(primary.get("id") or "")
        ),
        None,
    )
    if not country:
        return
    country_icon = str(country.get("icon_symbol") or country.get("iconSymbol") or country.get("id") or "").strip()
    country_asset = _load_visual_asset(country_icon)
    if not country_asset:
        return

    flag_box = (_s(1018), _s(224), _s(1102), _s(276))
    draw.rounded_rectangle(
        flag_box,
        radius=_s(14),
        fill=(8, 10, 16, 238),
        outline=(255, 255, 255, 72),
        width=_s(2),
    )
    _paste_contained(
        image,
        country_asset,
        (_s(1026), _s(231), _s(1094), _s(269)),
        rounded=True,
    )


@lru_cache(maxsize=256)
def _render_cached(
    slug: str,
    title: str,
    subtitle: str,
    excerpt: str,
    editorial_kind: str,
    category: str,
    stream: str,
    topic_key: str,
    chain_key: str,
    asset_key: str,
    product_key: str,
    country_key: str,
    primary_visual_label: str,
    primary_visual_icon: str,
    country_visual_icon: str,
    visual_key: str,
    reading_time: str,
) -> bytes:
    post_context = {
        "category": category,
        "stream": stream,
        "topics": topic_key.split(",") if topic_key else [],
        "chains": chain_key.split(",") if chain_key else [],
        "assets": asset_key.split(",") if asset_key else [],
        "products": product_key.split(",") if product_key else [],
        "countries": country_key.split(",") if country_key else [],
        "primary_visual_entity": {"label": primary_visual_label, "icon_symbol": primary_visual_icon} if primary_visual_label or primary_visual_icon else None,
        "visual_entities": [
            {"kind": "asset", "label": primary_visual_label, "icon_symbol": primary_visual_icon, "id": primary_visual_icon}
        ] + ([{"kind": "country", "icon_symbol": country_visual_icon, "id": country_visual_icon}] if country_visual_icon else []),
        "reading_time_minutes": int(reading_time) if reading_time.isdigit() else None,
    }
    palette = _pick_palette(post_context)
    stream_label = _stream_label(post_context)

    image = Image.new("RGBA", RENDER_SIZE, (5, 8, 12, 255))
    _draw_background(image, palette, stream_label)
    draw = ImageDraw.Draw(image)
    _draw_visual_assets(image, draw, post_context, palette)

    eyebrow_font = _load_font(18, bold=True)
    body_font = _load_font(26, bold=True)
    footer_font = _load_font(18, bold=True)

    kicker = f"INTEL / {stream_label}"
    kicker_bbox = draw.textbbox((0, 0), kicker, font=eyebrow_font)
    kicker_width = kicker_bbox[2] - kicker_bbox[0]
    draw.rounded_rectangle(
        (_s(88), _s(86), _s(88) + kicker_width + _s(34), _s(122)),
        radius=_s(18),
        fill=(13, 18, 29, 226),
        outline=(*palette["accent_soft"], 150),
        width=_s(1),
    )
    draw.text((_s(106), _s(94)), kicker, font=eyebrow_font, fill=(244, 247, 251, 255))

    title_max_width = _s(720)
    y = _s(150)
    title_font, title_lines, title_step = _fit_title_layout(draw, title, title_max_width)
    for line in title_lines:
        draw.text((_s(88), y), line, font=title_font, fill=(246, 248, 252, 255))
        y += title_step

    insight = _select_dek(subtitle, excerpt)
    excerpt_lines = _fit_excerpt(insight, width=42, max_lines=2)
    if excerpt_lines:
        y += _s(18)
        for line in excerpt_lines:
            draw.text((_s(88), y), line, font=body_font, fill=(214, 220, 230, 220))
            y += _s(32)

    tags = _compact_tags(post_context)
    tags_y = min(max(y + _s(28), _s(478)), _s(504))
    _draw_tags(draw, tags, palette, tags_y)
    _draw_metric_rail(draw, post_context, palette, stream_label, editorial_kind)

    draw.text((_s(88), _s(546)), "snelabs.space", font=footer_font, fill=(214, 220, 230, 178))
    draw.text((_s(762), _s(546)), "intel brief", font=footer_font, fill=(214, 220, 230, 132), anchor="ra")

    output = io.BytesIO()
    image = image.resize(IMAGE_SIZE, Image.Resampling.LANCZOS)
    image.convert("RGB").save(output, format="PNG", optimize=True)
    return output.getvalue()


def build_intel_og_image(post: dict[str, Any]) -> bytes:
    visual_entities = [entity for entity in post.get("visual_entities") or [] if isinstance(entity, dict)]
    primary_visual = post.get("primary_visual_entity") if isinstance(post.get("primary_visual_entity"), dict) else None
    if not primary_visual and visual_entities:
        primary_visual = visual_entities[0]
    country_visual = next(
        (
            entity
            for entity in visual_entities
            if str(entity.get("kind") or "").strip().lower() == "country"
            and str(entity.get("id") or "") != str((primary_visual or {}).get("id") or "")
        ),
        None,
    )
    primary_icon = str((primary_visual or {}).get("icon_symbol") or (primary_visual or {}).get("iconSymbol") or "")
    country_icon = str((country_visual or {}).get("icon_symbol") or (country_visual or {}).get("iconSymbol") or "")
    visual_key = ",".join(
        str(entity.get("id") or entity.get("icon_symbol") or "").strip()
        for entity in visual_entities
        if str(entity.get("id") or entity.get("icon_symbol") or "").strip()
    )
    return _render_cached(
        str(post.get("slug") or ""),
        str(post.get("title") or "Intel Brief"),
        str(post.get("subtitle") or ""),
        str(post.get("excerpt") or ""),
        str(post.get("editorial_kind") or "briefing"),
        str(post.get("category") or "news"),
        str(post.get("stream") or ""),
        ",".join(str(item).strip() for item in post.get("topics") or [] if str(item).strip()),
        ",".join(str(item).strip() for item in post.get("chains") or [] if str(item).strip()),
        ",".join(str(item).strip() for item in post.get("assets") or [] if str(item).strip()),
        ",".join(str(item).strip() for item in post.get("products") or [] if str(item).strip()),
        ",".join(str(item).strip() for item in post.get("countries") or [] if str(item).strip()),
        str((primary_visual or {}).get("label") or ""),
        primary_icon,
        country_icon,
        visual_key,
        str(post.get("reading_time_minutes") or ""),
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
