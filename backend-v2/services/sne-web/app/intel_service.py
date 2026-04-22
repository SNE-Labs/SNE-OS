"""
Intel service orchestration.
Combines multi-source ingestion, curation, enrichment and editorial drafts.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
import os
import re
import threading
from typing import Any, Dict, List
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from .intel_enrichment import IntelEnricher
from .intel_sources import fetch_multi_source_entries
from .intel_visuals import apply_visual_entities
from .market_service import build_home_market_payload
from .utils.redis_safe import SafeRedis

logger = logging.getLogger(__name__)


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return max(minimum, int(raw))
    except (TypeError, ValueError):
        logger.warning("Invalid %s=%s. Falling back to %s.", name, raw, default)
        return default

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

BROADER_RELEVANCE_TOKENS = {
    "ai",
    "llm",
    "model",
    "models",
    "technology",
    "tech",
    "software",
    "hardware",
    "chip",
    "chips",
    "semiconductor",
    "economy",
    "economic",
    "economics",
    "macro",
    "inflation",
    "rates",
    "fed",
    "treasury",
    "yield",
    "liquidity",
    "policy",
    "regulation",
    "geopolitics",
    "geopolitical",
    "war",
    "sanction",
    "sanctions",
    "trade",
    "china",
    "russia",
    "europe",
}

GENERALIST_SOURCES = {"hn_front_page", "techcrunch", "openai_news", "reuters_business", "reuters_world"}
COMMUNITY_SOURCE_CAP = 2
BLOG_SOURCE_NAME = "Intel Brief"
BLOG_DAILY_LIMIT = _env_int("INTEL_BLOG_DAILY_LIMIT", 240)
BLOG_MIN_DAILY_POSTS = _env_int("INTEL_BLOG_MIN_DAILY_POSTS", 24)
BLOG_SURFACE_LIMIT = _env_int("INTEL_BLOG_SURFACE_LIMIT", 6)
BLOG_MARKET_DAILY_LIMIT = _env_int("INTEL_BLOG_MARKET_DAILY_LIMIT", 12)
BLOG_TOTAL_LIMIT = _env_int("INTEL_BLOG_TOTAL_LIMIT", 320)
BLOG_REFRESH_INSERT_LIMIT = _env_int("INTEL_BLOG_REFRESH_INSERT_LIMIT", 3)
MARKET_POST_ASSET_DAILY_LIMIT = 1
MARKET_POST_RECENT_WINDOW = 3
MARKET_POST_RECENT_CAP = 1
POST_CACHE_KEY = "intel:enterprise:posts"
POST_CACHE_META_KEY = "intel:enterprise:posts:meta"
POST_REFRESH_LOCK_KEY = "intel:enterprise:refreshing"
POST_CACHE_TTL_SECONDS = 86400
POST_REFRESH_INTERVAL = timedelta(minutes=_env_int("INTEL_POST_REFRESH_INTERVAL_MINUTES", 5))
POST_REFRESH_LOCK_TTL_SECONDS = _env_int("INTEL_POST_REFRESH_LOCK_TTL_SECONDS", 600, minimum=60)
DEFAULT_INTEL_RESET_TZ = "America/Sao_Paulo"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _intel_reset_timezone() -> ZoneInfo:
    timezone_name = (os.getenv("INTEL_DAILY_RESET_TZ") or DEFAULT_INTEL_RESET_TZ).strip() or DEFAULT_INTEL_RESET_TZ
    try:
        return ZoneInfo(timezone_name)
    except Exception:
        logger.warning("Invalid INTEL_DAILY_RESET_TZ=%s. Falling back to UTC.", timezone_name)
        return ZoneInfo("UTC")


def _parse_generated_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def _reset_day_key(value: datetime | None = None) -> str:
    tz = _intel_reset_timezone()
    current = value.astimezone(tz) if value else datetime.now(tz)
    return current.strftime("%Y-%m-%d")


def _utc_day_key(value: datetime | None = None) -> str:
    current = value.astimezone(timezone.utc) if value else datetime.now(timezone.utc)
    return current.strftime("%Y-%m-%d")


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


def _broader_relevance_hits(entry: Dict[str, Any]) -> set[str]:
    text = " ".join([
        entry.get("title", ""),
        entry.get("url", ""),
        " ".join(entry.get("tags", [])),
        entry.get("source", ""),
    ])
    return _tokenize(text).intersection(BROADER_RELEVANCE_TOKENS)


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
    broader_hits = _broader_relevance_hits(entry)
    keyword_bonus = (len(relevance_hits) * 8) + (len(broader_hits) * 5)
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
    if entry.get("source_tier") in {"protocol"}:
        return True

    relevance_hits = _relevance_hits(entry)
    broader_hits = _broader_relevance_hits(entry)
    if entry.get("source_tier") == "media" and entry.get("source_key") not in GENERALIST_SOURCES:
        return True
    if entry.get("source_key") in GENERALIST_SOURCES:
        return bool(relevance_hits) or len(broader_hits) >= 2
    return bool(relevance_hits) or bool(broader_hits)


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
    shaped = {
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
        "editorial_kind": post.get("editorial_kind", "dossier"),
        "category": post.get("category", "news"),
    }
    if post.get("visual_entities"):
        shaped["visual_entities"] = post.get("visual_entities", [])
    if post.get("primary_visual_entity"):
        shaped["primary_visual_entity"] = post.get("primary_visual_entity")
    if post.get("countries"):
        shaped["countries"] = post.get("countries", [])
    return apply_visual_entities(shaped)


def _normalize_post(post: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(post)
    tldr = normalized.get("tldr")
    if isinstance(tldr, list):
        normalized["tldr"] = [str(item).strip() for item in tldr if str(item).strip()]
    elif isinstance(tldr, str):
        cleaned = tldr.strip()
        normalized["tldr"] = [cleaned] if cleaned else []
    else:
        normalized["tldr"] = []
    normalized["editorial_kind"] = str(normalized.get("editorial_kind") or ("briefing" if normalized.get("category") == "market" else "dossier"))
    normalized["category"] = str(normalized.get("category") or "news")
    return apply_visual_entities(normalized)


def _is_stale_fallback_post(post: Dict[str, Any]) -> bool:
    subtitle = str(post.get("subtitle") or "").strip().lower()
    body = str(post.get("body_markdown") or "").strip().lower()
    excerpt = str(post.get("excerpt") or "").strip().lower()
    markers = (
        "leitura editorial sintetizada a partir do contexto disponível.",
        "o texto acima é um fallback editorial quando a geração aprofundada não está disponível.",
        "o item monitorado pelo sne os aponta para um novo desenvolvimento",
    )
    haystack = "\n".join([subtitle, body, excerpt])
    return any(marker in haystack for marker in markers)


def _post_sort_key(post: Dict[str, Any]) -> str:
    return str(post.get("generated_at") or post.get("created_at") or "")


def _post_assets(post: Dict[str, Any]) -> List[str]:
    assets = post.get("assets") or []
    if not isinstance(assets, list):
        return []
    return [str(asset).strip().upper() for asset in assets if str(asset).strip()]


def _post_primary_asset(post: Dict[str, Any]) -> str | None:
    assets = _post_assets(post)
    return assets[0] if assets else None


def _market_asset_daily_count(posts: List[Dict[str, Any]], asset: str) -> int:
    today = _reset_day_key()
    normalized_asset = asset.strip().upper()
    return sum(
        1
        for post in posts
        if post.get("category") == "market"
        and normalized_asset in _post_assets(post)
        and _reset_day_key(_parse_generated_datetime(post.get("generated_at"))) == today
    )


def _recent_market_count(posts: List[Dict[str, Any]], window: int = MARKET_POST_RECENT_WINDOW) -> int:
    ordered = sorted(posts, key=_post_sort_key, reverse=True)
    return sum(1 for post in ordered[:window] if post.get("category") == "market")


def _prune_redundant_posts(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    ordered = sorted((_normalize_post(post) for post in posts), key=_post_sort_key, reverse=True)
    pruned: List[Dict[str, Any]] = []
    seen_market_assets: set[tuple[str, str]] = set()

    for post in ordered:
        if _is_stale_fallback_post(post):
            continue
        if post.get("category") == "market":
            asset = _post_primary_asset(post)
            if asset:
                day_key = _reset_day_key(_parse_generated_datetime(post.get("generated_at")))
                market_key = (day_key, asset)
                if market_key in seen_market_assets:
                    continue
                seen_market_assets.add(market_key)
        pruned.append(post)

    return pruned


def _pick_post(
    posts: List[Dict[str, Any]],
    selected_ids: set[str],
    *,
    editorial_kind: str | None = None,
    category: str | None = None,
    topics: set[str] | None = None,
    exclude_topics: set[str] | None = None,
) -> Dict[str, Any] | None:
    for post in posts:
        post_id = str(post.get("id", ""))
        if post_id in selected_ids:
            continue
        if editorial_kind and post.get("editorial_kind") != editorial_kind:
            continue
        if category and post.get("category") != category:
            continue
        post_topics = {str(topic) for topic in post.get("topics", [])}
        if topics and not post_topics.intersection(topics):
            continue
        if exclude_topics and post_topics.intersection(exclude_topics):
            continue
        return post
    return None


def _curate_home_editorial_posts(posts: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    if not posts:
        return []

    ordered = sorted(posts, key=_post_sort_key, reverse=True)
    selected: List[Dict[str, Any]] = []
    selected_ids: set[str] = set()

    def add(post: Dict[str, Any] | None) -> None:
        if not post:
            return
        post_id = str(post.get("id", ""))
        if not post_id or post_id in selected_ids:
            return
        selected.append(post)
        selected_ids.add(post_id)

    # 1. Open with the strongest long-form dossier.
    add(_pick_post(ordered, selected_ids, editorial_kind="dossier", exclude_topics={"mercado", "momentum"}))

    # 2. Keep one market briefing near the top for operational rhythm.
    add(_pick_post(ordered, selected_ids, editorial_kind="briefing", category="market"))

    # 3. Pull in a broader thematic piece so the top isn't all crypto market.
    add(
        _pick_post(
            ordered,
            selected_ids,
            editorial_kind="dossier",
            topics={"tech", "economia", "geopolitica", "ia"},
        )
    )

    # 4. Fill the remaining slots by recency, preserving the handcrafted lead trio above.
    for post in ordered:
        add(post)
        if len(selected) >= limit:
            break

    return selected[:limit]


def _asset_to_chain(asset: str) -> str | None:
    return {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "SOL": "solana",
        "BNB": "bnb",
        "XRP": "xrp",
        "ADA": "cardano",
        "LINK": "chainlink",
        "AVAX": "avalanche",
        "ARB": "arbitrum",
        "OP": "optimism",
        "UNI": "uniswap",
        "MKR": "maker",
    }.get(asset.upper())


def _market_symbol_url(symbol: str) -> str:
    base = symbol.replace("USDT", "_USDT")
    return f"https://www.binance.com/en/trade/{base}?type=spot"


def _market_blog_candidates(limit: int = BLOG_MARKET_DAILY_LIMIT) -> List[Dict[str, Any]]:
    market = build_home_market_payload()
    candidates: List[Dict[str, Any]] = []
    seen_symbols: set[str] = set()

    pools = [
        market.get("volume_leaders", []),
        market.get("top_movers", []),
        market.get("top_losers", []),
    ]

    for pool in pools:
        for item in pool:
            symbol = str(item.get("symbol", "")).upper()
            if not symbol or symbol in seen_symbols:
                continue
            seen_symbols.add(symbol)

            asset = symbol.replace("USDT", "")
            chain = _asset_to_chain(asset)
            change_pct = float(item.get("change24h", 0) or 0) * 100
            direction = "alta" if change_pct >= 0 else "queda"
            magnitude = f"{abs(change_pct):.1f}%"
            title = f"{asset} em foco: resumo diário após {direction} de {magnitude}"
            summary = (
                f"{asset} encerra a janela recente com {direction} de {magnitude}, "
                f"preço em {item.get('price')} e volume relevante para leitura tática."
            )
            why = (
                f"{asset} concentra atenção no market pulse e merece acompanhamento em liquidez, "
                f"direção do fluxo e continuidade de movimento nas próximas horas."
            )
            watch_items = [
                f"momentum de {asset}",
                f"liquidez de {asset}",
                "continuidade do fluxo intradiario",
            ]

            candidates.append({
                "id": f"market:{_utc_day_key()}:{symbol}",
                "title": title,
                "title_original": title,
                "title_pt": title,
                "summary": summary,
                "summary_pt": summary,
                "url": _market_symbol_url(symbol),
                "source": "SNE Market Engine",
                "source_tier": "editorial",
                "author": "SNE Market Engine",
                "created_at": _iso_now(),
                "points": 0,
                "comments": 0,
                "language": "pt-BR",
                "translated": True,
                "module": "Radar",
                "agent_note": "Resenha diaria de mercado sobre ativos lideres do ecossistema.",
                "impact": {"label": "alto" if abs(change_pct) >= 3 else "medio", "score": min(100, int(abs(change_pct) * 10) + 35), "direction": "positiva" if change_pct >= 0 else "negativa"},
                "topics": ["mercado", "momentum"],
                "chains": [chain] if chain else [],
                "protocols": [],
                "assets": [asset],
                "why_it_matters": why,
                "watch_items": watch_items,
                "surface": ["Home", "Radar", "Intel"],
                "editorial_kind": "briefing",
                "category": "market",
            })

            if len(candidates) >= limit:
                return candidates

    return candidates


def _load_cached_posts(redis_client: SafeRedis) -> List[Dict[str, Any]]:
    cached = redis_client.get(POST_CACHE_KEY)
    if not cached:
        return []
    try:
        import json
        posts = json.loads(cached)
        if not isinstance(posts, list):
            return []
        normalized_posts = [post for post in posts if isinstance(post, dict)]
        return _prune_redundant_posts(normalized_posts)
    except Exception:
        return []


def _load_cached_posts_meta(redis_client: SafeRedis) -> Dict[str, Any]:
    cached = redis_client.get(POST_CACHE_META_KEY)
    if not cached:
        return {}
    try:
        import json
        payload = json.loads(cached)
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
      return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def _latest_posts_timestamp(posts: List[Dict[str, Any]]) -> str:
    for post in sorted(posts, key=_post_sort_key, reverse=True):
        candidate = str(post.get("generated_at") or post.get("created_at") or "").strip()
        if candidate:
            return candidate
    return _iso_now()


def _cached_posts_last_updated(redis_client: SafeRedis, posts: List[Dict[str, Any]]) -> str:
    meta = _load_cached_posts_meta(redis_client)
    cached_at = str(meta.get("cached_at") or "").strip()
    if cached_at:
        return cached_at
    return _latest_posts_timestamp(posts)


def _cached_posts_are_stale(redis_client: SafeRedis, posts: List[Dict[str, Any]]) -> bool:
    if not posts:
        return True
    last_updated = _cached_posts_last_updated(redis_client, posts)
    last_updated_dt = _parse_iso_datetime(last_updated)
    if not last_updated_dt:
        return True
    return datetime.now(timezone.utc) - last_updated_dt >= POST_REFRESH_INTERVAL


def _refresh_is_running(redis_client: SafeRedis | None = None) -> bool:
    client = redis_client or SafeRedis()
    return bool(client.get(POST_REFRESH_LOCK_KEY))


def _needs_daily_backfill(posts: List[Dict[str, Any]]) -> bool:
    return _blog_daily_post_count(posts) < BLOG_MIN_DAILY_POSTS


def _posts_need_refresh(redis_client: SafeRedis, posts: List[Dict[str, Any]], limit: int) -> bool:
    return (
        len(posts) < min(limit, BLOG_TOTAL_LIMIT)
        or _cached_posts_are_stale(redis_client, posts)
        or _needs_daily_backfill(posts)
    )


def _store_cached_posts(redis_client: SafeRedis, posts: List[Dict[str, Any]]) -> None:
    try:
        import json
        ordered = _prune_redundant_posts(posts)
        cached_at = _iso_now()
        posts_stored = redis_client.setex(POST_CACHE_KEY, POST_CACHE_TTL_SECONDS, json.dumps(ordered))
        meta_stored = redis_client.setex(
            POST_CACHE_META_KEY,
            POST_CACHE_TTL_SECONDS,
            json.dumps(
                {
                    "cached_at": cached_at,
                    "latest_generated_at": _latest_posts_timestamp(ordered),
                    "count": len(ordered),
                }
            ),
        )
        if not posts_stored or not meta_stored:
            logger.warning(
                "Intel post cache store failed: posts_stored=%s meta_stored=%s count=%s",
                posts_stored,
                meta_stored,
                len(ordered),
            )
    except Exception as exc:
        logger.warning("Intel post cache store failed: %s", exc)


def _blog_daily_count(redis_client: SafeRedis) -> int:
    count = redis_client.get(f"intel:enterprise:count:{_reset_day_key()}")
    try:
        return int(count or 0)
    except Exception:
        return 0


def _blog_daily_post_count(posts: List[Dict[str, Any]]) -> int:
    today = _reset_day_key()
    return sum(
        1
        for post in posts
        if _reset_day_key(_parse_generated_datetime(post.get("generated_at"))) == today
    )


def _blog_daily_market_count(posts: List[Dict[str, Any]]) -> int:
    today = _reset_day_key()
    return sum(
        1
        for post in posts
        if post.get("category") == "market" and _reset_day_key(_parse_generated_datetime(post.get("generated_at"))) == today
    )


def _increment_blog_daily_count(redis_client: SafeRedis) -> int:
    key = f"intel:enterprise:count:{_reset_day_key()}"
    count = redis_client.incr(key)
    redis_client.expire(key, 172800)
    return count


def _auto_publish_new_intel_post(slug: str) -> None:
    try:
        from .distribution_service import auto_publish_intel_post
        auto_publish_intel_post(slug)
    except Exception as exc:
        logger.warning("Intel auto publish failed for %s: %s", slug, exc)


def _refresh_enterprise_posts(limit: int = BLOG_DAILY_LIMIT) -> None:
    redis_client = SafeRedis()
    try:
        existing = _load_cached_posts(redis_client)
        cache_stale = _cached_posts_are_stale(redis_client, existing)

        enricher = IntelEnricher()
        posts = list(existing)[:BLOG_TOTAL_LIMIT]
        existing_slugs = {post["slug"] for post in posts}
        daily_count = _blog_daily_post_count(posts)
        if daily_count >= BLOG_DAILY_LIMIT and not cache_stale:
            return
        market_daily_count = _blog_daily_market_count(posts)
        inserted_this_refresh = 0
        inserted_slugs: List[str] = []
        refresh_insert_limit = max(1, min(limit, BLOG_REFRESH_INSERT_LIMIT))

        market_candidates: List[tuple[Dict[str, Any], str]] = []
        if market_daily_count < BLOG_MARKET_DAILY_LIMIT:
            for item in _market_blog_candidates(limit=BLOG_MARKET_DAILY_LIMIT - market_daily_count):
                asset = _post_primary_asset(item)
                if asset and _market_asset_daily_count(posts, asset) >= MARKET_POST_ASSET_DAILY_LIMIT:
                    continue
                market_candidates.append((item, "market"))

        briefing = build_intel_briefing(limit=max(limit, 6), include_blog=False)
        news_candidates: List[tuple[Dict[str, Any], str]] = []
        for item in briefing["items"]:
            item = dict(item)
            item.setdefault("editorial_kind", "dossier")
            item.setdefault("category", "news")
            news_candidates.append((item, "news"))

        candidates: List[tuple[Dict[str, Any], str]] = []
        prefer_news_first = bool(news_candidates) and _recent_market_count(posts) >= MARKET_POST_RECENT_CAP
        ordered_groups = (news_candidates, market_candidates) if prefer_news_first else (market_candidates, news_candidates)
        for group in ordered_groups:
            candidates.extend(group)

        for item, category in candidates:
            if daily_count >= BLOG_DAILY_LIMIT:
                break
            if inserted_this_refresh >= refresh_insert_limit:
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
            post["category"] = category
            post["editorial_kind"] = item.get("editorial_kind") or ("briefing" if category == "market" else "dossier")
            posts.insert(0, post)
            existing_slugs.add(post["slug"])
            _increment_blog_daily_count(redis_client)
            daily_count += 1
            inserted_this_refresh += 1
            if category == "market":
                market_daily_count += 1
            posts = _prune_redundant_posts(posts)[:BLOG_TOTAL_LIMIT]
            inserted_slugs.append(post["slug"])

        posts = posts[:BLOG_TOTAL_LIMIT]

        _store_cached_posts(redis_client, posts)
        for slug in inserted_slugs:
            _auto_publish_new_intel_post(slug)
    finally:
        redis_client.delete(POST_REFRESH_LOCK_KEY)


def trigger_enterprise_post_refresh(*, async_refresh: bool = False, force: bool = False) -> bool:
    redis_client = SafeRedis()
    if not force and _refresh_is_running(redis_client):
        return False
    if not redis_client.setex(POST_REFRESH_LOCK_KEY, POST_REFRESH_LOCK_TTL_SECONDS, "1"):
        return False

    if async_refresh:
        thread = threading.Thread(
            target=_refresh_enterprise_posts,
            kwargs={"limit": BLOG_DAILY_LIMIT},
            name="intel-enterprise-refresh",
            daemon=True,
        )
        thread.start()
        return True

    _refresh_enterprise_posts(limit=BLOG_DAILY_LIMIT)
    return True


def _trigger_enterprise_post_refresh() -> None:
    trigger_enterprise_post_refresh(async_refresh=False)


def build_intel_briefing(limit: int = 6, limit_per_source: int = 4, include_blog: bool = True) -> Dict[str, Any]:
    raw_entries = fetch_multi_source_entries(limit_per_source=limit_per_source)
    curated_entries = _curate(raw_entries, limit=max(limit, 8))
    enricher = IntelEnricher()
    raw_items = [apply_visual_entities(enricher.enrich_item(entry)) for entry in curated_entries[:limit]]
    items = list(raw_items)

    if include_blog:
        redis_client = SafeRedis()
        blog_posts = _load_cached_posts(redis_client)
        curated_posts = _curate_home_editorial_posts(blog_posts, max(limit, BLOG_SURFACE_LIMIT))
        blog_items = [_shape_blog_item(post) for post in curated_posts]
        if blog_posts and (len(blog_posts) < BLOG_DAILY_LIMIT or _cached_posts_are_stale(redis_client, blog_posts)):
            trigger_enterprise_post_refresh(async_refresh=True)
        elif not blog_posts:
            _trigger_enterprise_post_refresh()
            blog_posts = _load_cached_posts(redis_client)
            curated_posts = _curate_home_editorial_posts(blog_posts, max(limit, BLOG_SURFACE_LIMIT))
            blog_items = [_shape_blog_item(post) for post in curated_posts]
        items = blog_items[:limit] if blog_items else raw_items[:limit]

    return {
        "locale": "pt-BR",
        "lead": items[0] if items else None,
        "items": items,
        "resumo_executivo": _executive_summary(items),
        "clusters": _clusters(items),
        "last_updated": _latest_posts_timestamp(curated_posts) if include_blog and 'curated_posts' in locals() and curated_posts else _iso_now(),
    }


def fetch_intel_items(limit: int = 6) -> List[Dict[str, Any]]:
    return build_intel_briefing(limit=limit)["items"]


def fetch_intel_posts(limit: int = 8) -> List[Dict[str, Any]]:
    redis_client = SafeRedis()
    posts = _load_cached_posts(redis_client)
    if _posts_need_refresh(redis_client, posts, limit):
        trigger_enterprise_post_refresh(async_refresh=True)
    return posts[:limit]


def fetch_intel_posts_last_updated(limit: int = 8) -> str:
    redis_client = SafeRedis()
    posts = _load_cached_posts(redis_client)[:limit]
    return _latest_posts_timestamp(posts)


def fetch_intel_posts_state(limit: int = 8) -> Dict[str, Any]:
    redis_client = SafeRedis()
    posts = _load_cached_posts(redis_client)
    return {
        "count": len(posts),
        "stale": _posts_need_refresh(redis_client, posts, limit),
        "refreshing": _refresh_is_running(redis_client),
        "last_updated": _latest_posts_timestamp(posts),
        "cache_updated_at": _cached_posts_last_updated(redis_client, posts) if posts else None,
    }


def fetch_intel_post(slug: str) -> Dict[str, Any] | None:
    posts = fetch_intel_posts(limit=BLOG_TOTAL_LIMIT)
    for post in posts:
        if post["slug"] == slug:
            return post
    return None
