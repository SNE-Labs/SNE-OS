"""
Async market enrichment for the SNE OS Home surface.
Builds richer market payloads and editorial summaries without using LLM on the request path.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
import os
import re
import threading
from typing import Any, Dict, List

import requests

from .collector_client import RADAR_MARKET_UNIVERSE, get_binance_data
from .utils.redis_safe import SafeRedis

logger = logging.getLogger(__name__)

MARKET_CACHE_KEY = "home:market:v2"
MARKET_EDITORIAL_CACHE_KEY = "home:market:editorial:v2"
MARKET_REFRESH_LOCK_KEY = "home:market:refreshing"
MARKET_CACHE_TTL = 180
MARKET_EDITORIAL_TTL = 900


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_json(text: str) -> Dict[str, Any] | None:
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def _normalize_string_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        cleaned = value.strip()
        return [cleaned] if cleaned else []
    return []


def _openai_chat_payload(model: str, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "response_format": {"type": "json_object"},
    }
    if not model.startswith("gpt-5"):
        payload["temperature"] = 0.3
    return payload


def _market_regime(entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not entries:
        return {"label": "sem dados", "tone": "pending", "avg_change_24h": 0.0}

    avg_change = sum(item["change24h"] for item in entries) / len(entries)
    positives = sum(1 for item in entries if item["change24h"] > 0)
    negatives = sum(1 for item in entries if item["change24h"] < 0)

    if avg_change >= 0.02 and positives >= negatives:
        return {"label": "risk-on", "tone": "active", "avg_change_24h": avg_change}
    if avg_change <= -0.02 and negatives > positives:
        return {"label": "risk-off", "tone": "warning", "avg_change_24h": avg_change}
    return {"label": "mixed", "tone": "pending", "avg_change_24h": avg_change}


def _normalize_market_entries(raw: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for item in raw:
        try:
            symbol = str(item.get("symbol", "")).upper()
            if symbol not in RADAR_MARKET_UNIVERSE:
                continue

            quote_volume = float(item.get("quoteVolume", 0) or 0)
            if quote_volume < 10_000_000:
                continue

            price = float(item.get("lastPrice", 0) or 0)
            if price <= 0:
                continue

            change_pct = float(item.get("priceChangePercent", 0) or 0) / 100
            weighted_score = abs(change_pct) * min(quote_volume / 10_000_000, 20)

            normalized.append({
                "symbol": symbol,
                "price": price,
                "change24h": change_pct,
                "volume": quote_volume,
                "score": weighted_score,
            })
        except (TypeError, ValueError):
            continue
    return normalized


def _collect_market_snapshot() -> Dict[str, Any]:
    raw = get_binance_data("ticker/24hr")
    if not isinstance(raw, list):
        raise RuntimeError("Collector returned unexpected market payload")

    entries = _normalize_market_entries(raw)
    movers = sorted([item for item in entries if item["change24h"] >= 0], key=lambda item: item["score"], reverse=True)[:3]
    losers = sorted([item for item in entries if item["change24h"] < 0], key=lambda item: item["score"], reverse=True)[:3]
    volume_leaders = sorted(entries, key=lambda item: item["volume"], reverse=True)[:3]
    regime = _market_regime(entries)

    return {
        "top_movers": movers,
        "top_losers": losers,
        "volume_leaders": volume_leaders,
        "regime": regime,
        "editorial": {
            "status": "pending",
            "headline": "",
            "summary_pt": "",
            "watch_items": [],
            "highlights": [],
            "generated_at": None,
        },
        "last_updated": _iso_now(),
    }


def _load_cached_json(redis_client: SafeRedis, key: str) -> Dict[str, Any] | None:
    cached = redis_client.get(key)
    if not cached:
        return None
    try:
        return json.loads(cached)
    except Exception:
        return None


def _store_cached_json(redis_client: SafeRedis, key: str, ttl: int, payload: Dict[str, Any]) -> None:
    try:
        redis_client.setex(key, ttl, json.dumps(payload))
    except Exception:
        pass


def _market_editorial_payload(snapshot: Dict[str, Any]) -> Dict[str, Any] | None:
    provider = os.getenv("INTEL_ENRICHMENT_PROVIDER", "heuristic").strip().lower()
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("MARKET_EDITORIAL_MODEL") or os.getenv("INTEL_ENRICHMENT_MODEL", "gpt-4.1-mini")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

    if provider != "openai" or not api_key:
        return None

    market_payload = {
        "regime": snapshot.get("regime", {}),
        "top_movers": snapshot.get("top_movers", [])[:3],
        "top_losers": snapshot.get("top_losers", [])[:3],
        "volume_leaders": snapshot.get("volume_leaders", [])[:3],
    }

    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=_openai_chat_payload(
                model,
                [
                    {
                        "role": "system",
                        "content": (
                            "Voce e um editor de mercado cripto multichain para a Home do SNE OS. "
                            "Responda JSON valido em pt-BR com headline, summary_pt, watch_items e highlights. "
                            "watch_items deve ser array de strings curtas. highlights deve ser array de objetos com symbol e note."
                        ),
                    },
                    {
                        "role": "user",
                        "content": json.dumps(market_payload, ensure_ascii=False),
                    },
                ],
            ),
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = _extract_json(content)
        if not isinstance(parsed, dict):
            logger.warning("Market editorial returned non-JSON payload")
            return None

        highlights_raw = parsed.get("highlights")
        highlights: List[Dict[str, str]] = []
        if isinstance(highlights_raw, list):
            for entry in highlights_raw:
                if not isinstance(entry, dict):
                    continue
                symbol = str(entry.get("symbol", "")).strip()
                note = str(entry.get("note", "")).strip()
                if symbol and note:
                    highlights.append({"symbol": symbol, "note": note})

        return {
            "status": "ready",
            "headline": str(parsed.get("headline", "")).strip(),
            "summary_pt": str(parsed.get("summary_pt", "")).strip(),
            "watch_items": _normalize_string_list(parsed.get("watch_items")),
            "highlights": highlights[:3],
            "generated_at": _iso_now(),
        }
    except Exception as exc:
        logger.warning("Market editorial generation failed: %s", exc)
        return {
            "status": "failed",
            "headline": "",
            "summary_pt": "",
            "watch_items": [],
            "highlights": [],
            "generated_at": _iso_now(),
        }


def _refresh_market_payload() -> None:
    redis_client = SafeRedis()
    try:
        snapshot = _collect_market_snapshot()
        editorial = _load_cached_json(redis_client, MARKET_EDITORIAL_CACHE_KEY)
        if not editorial or editorial.get("status") != "ready":
            generated = _market_editorial_payload(snapshot)
            if generated:
                editorial = generated
                _store_cached_json(redis_client, MARKET_EDITORIAL_CACHE_KEY, MARKET_EDITORIAL_TTL, editorial)

        if editorial:
            snapshot["editorial"] = editorial

        _store_cached_json(redis_client, MARKET_CACHE_KEY, MARKET_CACHE_TTL, snapshot)
    finally:
        redis_client.delete(MARKET_REFRESH_LOCK_KEY)


def _trigger_market_refresh() -> None:
    redis_client = SafeRedis()
    if redis_client.get(MARKET_REFRESH_LOCK_KEY):
        return
    redis_client.setex(MARKET_REFRESH_LOCK_KEY, 90, "1")
    worker = threading.Thread(target=_refresh_market_payload, daemon=True)
    worker.start()


def build_home_market_payload() -> Dict[str, Any]:
    redis_client = SafeRedis()
    cached = _load_cached_json(redis_client, MARKET_CACHE_KEY)
    if cached:
        _trigger_market_refresh()
        return cached

    snapshot = _collect_market_snapshot()
    editorial = _load_cached_json(redis_client, MARKET_EDITORIAL_CACHE_KEY)
    if editorial:
        snapshot["editorial"] = editorial
    _store_cached_json(redis_client, MARKET_CACHE_KEY, MARKET_CACHE_TTL, snapshot)
    _trigger_market_refresh()
    return snapshot
