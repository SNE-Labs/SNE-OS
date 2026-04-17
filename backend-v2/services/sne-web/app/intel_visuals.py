from __future__ import annotations

import re
from typing import Any, Dict, List

IntelVisualEntity = Dict[str, Any]

_ENTITY_REGISTRY = [
    {"id": "bitcoin", "label": "Bitcoin", "kind": "asset", "icon_symbol": "bitcoin", "aliases": ["bitcoin", "btc", "xbt"]},
    {"id": "ethereum", "label": "Ethereum", "kind": "network", "icon_symbol": "ethereum", "aliases": ["ethereum", "eth", "ether", "erc20"]},
    {"id": "solana", "label": "Solana", "kind": "network", "icon_symbol": "solana", "aliases": ["solana", "sol"]},
    {"id": "base", "label": "Base", "kind": "network", "icon_symbol": "base", "aliases": ["base", "base chain", "base network"]},
    {"id": "arbitrum", "label": "Arbitrum", "kind": "network", "icon_symbol": "arbitrum", "aliases": ["arbitrum", "arb"]},
    {"id": "optimism", "label": "Optimism", "kind": "network", "icon_symbol": "optimism", "aliases": ["optimism", "op", "op stack"]},
    {"id": "polygon", "label": "Polygon", "kind": "network", "icon_symbol": "polygon", "aliases": ["polygon", "matic"]},
    {"id": "avalanche", "label": "Avalanche", "kind": "network", "icon_symbol": "avalanche", "aliases": ["avalanche", "avax"]},
    {"id": "cardano", "label": "Cardano", "kind": "network", "icon_symbol": "cardano", "aliases": ["cardano", "ada"]},
    {"id": "chainlink", "label": "Chainlink", "kind": "protocol", "icon_symbol": "chainlink", "aliases": ["chainlink", "link"]},
    {"id": "xrp", "label": "XRP", "kind": "asset", "icon_symbol": "xrp", "aliases": ["xrp", "ripple"]},
    {"id": "sui", "label": "Sui", "kind": "network", "icon_symbol": "sui", "aliases": ["sui"]},
    {"id": "dogecoin", "label": "Dogecoin", "kind": "asset", "icon_symbol": "dogecoin", "aliases": ["dogecoin", "doge"]},
    {"id": "usd-coin", "label": "USDC", "kind": "asset", "icon_symbol": "country-us", "aliases": ["usdc", "usd coin", "circle"]},
    {"id": "tether", "label": "USDT", "kind": "asset", "icon_symbol": "country-us", "aliases": ["usdt", "tether"]},
]

_COUNTRY_REGISTRY = [
    {
        "id": "country-us",
        "country_id": "us",
        "label": "Estados Unidos",
        "kind": "country",
        "icon_symbol": "country-us",
        "aliases": ["estados unidos", "united states", "u.s.", "usa", "eua", "sec", "cftc", "treasury", "fed"],
    },
    {
        "id": "country-br",
        "country_id": "br",
        "label": "Brasil",
        "kind": "country",
        "icon_symbol": "country-br",
        "aliases": ["brasil", "brazil", "banco central do brasil", "copom", "bcb"],
    },
    {
        "id": "country-ar",
        "country_id": "ar",
        "label": "Argentina",
        "kind": "country",
        "icon_symbol": "country-ar",
        "aliases": ["argentina", "argentine", "milei"],
    },
    {
        "id": "country-cn",
        "country_id": "cn",
        "label": "China",
        "kind": "country",
        "icon_symbol": "country-cn",
        "aliases": ["china", "chinese", "beijing", "pboc"],
    },
    {
        "id": "country-eu",
        "country_id": "eu",
        "label": "Uniao Europeia",
        "kind": "country",
        "icon_symbol": "country-eu",
        "aliases": ["uniao europeia", "união europeia", "european union", "euro area", "ecb", "bce", "mica"],
    },
    {
        "id": "country-uk",
        "country_id": "uk",
        "label": "Reino Unido",
        "kind": "country",
        "icon_symbol": "country-uk",
        "aliases": ["reino unido", "united kingdom", "britain", "british", "fca", "boe"],
    },
    {
        "id": "country-jp",
        "country_id": "jp",
        "label": "Japao",
        "kind": "country",
        "icon_symbol": "country-jp",
        "aliases": ["japao", "japão", "japan", "japanese", "boj"],
    },
    {
        "id": "country-sg",
        "country_id": "sg",
        "label": "Singapura",
        "kind": "country",
        "icon_symbol": "country-sg",
        "aliases": ["singapura", "singapore", "mas"],
    },
]

_ENTITY_INDEX: Dict[str, Dict[str, Any]] = {}
for entity in [*_ENTITY_REGISTRY, *_COUNTRY_REGISTRY]:
    for key in [entity["id"], entity["label"], *entity["aliases"]]:
        normalized = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9:/._ -]+", " ", str(key).lower())).strip()
        if normalized:
            _ENTITY_INDEX[normalized] = entity

_SOURCE_PRIORITY = {
    "asset": 400,
    "chain": 340,
    "protocol": 300,
    "country": 220,
}


def _normalize_key(value: Any) -> str:
    text = str(value or "").lower()
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^a-z0-9:/._ -]+", " ", text)
    return text.strip()


def _normalize_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        cleaned = value.strip()
        return [cleaned] if cleaned else []
    return []


def _resolve_entity(value: Any) -> Dict[str, Any] | None:
    normalized = _normalize_key(value)
    if not normalized:
        return None
    return _ENTITY_INDEX.get(normalized)


def _candidate_score(source: str, inferred: bool = False) -> int:
    return int(_SOURCE_PRIORITY.get(source, 0)) - (15 if inferred else 0)


def infer_countries(payload: Dict[str, Any]) -> List[str]:
    explicit = []
    for country in _normalize_list(payload.get("countries")):
        resolved = _resolve_entity(country)
        if resolved and resolved.get("kind") == "country":
            explicit.append(str(resolved["id"]).replace("country-", ""))
        else:
            normalized = _normalize_key(country)
            if normalized:
                explicit.append(normalized)
    if explicit:
        return list(dict.fromkeys(explicit))[:2]

    haystack = " " + _normalize_key(" ".join([
        str(payload.get("title") or ""),
        str(payload.get("title_pt") or ""),
        str(payload.get("subtitle") or ""),
        str(payload.get("excerpt") or ""),
        str(payload.get("summary") or ""),
        str(payload.get("summary_pt") or ""),
        str(payload.get("body_markdown") or ""),
    ])) + " "
    if not haystack.strip():
        return []

    matches: List[str] = []
    for country in _COUNTRY_REGISTRY:
        if any(f" {_normalize_key(alias)} " in haystack for alias in country["aliases"]):
            matches.append(str(country["country_id"]))
    return list(dict.fromkeys(matches))[:2]


def build_visual_entities(payload: Dict[str, Any], limit: int = 4) -> List[IntelVisualEntity]:
    candidates: Dict[str, Dict[str, Any]] = {}

    def add(raw_value: str, source: str, route: Dict[str, str] | None = None, inferred: bool = False) -> None:
        entity = _resolve_entity(raw_value)
        if not entity:
            return
        score = _candidate_score(source, inferred)
        current = candidates.get(entity["id"])
        if current and current["_score"] > score:
            return
        candidates[entity["id"]] = {
            "id": entity["id"],
            "label": entity["label"],
            "kind": entity["kind"],
            "source": source,
            "icon_symbol": entity["icon_symbol"],
            "route": route,
            "inferred": inferred,
            "_score": score,
        }

    for asset in _normalize_list(payload.get("assets")):
        add(asset, "asset", {"kind": "asset", "value": asset})
    for chain in _normalize_list(payload.get("chains")):
        add(chain, "chain", {"kind": "chain", "value": chain})
    for protocol in _normalize_list(payload.get("protocols")):
        add(protocol, "protocol")
    for country in infer_countries(payload):
        add(f"country-{country}", "country", inferred=not bool(_normalize_list(payload.get("countries"))))

    ordered = sorted(candidates.values(), key=lambda item: (-item["_score"], str(item["label"])))
    trimmed = []
    for item in ordered[: max(1, min(limit, 6))]:
        item = dict(item)
        item.pop("_score", None)
        trimmed.append(item)
    return trimmed


def apply_visual_entities(payload: Dict[str, Any], limit: int = 4) -> Dict[str, Any]:
    normalized = dict(payload)
    normalized["countries"] = infer_countries(normalized)
    visual_entities = build_visual_entities(normalized, limit=limit)
    normalized["visual_entities"] = visual_entities
    normalized["primary_visual_entity"] = visual_entities[0] if visual_entities else None
    return normalized
