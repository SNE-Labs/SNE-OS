"""
Institutional editorial pipeline for SNELabs inside the Intel surface.
Builds institutional posts from factual internal signals and exposes a combined feed.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
import os
from typing import Any, Dict, List

import requests

from .intel_enrichment import (
    _extract_json,
    _extract_response_text,
    _openai_responses_payload,
    _slugify,
    _truncate_response_body,
)
from .intel_service import fetch_intel_post as fetch_external_intel_post
from .intel_service import fetch_intel_posts as fetch_external_intel_posts
from .utils.redis_safe import SafeRedis

logger = logging.getLogger(__name__)

VALID_INSTITUTIONAL_TYPES = {
    "product-update",
    "dev-log",
    "release-note",
    "institutional-brief",
}
VALID_STAGES = {"planned", "internal", "experimental", "shipped"}
VALID_VISIBILITY = {"internal", "public"}

FACT_PACK_KEY_PREFIX = "intel:institutional:fact-pack:"
FACT_PACK_INDEX_KEY = "intel:institutional:fact-packs"
POST_KEY_PREFIX = "intel:institutional:post:"
POST_INDEX_KEY = "intel:institutional:posts"
POST_SOURCE_MAP_PREFIX = "intel:institutional:fact-pack:post:"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_string_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        cleaned = value.strip()
        return [cleaned] if cleaned else []
    return []


def _normalize_reference_list(value: Any) -> List[Dict[str, str]]:
    references: List[Dict[str, str]] = []
    if not isinstance(value, list):
        return references
    for item in value:
        if not isinstance(item, dict):
            continue
        kind = str(item.get("kind") or "reference").strip().lower()
        label = str(item.get("label") or "").strip()
        ref = str(item.get("ref") or item.get("url") or "").strip()
        if not label:
            continue
        references.append({
            "kind": kind or "reference",
            "label": label,
            "ref": ref,
        })
    return references


def _read_json(redis_client: SafeRedis, key: str) -> Any:
    cached = redis_client.get(key)
    if not cached:
        return None
    try:
        return json.loads(cached)
    except Exception:
        return None


def _write_json(redis_client: SafeRedis, key: str, payload: Any) -> None:
    redis_client.set(key, json.dumps(payload, ensure_ascii=False))


def _load_index(redis_client: SafeRedis, key: str) -> List[str]:
    payload = _read_json(redis_client, key)
    if not isinstance(payload, list):
        return []
    return [str(item).strip() for item in payload if str(item).strip()]


def _store_index(redis_client: SafeRedis, key: str, values: List[str]) -> None:
    ordered: List[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = str(value).strip()
        if not normalized or normalized in seen:
            continue
        ordered.append(normalized)
        seen.add(normalized)
    _write_json(redis_client, key, ordered)


def _sort_posts(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return sorted(
        posts,
        key=lambda item: str(item.get("generated_at") or item.get("created_at") or ""),
        reverse=True,
    )


def _normalize_fact_pack(raw_payload: Dict[str, Any]) -> Dict[str, Any]:
    source_id = str(raw_payload.get("source_id") or "").strip() or _slugify(
        str(raw_payload.get("headline_hint") or raw_payload.get("type") or f"institutional-{_iso_now()}")
    )
    pack_type = str(raw_payload.get("type") or "").strip().lower()
    products = _normalize_string_list(raw_payload.get("products"))
    summary = _normalize_string_list(raw_payload.get("summary"))
    visibility = str(raw_payload.get("visibility") or "").strip().lower()
    stage = str(raw_payload.get("stage") or "").strip().lower()
    references = _normalize_reference_list(raw_payload.get("references"))
    timestamp = str(raw_payload.get("timestamp") or _iso_now()).strip()
    headline_hint = str(raw_payload.get("headline_hint") or "").strip()
    impact = str(raw_payload.get("impact") or "").strip()
    tags = _normalize_string_list(raw_payload.get("tags"))

    return {
        "source_id": source_id,
        "type": pack_type,
        "products": products,
        "stage": stage,
        "visibility": visibility,
        "headline_hint": headline_hint,
        "summary": summary,
        "impact": impact,
        "references": references,
        "timestamp": timestamp,
        "tags": tags,
        "state": "ready_for_generation",
        "ingested_at": _iso_now(),
    }


def _validate_fact_pack(pack: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    if not pack.get("source_id"):
        errors.append("source_id is required")
    if pack.get("type") not in VALID_INSTITUTIONAL_TYPES:
        errors.append("type is invalid")
    if not pack.get("products"):
        errors.append("products must not be empty")
    if not pack.get("summary"):
        errors.append("summary must not be empty")
    if pack.get("visibility") not in VALID_VISIBILITY:
        errors.append("visibility is invalid")
    if pack.get("stage") not in VALID_STAGES:
        errors.append("stage is invalid")
    try:
        datetime.fromisoformat(str(pack.get("timestamp")).replace("Z", "+00:00"))
    except Exception:
        errors.append("timestamp is invalid")
    if pack.get("stage") == "shipped" and not pack.get("references"):
        errors.append("shipped fact packs require at least one reference")
    return errors


def ingest_institutional_fact_pack(raw_payload: Dict[str, Any]) -> Dict[str, Any]:
    redis_client = SafeRedis()
    pack = _normalize_fact_pack(raw_payload)
    errors = _validate_fact_pack(pack)
    if errors:
        pack["state"] = "rejected"
        return {
            "accepted": False,
            "fact_pack_id": pack["source_id"],
            "state": pack["state"],
            "errors": errors,
        }

    _write_json(redis_client, f"{FACT_PACK_KEY_PREFIX}{pack['source_id']}", pack)
    _store_index(redis_client, FACT_PACK_INDEX_KEY, [pack["source_id"], *_load_index(redis_client, FACT_PACK_INDEX_KEY)])
    return {
        "accepted": True,
        "fact_pack_id": pack["source_id"],
        "state": pack["state"],
    }


def fetch_institutional_fact_pack(source_id: str) -> Dict[str, Any] | None:
    if not source_id.strip():
        return None
    redis_client = SafeRedis()
    payload = _read_json(redis_client, f"{FACT_PACK_KEY_PREFIX}{source_id.strip()}")
    return payload if isinstance(payload, dict) else None


def _editorial_kind_for_type(pack_type: str) -> str:
    if pack_type in {"release-note", "product-update", "dev-log"}:
        return "briefing"
    return "dossier"


def _institutional_topics(pack: Dict[str, Any]) -> List[str]:
    topics = ["institutional"]
    topics.extend(_slugify(product).replace("-", "_") for product in pack.get("products", []))
    topics.append(pack.get("type", "").replace("-", "_"))
    ordered: List[str] = []
    seen: set[str] = set()
    for topic in topics:
        normalized = str(topic).strip().lower()
        if not normalized or normalized in seen:
            continue
        ordered.append(normalized)
        seen.add(normalized)
    return ordered


def _fallback_body(pack: Dict[str, Any]) -> str:
    product_line = ", ".join(pack.get("products", []))
    summary_lines = [f"- {item}" for item in pack.get("summary", [])[:5]]
    impact = pack.get("impact") or "Sem impacto adicional declarado no pacote factual."
    stage = str(pack.get("stage") or "").strip()

    body = [
        f"SNELabs registrou uma atualização institucional sobre {product_line}.",
        "",
        f"O pacote factual desta peça foi classificado como `{pack.get('type')}` e está no estágio `{stage}`.",
        "",
        "Sinais consolidados:",
        *summary_lines,
        "",
        f"Leitura institucional: {impact}",
        "",
        "Esta peça foi gerada a partir de referências internas estruturadas e mantém o escopo factual do pacote recebido.",
    ]
    return "\n".join(line for line in body if line is not None).strip()


def _fallback_post(pack: Dict[str, Any]) -> Dict[str, Any]:
    product_line = ", ".join(pack.get("products", []))
    headline = pack.get("headline_hint") or f"SNELabs atualiza {product_line}"
    excerpt = pack.get("impact") or (pack.get("summary") or [""])[0]
    body_markdown = _fallback_body(pack)
    slug = _slugify(headline or pack["source_id"])
    editorial_kind = _editorial_kind_for_type(pack.get("type", "institutional-brief"))
    tags = _normalize_string_list(pack.get("tags"))
    if not tags:
        tags = [pack.get("type", ""), *pack.get("products", [])]
    tags = [tag for tag in tags if tag]

    return {
        "id": f"institutional:{pack['source_id']}",
        "slug": slug,
        "title": headline,
        "subtitle": excerpt,
        "excerpt": excerpt,
        "body_markdown": body_markdown,
        "tldr": pack.get("summary", [])[:3],
        "topics": _institutional_topics(pack),
        "chains": [],
        "protocols": [],
        "assets": [],
        "sources": [{"name": "SNELabs", "url": "https://snelabs.space/intel"}],
        "status": "draft",
        "generated_at": _iso_now(),
        "reading_time_minutes": max(1, round(len(body_markdown.split()) / 180)),
        "editorial_kind": editorial_kind,
        "category": "institutional",
        "stream": "institutional",
        "institutional_type": pack.get("type"),
        "products": pack.get("products", []),
        "tags": tags,
        "stage": pack.get("stage"),
        "visibility": pack.get("visibility"),
        "source_refs": pack.get("references", []),
        "factual_basis": {
            "confidence": "high" if pack.get("references") else "medium",
            "summary_count": len(pack.get("summary", [])),
        },
        "distribution_ready": pack.get("visibility") == "public",
    }


def _llm_post(pack: Dict[str, Any]) -> Dict[str, Any] | None:
    provider = (os.getenv("INTEL_INSTITUTIONAL_PROVIDER") or os.getenv("INTEL_ENRICHMENT_PROVIDER") or "heuristic").strip().lower()
    api_key = os.getenv("OPENAI_API_KEY")
    if provider == "heuristic" or not api_key:
        return None

    model = (os.getenv("INTEL_INSTITUTIONAL_MODEL") or os.getenv("INTEL_ENRICHMENT_MODEL") or "gpt-5.4-mini").strip()
    base_url = (os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    editorial_kind = _editorial_kind_for_type(pack.get("type", "institutional-brief"))
    prompt = {
        "fact_pack": pack,
        "instruction": (
            "Escreva uma peça institucional SNELabs em pt-BR. "
            "Use apenas os fatos fornecidos. "
            "Responda em JSON com title, subtitle, excerpt, body_markdown, tldr e tags. "
            "body_markdown deve soar institucional, claro e editorial, sem prometer roadmap e sem inventar shipping."
        ),
    }
    payload = _openai_responses_payload(
        model,
        (
            "Voce escreve para o hub institucional da SNELabs. "
            "Nao adicione fatos fora do pacote factual. "
            "Produza JSON valido em pt-BR, sem markdown fora de body_markdown."
        ),
        json.dumps(prompt, ensure_ascii=False),
        3200 if editorial_kind == "briefing" else 5200,
    )

    try:
        response = requests.post(
            f"{base_url}/responses",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=40,
        )
        response.raise_for_status()
        data = response.json()
        content = _extract_response_text(data)
        if not content:
            return None
        parsed = _extract_json(content)
        if not isinstance(parsed, dict):
            return None

        title = str(parsed.get("title") or pack.get("headline_hint") or f"SNELabs atualiza {', '.join(pack.get('products', []))}").strip()
        body_markdown = str(parsed.get("body_markdown") or "").strip()
        if not body_markdown:
            return None

        slug = _slugify(title or pack["source_id"])
        tags = _normalize_string_list(parsed.get("tags")) or _normalize_string_list(pack.get("tags"))
        tags = tags[:6]

        return {
            "id": f"institutional:{pack['source_id']}",
            "slug": slug,
            "title": title,
            "subtitle": str(parsed.get("subtitle") or pack.get("impact") or "").strip(),
            "excerpt": str(parsed.get("excerpt") or pack.get("impact") or "").strip(),
            "body_markdown": body_markdown,
            "tldr": _normalize_string_list(parsed.get("tldr")) or pack.get("summary", [])[:3],
            "topics": _institutional_topics(pack),
            "chains": [],
            "protocols": [],
            "assets": [],
            "sources": [{"name": "SNELabs", "url": "https://snelabs.space/intel"}],
            "status": "draft",
            "generated_at": _iso_now(),
            "reading_time_minutes": max(1, round(len(body_markdown.split()) / 180)),
            "editorial_kind": editorial_kind,
            "category": "institutional",
            "stream": "institutional",
            "institutional_type": pack.get("type"),
            "products": pack.get("products", []),
            "tags": tags,
            "stage": pack.get("stage"),
            "visibility": pack.get("visibility"),
            "source_refs": pack.get("references", []),
            "factual_basis": {
                "confidence": "high" if pack.get("references") else "medium",
                "summary_count": len(pack.get("summary", [])),
            },
            "distribution_ready": pack.get("visibility") == "public",
        }
    except requests.HTTPError as exc:
        response = exc.response
        logger.warning(
            "Institutional post request failed for %s: status=%s body=%s",
            pack.get("source_id"),
            response.status_code if response is not None else "unknown",
            _truncate_response_body(response.text if response is not None else ""),
        )
    except Exception as exc:
        logger.warning("Institutional post generation failed for %s: %s", pack.get("source_id"), exc)
    return None


def generate_institutional_post(source_id: str, force: bool = False) -> Dict[str, Any]:
    redis_client = SafeRedis()
    pack = fetch_institutional_fact_pack(source_id)
    if not pack:
        return {
            "started": False,
            "state": "missing_fact_pack",
            "error": "Institutional fact pack not found",
        }

    errors = _validate_fact_pack(pack)
    if errors:
        return {
            "started": False,
            "state": "rejected",
            "errors": errors,
        }

    existing_slug = redis_client.get(f"{POST_SOURCE_MAP_PREFIX}{pack['source_id']}")
    if existing_slug and not force:
        existing = fetch_institutional_post(existing_slug)
        if existing:
            return {
                "started": True,
                "post_slug": existing["slug"],
                "state": "generated",
                "post": existing,
            }

    post = _llm_post(pack) or _fallback_post(pack)
    _write_json(redis_client, f"{POST_KEY_PREFIX}{post['slug']}", post)
    _store_index(redis_client, POST_INDEX_KEY, [post["slug"], *_load_index(redis_client, POST_INDEX_KEY)])
    redis_client.set(f"{POST_SOURCE_MAP_PREFIX}{pack['source_id']}", post["slug"])
    return {
        "started": True,
        "post_slug": post["slug"],
        "state": "generated",
        "post": post,
    }


def fetch_institutional_post(slug: str) -> Dict[str, Any] | None:
    if not slug.strip():
        return None
    redis_client = SafeRedis()
    payload = _read_json(redis_client, f"{POST_KEY_PREFIX}{slug.strip()}")
    return payload if isinstance(payload, dict) else None


def fetch_institutional_posts(
    *,
    limit: int = 24,
    institutional_type: str | None = None,
    stage: str | None = None,
    visibility: str | None = None,
) -> List[Dict[str, Any]]:
    redis_client = SafeRedis()
    slugs = _load_index(redis_client, POST_INDEX_KEY)
    posts: List[Dict[str, Any]] = []
    for slug in slugs:
        post = fetch_institutional_post(slug)
        if not post:
            continue
        if institutional_type and post.get("institutional_type") != institutional_type:
            continue
        if stage and post.get("stage") != stage:
            continue
        if visibility and post.get("visibility") != visibility:
            continue
        posts.append(post)
    return _sort_posts(posts)[: max(1, min(limit, 240))]


def fetch_combined_intel_posts(
    *,
    limit: int = 24,
    stream: str = "all",
    institutional_type: str | None = None,
    stage: str | None = None,
    visibility: str | None = None,
) -> List[Dict[str, Any]]:
    normalized_stream = (stream or "all").strip().lower()
    if normalized_stream == "institutional":
        return fetch_institutional_posts(
            limit=limit,
            institutional_type=institutional_type,
            stage=stage,
            visibility=visibility,
        )
    if normalized_stream == "external":
        return fetch_external_intel_posts(limit=limit)

    external = fetch_external_intel_posts(limit=max(limit, 120))
    institutional = fetch_institutional_posts(
        limit=max(limit, 120),
        institutional_type=institutional_type,
        stage=stage,
        visibility=visibility,
    )
    return _sort_posts([*external, *institutional])[: max(1, min(limit, 240))]


def fetch_combined_intel_post(slug: str) -> Dict[str, Any] | None:
    institutional = fetch_institutional_post(slug)
    if institutional:
        return institutional
    return fetch_external_intel_post(slug)
