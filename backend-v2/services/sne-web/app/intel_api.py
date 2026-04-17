"""
Intel API for SNE OS Home and editorial surfaces.
"""

from datetime import datetime, timezone
import hmac
import logging
import os

from flask import Blueprint, jsonify, request

from .distribution_service import (
    fetch_distribution_status,
    generate_distribution_assets,
    publish_distribution,
)
from .institutional_service import (
    fetch_combined_intel_post,
    fetch_combined_intel_posts,
    fetch_institutional_post,
    fetch_institutional_posts,
    generate_institutional_post,
    ingest_institutional_fact_pack,
)
from .intel_service import (
    build_intel_briefing,
    fetch_intel_items,
    fetch_intel_posts_state,
    trigger_enterprise_post_refresh,
)

logger = logging.getLogger(__name__)

intel_bp = Blueprint("intel", __name__)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _refresh_authorized() -> bool:
    return _secret_authorized("INTEL_REFRESH_SECRET", required=True)


def _secret_authorized(secret_env_name: str, *, required: bool = False) -> bool:
    expected = (os.getenv(secret_env_name) or "").strip()
    if not expected:
        return not required

    provided = (
        request.headers.get("X-Intel-Refresh-Secret", "")
        or request.headers.get("Authorization", "").removeprefix("Bearer ")
    ).strip()
    return bool(provided) and hmac.compare_digest(provided, expected)


def _posts_last_updated(posts: list[dict[str, object]]) -> str:
    for post in sorted(posts, key=lambda item: str(item.get("generated_at") or ""), reverse=True):
        candidate = str(post.get("generated_at") or "").strip()
        if candidate:
            return candidate
    return _iso_now()


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
        stream = (request.args.get("stream", "all") or "all").strip().lower()
        institutional_type = (request.args.get("type") or "").strip().lower() or None
        stage = (request.args.get("stage") or "").strip().lower() or None
        visibility = (request.args.get("visibility") or "").strip().lower() or None
        posts = fetch_combined_intel_posts(
            limit=normalized_limit,
            stream=stream,
            institutional_type=institutional_type,
            stage=stage,
            visibility=visibility,
        )
        state = fetch_intel_posts_state(limit=normalized_limit) if stream != "institutional" else {
            "cache_updated_at": None,
            "stale": False,
            "refreshing": False,
            "count": len(posts),
        }
        return jsonify({
            "items": posts,
            "last_updated": _posts_last_updated(posts),
            "refreshed_at": _iso_now(),
            "cache_updated_at": state["cache_updated_at"],
            "stale": state["stale"],
            "refreshing": state["refreshing"],
            "total_cached": len(posts),
            "stream": stream,
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
        post = fetch_combined_intel_post(slug)
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


@intel_bp.post("/institutional/ingest")
def institutional_ingest():
    if not _secret_authorized("INTEL_INSTITUTIONAL_SECRET"):
        return jsonify({"error": "Unauthorized"}), 401
    payload = request.get_json(silent=True) or {}
    result = ingest_institutional_fact_pack(payload)
    return jsonify(result), 202 if result.get("accepted") else 400


@intel_bp.post("/institutional/generate")
def institutional_generate():
    if not _secret_authorized("INTEL_INSTITUTIONAL_SECRET"):
        return jsonify({"error": "Unauthorized"}), 401
    payload = request.get_json(silent=True) or {}
    fact_pack_id = str(payload.get("fact_pack_id") or "").strip()
    if not fact_pack_id:
        return jsonify({"error": "fact_pack_id is required"}), 400
    force = bool(payload.get("force"))
    result = generate_institutional_post(fact_pack_id, force=force)
    if result.get("state") == "missing_fact_pack":
        return jsonify(result), 404
    if result.get("state") == "rejected":
        return jsonify(result), 400
    return jsonify(result), 200


@intel_bp.get("/institutional/posts")
def institutional_posts():
    limit = request.args.get("limit", default=24, type=int) or 24
    institutional_type = (request.args.get("type") or "").strip().lower() or None
    stage = (request.args.get("stage") or "").strip().lower() or None
    visibility = (request.args.get("visibility") or "").strip().lower() or None
    items = fetch_institutional_posts(
        limit=max(1, min(limit, 240)),
        institutional_type=institutional_type,
        stage=stage,
        visibility=visibility,
    )
    return jsonify({
        "items": items,
        "count": len(items),
        "refreshed_at": _iso_now(),
    }), 200


@intel_bp.get("/institutional/posts/<slug>")
def institutional_post_detail(slug: str):
    post = fetch_institutional_post(slug)
    if not post:
        return jsonify({"error": "Institutional post not found"}), 404
    return jsonify(post), 200


@intel_bp.post("/distribution/preview/<slug>")
def distribution_preview(slug: str):
    payload = request.get_json(silent=True) or {}
    result = generate_distribution_assets(slug, payload.get("channels"))
    if result.get("error"):
        return jsonify(result), 404
    return jsonify(result), 200


@intel_bp.post("/distribution/publish/<slug>")
def distribution_publish(slug: str):
    if not _secret_authorized("INTEL_DISTRIBUTION_SECRET"):
        return jsonify({"error": "Unauthorized"}), 401
    payload = request.get_json(silent=True) or {}
    result = publish_distribution(
        slug,
        payload.get("channels"),
        dry_run=bool(payload.get("dry_run")),
    )
    if result.get("error") == "Intel post not found":
        return jsonify(result), 404
    if result.get("error"):
        return jsonify(result), 400
    return jsonify(result), 200


@intel_bp.get("/distribution/status/<slug>")
def distribution_status(slug: str):
    return jsonify(fetch_distribution_status(slug)), 200
