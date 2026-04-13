"""
Intel API for SNE OS Home and editorial surfaces.
"""

from datetime import datetime, timezone
import logging

from flask import Blueprint, jsonify, request

from .intel_service import (
    build_intel_briefing,
    fetch_intel_items,
    fetch_intel_post,
    fetch_intel_posts,
)

logger = logging.getLogger(__name__)

intel_bp = Blueprint("intel", __name__)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@intel_bp.get("/briefing")
def intel_briefing():
    try:
        return jsonify(build_intel_briefing(limit=6)), 200
    except Exception as exc:
        logger.warning(f"Intel briefing failed: {exc}")
        return jsonify({
            "locale": "pt-BR",
            "lead": None,
            "items": [],
            "resumo_executivo": {
                "headline": "Briefing indisponível agora.",
                "bullet_points": [],
            },
            "clusters": [],
            "last_updated": _iso_now(),
        }), 200


@intel_bp.get("/posts")
def intel_posts():
    try:
        limit = request.args.get("limit", default=24, type=int) or 24
        posts = fetch_intel_posts(limit=max(1, min(limit, 48)))
        return jsonify({
            "items": posts,
            "last_updated": _iso_now(),
        }), 200
    except Exception as exc:
        logger.warning(f"Intel posts failed: {exc}")
        return jsonify({
            "items": [],
            "last_updated": _iso_now(),
        }), 200


@intel_bp.get("/posts/<slug>")
def intel_post_detail(slug: str):
    try:
        post = fetch_intel_post(slug)
        if not post:
            return jsonify({"error": "Intel post not found"}), 404
        return jsonify(post), 200
    except Exception as exc:
        logger.warning(f"Intel post detail failed for {slug}: {exc}")
        return jsonify({"error": "Intel post unavailable"}), 503
