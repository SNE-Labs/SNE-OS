from __future__ import annotations

from flask import Blueprint, Response, abort

from .intel_service import fetch_intel_post
from .og_image_service import build_intel_og_image, build_intel_share_html

share_bp = Blueprint("share", __name__)


@share_bp.get("/share/intel/<slug>")
def share_intel_post(slug: str):
    post = fetch_intel_post(slug)
    if not post:
        abort(404)
    html = build_intel_share_html(post)
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
