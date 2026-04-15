"""
Intel API for SNE OS Home and editorial surfaces.
"""

from datetime import datetime, timezone
import hmac
import logging
import os

from flask import Blueprint, jsonify, request

from .intel_service import (
    build_intel_briefing,
    fetch_intel_items,
    fetch_intel_post,
    fetch_intel_posts,
    fetch_intel_posts_last_updated,
    fetch_intel_posts_state,
    trigger_enterprise_post_refresh,
)

logger = logging.getLogger(__name__)

intel_bp = Blueprint("intel", __name__)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _refresh_authorized() -> bool:
    expected = (os.getenv("INTEL_REFRESH_SECRET") or "").strip()
    if not expected:
        return False

    provided = (
        request.headers.get("X-Intel-Refresh-Secret", "")
        or request.headers.get("Authorization", "").removeprefix("Bearer ")
    ).strip()
    return bool(provided) and hmac.compare_digest(provided, expected)


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
        normalized_limit = max(1, min(limit, 240))
        posts = fetch_intel_posts(limit=normalized_limit)
        state = fetch_intel_posts_state(limit=normalized_limit)
        return jsonify({
            "items": posts,
            "last_updated": fetch_intel_posts_last_updated(limit=normalized_limit),
            "refreshed_at": _iso_now(),
            "cache_updated_at": state["cache_updated_at"],
            "stale": state["stale"],
            "refreshing": state["refreshing"],
            "total_cached": state["count"],
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


@intel_bp.get("/status")
def intel_status():
    try:
        limit = request.args.get("limit", default=24, type=int) or 24
        normalized_limit = max(1, min(limit, 240))
        return jsonify({
            **fetch_intel_posts_state(limit=normalized_limit),
            "checked_at": _iso_now(),
        }), 200
    except Exception as exc:
        logger.warning(f"Intel status failed: {exc}")
        return jsonify({"error": "Intel status unavailable"}), 503


@intel_bp.post("/refresh")
def intel_refresh():
    if not _refresh_authorized():
        return jsonify({"error": "Unauthorized"}), 401

    async_refresh = request.args.get("sync") != "1"
    started = trigger_enterprise_post_refresh(async_refresh=async_refresh)
    state = fetch_intel_posts_state(limit=24)
    return jsonify({
        "started": started,
        "mode": "async" if async_refresh else "sync",
        "state": state,
        "requested_at": _iso_now(),
    }), 202 if started and async_refresh else 200
