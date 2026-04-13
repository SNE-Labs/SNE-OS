"""
Intel source ingestion for SNE Web.
Standardizes public feeds into raw intel entries before enrichment.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import json
import logging
from typing import Any, Dict, List
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

import requests

from .utils.redis_safe import SafeRedis

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class IntelSource:
    key: str
    name: str
    url: str
    format: str
    source_tier: str
    tags: tuple[str, ...] = field(default_factory=tuple)


DEFAULT_SOURCES: List[IntelSource] = [
    IntelSource(
        key="hn_front_page",
        name="Hacker News",
        url="https://hn.algolia.com/api/v1/search?tags=front_page",
        format="json_hn",
        source_tier="community",
        tags=("infra", "ia", "devtools"),
    ),
    IntelSource(
        key="coindesk_rss",
        name="CoinDesk",
        url="https://www.coindesk.com/arc/outboundfeeds/rss/",
        format="rss",
        source_tier="media",
        tags=("mercado", "defi", "macro"),
    ),
    IntelSource(
        key="cointelegraph_rss",
        name="Cointelegraph",
        url="https://cointelegraph.com/rss",
        format="rss",
        source_tier="media",
        tags=("mercado", "regulacao", "bitcoin"),
    ),
    IntelSource(
        key="ethereum_blog",
        name="Ethereum Blog",
        url="https://blog.ethereum.org/feed.xml",
        format="rss",
        source_tier="protocol",
        tags=("ethereum", "infra", "rollup"),
    ),
    IntelSource(
        key="techcrunch",
        name="TechCrunch",
        url="https://techcrunch.com/feed/",
        format="rss",
        source_tier="media",
        tags=("tech", "ai", "startup"),
    ),
    IntelSource(
        key="openai_news",
        name="OpenAI News",
        url="https://openai.com/news/rss.xml",
        format="rss",
        source_tier="media",
        tags=("tech", "ia", "models"),
    ),
    IntelSource(
        key="reuters_business",
        name="Reuters Business",
        url="https://feeds.reuters.com/reuters/businessNews",
        format="rss",
        source_tier="media",
        tags=("economia", "macro", "rates"),
    ),
    IntelSource(
        key="reuters_world",
        name="Reuters World",
        url="https://feeds.reuters.com/Reuters/worldNews",
        format="rss",
        source_tier="media",
        tags=("geopolitica", "world", "policy"),
    ),
]


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_datetime(value: str | None) -> str:
    if not value:
        return _iso_now()
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except Exception:
        return value


def _rss_text(node: ET.Element | None, path: str, namespace: Dict[str, str] | None = None) -> str | None:
    if node is None:
        return None
    found = node.find(path, namespace or {})
    if found is None:
        return None
    return (found.text or "").strip() or None


def _entry_id(source_key: str, title: str, url: str) -> str:
    return f"{source_key}:{abs(hash((title, url))) % 10_000_000_000}"


def _parse_hn(payload: Dict[str, Any], source: IntelSource, limit: int) -> List[Dict[str, Any]]:
    hits = payload.get("hits", [])
    entries: List[Dict[str, Any]] = []
    for hit in hits[:limit]:
        title = hit.get("title") or hit.get("story_title")
        url = hit.get("url") or hit.get("story_url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
        if not title or not url:
            continue
        entries.append({
            "id": hit.get("objectID") or _entry_id(source.key, title, url),
            "title": title,
            "url": url,
            "source": source.name,
            "source_key": source.key,
            "source_tier": source.source_tier,
            "author": hit.get("author", "unknown"),
            "created_at": hit.get("created_at", _iso_now()),
            "points": hit.get("points", 0),
            "comments": hit.get("num_comments", 0),
            "tags": list(source.tags),
        })
    return entries


def _parse_rss(text: str, source: IntelSource, limit: int) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    root = ET.fromstring(text)
    namespace = {
        "atom": "http://www.w3.org/2005/Atom",
        "dc": "http://purl.org/dc/elements/1.1/",
        "content": "http://purl.org/rss/1.0/modules/content/",
    }

    items = root.findall(".//channel/item")
    if not items:
        items = root.findall(".//atom:entry", namespace)

    for item in items[:limit]:
        title = _rss_text(item, "title") or _rss_text(item, "atom:title", namespace)
        link = _rss_text(item, "link")
        if not link:
            atom_link = item.find("atom:link", namespace)
            if atom_link is not None:
                link = atom_link.attrib.get("href")
        created_at = (
            _rss_text(item, "pubDate")
            or _rss_text(item, "updated")
            or _rss_text(item, "atom:updated", namespace)
        )
        author = (
            _rss_text(item, "dc:creator", namespace)
            or _rss_text(item, "author")
            or _rss_text(item, "atom:author/atom:name", namespace)
            or urlparse(source.url).netloc
        )
        if not title or not link:
            continue
        entries.append({
            "id": _entry_id(source.key, title, link),
            "title": title,
            "url": link,
            "source": source.name,
            "source_key": source.key,
            "source_tier": source.source_tier,
            "author": author,
            "created_at": _safe_datetime(created_at),
            "points": 0,
            "comments": 0,
            "tags": list(source.tags),
        })

    return entries


def _fetch_source(source: IntelSource, limit: int) -> List[Dict[str, Any]]:
    redis_client = SafeRedis()
    cache_key = f"intel:source:{source.key}:{limit}"
    cached = redis_client.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    response = requests.get(source.url, timeout=12)
    response.raise_for_status()

    if source.format == "json_hn":
        entries = _parse_hn(response.json(), source, limit)
    elif source.format == "rss":
        entries = _parse_rss(response.text, source, limit)
    else:
        raise ValueError(f"Unsupported intel source format: {source.format}")

    if entries:
        try:
            redis_client.setex(cache_key, 300, json.dumps(entries))
        except Exception:
            pass

    return entries


def fetch_multi_source_entries(limit_per_source: int = 4) -> List[Dict[str, Any]]:
    """
    Fetch raw entries from the configured public sources.
    Source failures are isolated so one bad feed does not break Intel.
    """
    entries: List[Dict[str, Any]] = []
    for source in DEFAULT_SOURCES:
        try:
            entries.extend(_fetch_source(source, limit_per_source))
        except Exception as exc:
            logger.warning(f"Intel source fetch failed for {source.name}: {exc}")
    return entries
