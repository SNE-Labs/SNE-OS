from __future__ import annotations

from flask import Blueprint, Response, abort, request

from .intel_service import fetch_intel_post
from .og_image_service import build_intel_og_image, build_intel_share_html, build_static_share_html

SITE_ORIGIN = "https://snelabs.space"

STATIC_SHARE_PAGES = {
    "home": {
        "title": "SNE OS | Home operacional para Web3 e cripto",
        "description": "Home do SNE OS com Radar, Intel Brief, contexto de mercado, identidade e leitura operacional multichain em uma única superfície.",
        "canonical_url": f"{SITE_ORIGIN}/home",
        "image_url": f"{SITE_ORIGIN}/home-share.png",
        "label": "SNE OS • Home",
    },
    "radar": {
        "title": "Radar | SNE OS",
        "description": "Radar do SNE OS para leitura tática de mercado, liquidez, momentum e direção dos principais pares cripto.",
        "canonical_url": f"{SITE_ORIGIN}/radar",
        "image_url": f"{SITE_ORIGIN}/radar-share.png",
        "label": "SNE OS • Radar",
    },
    "intel": {
        "title": "Intel Brief | SNE OS",
        "description": "Intel Brief do SNE OS com dossiês, briefings e hubs editoriais por tema, chain e asset para contexto operacional cripto.",
        "canonical_url": f"{SITE_ORIGIN}/intel",
        "image_url": f"{SITE_ORIGIN}/intel-share.png",
        "label": "SNE OS • Intel Brief",
    },
}

share_bp = Blueprint("share", __name__)


@share_bp.get("/share/intel/<slug>")
def share_intel_post(slug: str):
    post = fetch_intel_post(slug)
    if not post:
        abort(404)
    surface = request.args.get("surface", "share").strip().lower()
    html = build_intel_share_html(post, surface="article" if surface == "article" else "share")
    response = Response(html, mimetype="text/html")
    response.headers["Cache-Control"] = "public, max-age=600, s-maxage=3600"
    return response


@share_bp.get("/share/page/<name>")
def share_static_page(name: str):
    payload = STATIC_SHARE_PAGES.get(name.strip().lower())
    if not payload:
        abort(404)
    html = build_static_share_html(**payload)
    response = Response(html, mimetype="text/html")
    response.headers["Cache-Control"] = "public, max-age=600, s-maxage=3600"
    return response


@share_bp.get("/og/intel/<slug>.png")
def intel_post_og_image(slug: str):
    post = fetch_intel_post(slug)
    if not post:
        abort(404)
    image = build_intel_og_image(post)
    response = Response(image, mimetype="image/png")
    response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=86400"
    return response
