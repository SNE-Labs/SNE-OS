"""
Intel service orchestration.
Combines multi-source ingestion, curation, enrichment and editorial drafts.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
import re
import threading
from typing import Any, Dict, List
from urllib.parse import urlparse

from .intel_enrichment import IntelEnricher
from .intel_sources import fetch_multi_source_entries
from .utils.redis_safe import SafeRedis

logger = logging.getLogger(__name__)

CRYPTO_RELEVANCE_TOKENS = {
    "bitcoin",
    "btc",
    "ethereum",
    "eth",
    "solana",
    "sol",
    "polygon",
    "matic",
    "scroll",
    "arbitrum",
    "optimism",
    "base",
    "crypto",
    "blockchain",
    "wallet",
    "wallets",
    "defi",
    "stablecoin",
    "stablecoins",
    "token",
    "tokens",
    "nft",
    "bridge",
    "bridges",
    "rollup",
    "zk",
    "mev",
    "validator",
    "validators",
    "staking",
    "swap",
    "protocol",
    "onchain",
    "on-chain",
    "rpc",
    "airdrops",
    "airdrop",
}

GENERALIST_SOURCES = {"hn_front_page"}
COMMUNITY_SOURCE_CAP = 1
BLOG_SOURCE_NAME = "SNE Enterprise Blog"
BLOG_DAILY_LIMIT = 5
BLOG_SURFACE_LIMIT = 2
POST_CACHE_KEY = "intel:enterprise:posts"
POST_REFRESH_LOCK_KEY = "intel:enterprise:refreshing"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _utc_day_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _normalize_title(title: str) -> str:
    return "".join(ch for ch in title.lower() if ch.isalnum() or ch.isspace()).strip()


def _normalized_text(text: str) -> str:
    lowered = text.lower()
    lowered = re.sub(r"[^a-z0-9\s:/._-]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", _normalized_text(text)))


def _relevance_hits(entry: Dict[str, Any]) -> set[str]:
    text = " ".join([
        entry.get("title", ""),
        entry.get("url", ""),
        " ".join(entry.get("tags", [])),
        entry.get("source", ""),
    ])
    return _tokenize(text).intersection(CRYPTO_RELEVANCE_TOKENS)


def _recency_score(created_at: str) -> int:
    try:
        timestamp = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        age_hours = max(0.0, (datetime.now(timezone.utc) - timestamp.astimezone(timezone.utc)).total_seconds() / 3600)
    except Exception:
        return 4

    if age_hours <= 6:
        return 18
    if age_hours <= 24:
        return 12
    if age_hours <= 72:
        return 8
    return 3


def _source_weight(source_tier: str) -> int:
    return {
        "protocol": 30,
        "media": 22,
        "community": 14,
    }.get(source_tier, 10)


def _curation_score(entry: Dict[str, Any]) -> int:
    relevance_hits = _relevance_hits(entry)
    keyword_bonus = len(relevance_hits) * 8
    source_penalty = -18 if entry.get("source_key") in GENERALIST_SOURCES else 0
    return (
        _source_weight(entry.get("source_tier", "community"))
        + _recency_score(entry.get("created_at", _iso_now()))
        + min(25, int(entry.get("points", 0)))
        + min(18, int(entry.get("comments", 0)))
        + keyword_bonus
        + source_penalty
    )


def _is_relevant_entry(entry: Dict[str, Any]) -> bool:
    if entry.get("source_tier") in {"protocol", "media"}:
        return True

    relevance_hits = _relevance_hits(entry)
    if entry.get("source_key") in GENERALIST_SOURCES:
        return len(relevance_hits) >= 2
    return bool(relevance_hits)


def _dedupe(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen_titles: set[str] = set()
    seen_urls: set[str] = set()
    deduped: List[Dict[str, Any]] = []

    for entry in entries:
        normalized_title = _normalize_title(entry["title"])
        normalized_url = urlparse(entry["url"])._replace(query="", fragment="").geturl()
        if normalized_title in seen_titles or normalized_url in seen_urls:
            continue
        seen_titles.add(normalized_title)
        seen_urls.add(normalized_url)
        deduped.append(entry)

    return deduped


def _curate(entries: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    deduped = _dedupe(entries)
    relevant = [entry for entry in deduped if _is_relevant_entry(entry)]
    ranked = sorted(relevant, key=_curation_score, reverse=True)

    curated: List[Dict[str, Any]] = []
    community_count = 0
    for entry in ranked:
        is_community = entry.get("source_key") in GENERALIST_SOURCES
        if is_community and community_count >= COMMUNITY_SOURCE_CAP:
            continue
        curated.append(entry)
        if is_community:
            community_count += 1
        if len(curated) >= limit:
            break

    return curated


def _executive_summary(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not items:
        return {
            "headline": "Nenhum sinal novo no briefing agora.",
            "bullet_points": [],
        }

    lead = items[0]
    bullet_points = [
        item["why_it_matters"]
        for item in items[:3]
        if item.get("why_it_matters")
    ]
    return {
        "headline": f"{lead['module']} lidera o briefing com foco em {lead['impact']['label']} impacto.",
        "bullet_points": bullet_points[:3],
    }


def _clusters(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for item in items:
        topic = item["topics"][0] if item.get("topics") else "ecossistema"
        grouped.setdefault(topic, []).append(item)

    clusters: List[Dict[str, Any]] = []
    for topic, topic_items in grouped.items():
        chains: List[str] = []
        for item in topic_items:
            for chain in item.get("chains", []):
                if chain not in chains:
                    chains.append(chain)
        clusters.append({
            "id": f"cluster:{topic}",
            "titulo": topic.replace("_", " ").title(),
            "resumo": f"{len(topic_items)} sinais agrupados em {topic}.",
            "topicos": [topic],
            "chains": chains[:3],
            "intensidade": "alta" if len(topic_items) >= 2 else "media",
        })
    return clusters[:4]


def _shape_blog_item(post: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": f"blog:{post['slug']}",
        "title": post["title"],
        "title_original": post["title"],
        "title_pt": post["title"],
        "summary": post.get("excerpt", ""),
        "summary_pt": post.get("excerpt", ""),
        "url": f"/intel/{post['slug']}",
        "source": BLOG_SOURCE_NAME,
        "source_tier": "editorial",
        "points": 0,
        "comments": 0,
        "author": "SNE Enterprise",
        "created_at": post.get("generated_at", _iso_now()),
        "language": "pt-BR",
        "translated": True,
        "module": "Intel",
        "agent_note": "Resenha editorial gerada pelo pipeline SNE.",
        "impact": {"label": "editorial", "score": 0, "direction": "neutra"},
        "topics": post.get("topics", []),
        "chains": post.get("chains", []),
        "protocols": post.get("protocols", []),
        "assets": post.get("assets", []),
        "why_it_matters": post.get("subtitle", ""),
        "watch_items": [],
        "surface": ["Home", "Intel"],
    }


def _load_cached_posts(redis_client: SafeRedis) -> List[Dict[str, Any]]:
    cached = redis_client.get(POST_CACHE_KEY)
    if not cached:
        return []
    try:
        import json
        return json.loads(cached)
    except Exception:
        return []


def _store_cached_posts(redis_client: SafeRedis, posts: List[Dict[str, Any]]) -> None:
    try:
        import json
        redis_client.setex(POST_CACHE_KEY, 86400, json.dumps(posts))
    except Exception:
        pass


def _blog_daily_count(redis_client: SafeRedis) -> int:
    count = redis_client.get(f"intel:enterprise:count:{_utc_day_key()}")
    try:
        return int(count or 0)
    except Exception:
        return 0


def _increment_blog_daily_count(redis_client: SafeRedis) -> int:
    key = f"intel:enterprise:count:{_utc_day_key()}"
    count = redis_client.incr(key)
    redis_client.expire(key, 172800)
    return count


def _refresh_enterprise_posts(limit: int = BLOG_DAILY_LIMIT) -> None:
    redis_client = SafeRedis()
    try:
        existing = _load_cached_posts(redis_client)
        if len(existing) >= limit or _blog_daily_count(redis_client) >= BLOG_DAILY_LIMIT:
            return

        briefing = build_intel_briefing(limit=max(limit, 6), include_blog=False)
        enricher = IntelEnricher()
        posts = list(existing)
        existing_slugs = {post["slug"] for post in posts}

        for item in briefing["items"]:
            if len(posts) >= limit or _blog_daily_count(redis_client) >= BLOG_DAILY_LIMIT:
                break
            try:
                post = enricher.build_post(item)
            except Exception as exc:
                logger.warning("Intel enterprise post build failed for %s: %s", item.get("id", item.get("title", "unknown")), exc)
                continue
            if post["status"] != "draft":
                continue
            if post["slug"] in existing_slugs:
                continue
            posts.append(post)
            existing_slugs.add(post["slug"])
            _increment_blog_daily_count(redis_client)

        _store_cached_posts(redis_client, posts)
    finally:
        redis_client.delete(POST_REFRESH_LOCK_KEY)


def _trigger_enterprise_post_refresh() -> None:
    redis_client = SafeRedis()
    if redis_client.get(POST_REFRESH_LOCK_KEY):
        return
    if not redis_client.setex(POST_REFRESH_LOCK_KEY, 120, "1"):
        return

    worker = threading.Thread(target=_refresh_enterprise_posts, kwargs={"limit": BLOG_DAILY_LIMIT}, daemon=True)
    worker.start()


def build_intel_briefing(limit: int = 6, limit_per_source: int = 4, include_blog: bool = True) -> Dict[str, Any]:
    raw_entries = fetch_multi_source_entries(limit_per_source=limit_per_source)
    curated_entries = _curate(raw_entries, limit=max(limit, 8))
    enricher = IntelEnricher()
    raw_items = [enricher.enrich_item(entry) for entry in curated_entries[:limit]]
    items = list(raw_items)

    if include_blog:
        redis_client = SafeRedis()
        blog_posts = _load_cached_posts(redis_client)
        blog_items = [_shape_blog_item(post) for post in blog_posts[:BLOG_SURFACE_LIMIT]]
        if len(blog_posts) < BLOG_DAILY_LIMIT:
            _trigger_enterprise_post_refresh()
        items = (blog_items + raw_items)[:limit]

    return {
        "locale": "pt-BR",
        "lead": items[0] if items else None,
        "items": items,
        "resumo_executivo": _executive_summary(items),
        "clusters": _clusters(items),
        "last_updated": _iso_now(),
    }


def fetch_intel_items(limit: int = 6) -> List[Dict[str, Any]]:
    return build_intel_briefing(limit=limit)["items"]


def fetch_intel_posts(limit: int = 8) -> List[Dict[str, Any]]:
    redis_client = SafeRedis()
    posts = _load_cached_posts(redis_client)
    if len(posts) < min(limit, BLOG_DAILY_LIMIT):
        _trigger_enterprise_post_refresh()
    return posts[:limit]


def fetch_intel_post(slug: str) -> Dict[str, Any] | None:
    posts = fetch_intel_posts(limit=10)
    for post in posts:
        if post["slug"] == slug:
            return post
    return None
