"""
Intel API for SNE OS Home
Fetches real public stories and maps them into a lightweight briefing format.
"""

from datetime import datetime
import logging
from typing import List, Dict

import requests
from flask import Blueprint, jsonify

from .utils.redis_safe import SafeRedis

logger = logging.getLogger(__name__)

intel_bp = Blueprint("intel", __name__)

HN_FRONT_PAGE_URL = "https://hn.algolia.com/api/v1/search?tags=front_page"


def _module_hint(title: str, url: str) -> str:
    text = f"{title} {url}".lower()
    if any(token in text for token in ["wallet", "identity", "passport", "kyc", "auth"]):
        return "Passport"
    if any(token in text for token in ["vault", "security", "custody", "private key", "seed"]):
        return "Vault"
    if any(token in text for token in ["api", "credential", "token", "access", "key "]):
        return "Keys"
    if any(token in text for token in ["defi", "exchange", "market", "trading", "liquidity", "crypto"]):
        return "Radar"
    return "Explore"


def _agent_note(title: str, module: str) -> str:
    if module == "Radar":
        return f"Useful market context for {module}."
    if module == "Passport":
        return f"Identity or auth signal relevant to {module}."
    if module == "Vault":
        return f"Security context that may affect {module}."
    if module == "Keys":
        return f"Access or credential context relevant to {module}."
    return f"General ecosystem context for {module}."


def fetch_intel_items(limit: int = 6) -> List[Dict]:
    redis_client = SafeRedis()
    cache_key = f"intel:front-page:{limit}"

    cached = redis_client.get(cache_key)
    if cached:
        import json
        return json.loads(cached)

    response = requests.get(HN_FRONT_PAGE_URL, timeout=10)
    response.raise_for_status()
    payload = response.json()
    hits = payload.get("hits", [])

    items: List[Dict] = []
    for hit in hits[:limit]:
        title = hit.get("title") or hit.get("story_title")
        url = hit.get("url") or hit.get("story_url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
        if not title or not url:
            continue

        module = _module_hint(title, url)
        items.append({
            "id": hit.get("objectID"),
            "title": title,
            "url": url,
            "source": "Hacker News",
            "points": hit.get("points", 0),
            "comments": hit.get("num_comments", 0),
            "author": hit.get("author", "unknown"),
            "created_at": hit.get("created_at", datetime.utcnow().isoformat()),
            "module": module,
            "agent_note": _agent_note(title, module),
        })

    if items:
        try:
            import json
            redis_client.setex(cache_key, 300, json.dumps(items))
        except Exception:
            pass

    return items


@intel_bp.get("/briefing")
def intel_briefing():
    try:
        items = fetch_intel_items(limit=6)
        return jsonify({
            "items": items,
            "last_updated": datetime.utcnow().isoformat(),
        }), 200
    except Exception as exc:
        logger.warning(f"Intel briefing failed: {exc}")
        return jsonify({
            "items": [],
            "last_updated": datetime.utcnow().isoformat(),
        }), 200
