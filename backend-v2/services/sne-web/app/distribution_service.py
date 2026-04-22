"""
Distribution asset generation and controlled publishing for Intel institutional content.
"""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import html
import json
import logging
import os
import re
import unicodedata
from typing import Any, Dict, List

import requests

from .institutional_service import fetch_combined_intel_post, fetch_combined_intel_posts
from .intel_enrichment import (
    _extract_json,
    _extract_response_text,
    _openai_responses_payload,
    _truncate_response_body,
)
from .og_image_service import build_intel_og_image_url, build_intel_share_url
from .telegram_delivery import send_telegram_text
from .utils.redis_safe import SafeRedis
from .x_api_service import x_official_configured, x_post_text, x_post_thread

logger = logging.getLogger(__name__)

VALID_CHANNELS = {"telegram", "whatsapp", "x", "threads"}
ASSET_KEY_PREFIX = "intel:distribution:asset:"
ASSET_INDEX_PREFIX = "intel:distribution:index:"
PUBLISHED_INDEX_KEY = "intel:distribution:published:index"
LAST_PUBLISHED_KEY_PREFIX = "intel:distribution:last:"
RATE_COUNTER_KEY_PREFIX = "intel:distribution:rate:"
URL_PATTERN = re.compile(r"https?://\S+")
X_PREVIEW_TIMEOUT_SECONDS = 8
DISTRIBUTION_FORMAT_VERSION = 3
PUBLISHED_INDEX_LIMIT = 240
DUPLICATE_LOOKBACK_SECONDS = 12 * 60 * 60
TITLE_OVERLAP_THRESHOLD = 0.52
TRAILING_STOPWORDS = {
    "a", "as", "ao", "aos", "com", "da", "das", "de", "do", "dos", "e",
    "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "sem", "um", "uma",
}
TOPIC_STOPWORDS = TRAILING_STOPWORDS.union({
    "apos", "ate", "com", "como", "das", "depois", "dos", "esta", "isso",
    "mais", "mercado", "milhoes", "para", "pela", "pelo", "por", "porque",
    "quando", "sobre", "sua", "suas", "tem", "uma", "vai",
})


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_channels(value: Any) -> List[str]:
    if isinstance(value, list):
        requested = value
    elif isinstance(value, str):
        requested = [part.strip() for part in value.split(",")]
    else:
        requested = ["telegram", "whatsapp", "x"]

    ordered: List[str] = []
    seen: set[str] = set()
    for item in requested:
        channel = str(item).strip().lower()
        if channel not in VALID_CHANNELS or channel in seen:
            continue
        ordered.append(channel)
        seen.add(channel)
    return ordered or ["telegram", "whatsapp", "x"]


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int, minimum: int = 0, maximum: int | None = None) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(str(raw).strip())
    except (TypeError, ValueError):
        return default
    value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def _normalize_string_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        cleaned = value.strip()
        return [cleaned] if cleaned else []
    return []


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


def _parse_iso_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def _seconds_since(value: Any) -> int | None:
    parsed = _parse_iso_datetime(value)
    if not parsed:
        return None
    return max(0, int((datetime.now(timezone.utc) - parsed).total_seconds()))


def _load_index(redis_client: SafeRedis, slug: str) -> List[str]:
    payload = _read_json(redis_client, f"{ASSET_INDEX_PREFIX}{slug}")
    if not isinstance(payload, list):
        return []
    return [str(item).strip() for item in payload if str(item).strip()]


def _store_index(redis_client: SafeRedis, slug: str, channels: List[str]) -> None:
    ordered: List[str] = []
    seen: set[str] = set()
    for channel in channels:
        normalized = str(channel).strip().lower()
        if normalized not in VALID_CHANNELS or normalized in seen:
            continue
        ordered.append(normalized)
        seen.add(normalized)
    _write_json(redis_client, f"{ASSET_INDEX_PREFIX}{slug}", ordered)


def _asset_key(slug: str, channel: str) -> str:
    return f"{ASSET_KEY_PREFIX}{slug}:{channel}"


def _channel_instruction(channel: str) -> str:
    if channel == "telegram":
        return (
            "Crie uma peça para Telegram em pt-BR com voz editorial viva, sem cara de template serializado. "
            "Varie entre brief curto, tese operacional, nota de operador e dossie completo. "
            "Evite marcadores fixos como impacto, acao e dossie completo em toda peca."
        )
    if channel == "whatsapp":
        return (
            "Crie uma peça para WhatsApp em pt-BR com tom direto, até 600 caracteres, "
            "curta o suficiente para boletim e feche com um link."
        )
    if channel == "threads":
        return (
            "Crie uma peça para Threads em pt-BR com tom editorial direto, até 500 caracteres. "
            "Abra com uma tese forte, preserve densidade institucional e feche com link quando útil."
        )
    return (
        "Crie copy para X em pt-BR com estrutura seca e escaneavel. "
        "Responda em JSON com headline, impact_line e action_line. "
        "headline = tese curta; impact_line = consequencia operacional; "
        "action_line = o que muda na pratica. "
        "Nao inclua URL nas linhas e nao soe como press release generico."
    )


def _channel_cta_url(post: Dict[str, Any], channel: str) -> str:
    slug = str(post.get("slug") or "").strip()
    if channel == "x":
        return build_intel_share_url(slug)
    return f"https://snelabs.space/intel/{slug}"


def _normalize_copy_line(text: str) -> str:
    return " ".join(str(text or "").strip().split())


def _truncate_copy_line(text: str, limit: int) -> str:
    cleaned = _normalize_copy_line(text)
    if len(cleaned) <= limit:
        return cleaned
    trimmed = cleaned[: max(1, limit - 1)].rsplit(" ", 1)[0].strip()
    candidate = (trimmed or cleaned[: max(1, limit - 1)]).rstrip(" .,;:-")
    parts = candidate.split()
    while parts and parts[-1].lower() in TRAILING_STOPWORDS:
        parts.pop()
    candidate = " ".join(parts).rstrip(" .,;:-")
    return (candidate or trimmed or cleaned[: max(1, limit - 1)]).rstrip(" .,;:-") + "…"


def _effective_x_length(text: str) -> int:
    return len(URL_PATTERN.sub("x" * 23, text))


def _ascii_fold(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    return normalized.encode("ascii", "ignore").decode("ascii").lower()


def _tokenize_topic_text(value: Any) -> set[str]:
    folded = _ascii_fold(value)
    tokens = set(re.findall(r"[a-z0-9]{3,}", folded))
    return {token for token in tokens if token not in TOPIC_STOPWORDS}


def _source_urls(post: Dict[str, Any]) -> List[str]:
    urls: List[str] = []
    for source in post.get("sources") or []:
        if isinstance(source, dict):
            url = str(source.get("url") or "").strip().lower()
            if url:
                urls.append(url.split("?", 1)[0].rstrip("/"))
    return urls


def _topic_tokens(post: Dict[str, Any]) -> set[str]:
    values: List[Any] = [
        post.get("title"),
        post.get("subtitle"),
        post.get("excerpt"),
        post.get("category"),
        post.get("editorial_kind"),
    ]
    values.extend(post.get("assets") or [])
    values.extend(post.get("chains") or [])
    values.extend(post.get("topics") or [])
    values.extend(post.get("protocols") or [])
    tokens: set[str] = set()
    for value in values:
        tokens.update(_tokenize_topic_text(value))
    return tokens


def _topic_signature(post: Dict[str, Any]) -> str:
    source_urls = _source_urls(post)
    if source_urls:
        return hashlib.sha1("|".join(sorted(source_urls)).encode("utf-8")).hexdigest()
    tokens = sorted(_topic_tokens(post))
    return hashlib.sha1("|".join(tokens[:18]).encode("utf-8")).hexdigest()


def _publication_fingerprint(post: Dict[str, Any], channel: str) -> str:
    raw = {
        "channel": channel,
        "topic": _topic_signature(post),
        "assets": sorted(str(item).upper() for item in post.get("assets") or []),
        "chains": sorted(str(item).lower() for item in post.get("chains") or []),
    }
    return hashlib.sha1(json.dumps(raw, sort_keys=True).encode("utf-8")).hexdigest()


def _load_published_index(redis_client: SafeRedis) -> List[Dict[str, Any]]:
    payload = _read_json(redis_client, PUBLISHED_INDEX_KEY)
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def _store_published_index(redis_client: SafeRedis, items: List[Dict[str, Any]]) -> None:
    _write_json(redis_client, PUBLISHED_INDEX_KEY, items[:PUBLISHED_INDEX_LIMIT])


def _title_overlap(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    return len(left.intersection(right)) / max(1, min(len(left), len(right)))


def _recent_duplicate_reason(
    redis_client: SafeRedis,
    post: Dict[str, Any],
    channel: str,
    fingerprint: str,
) -> str | None:
    if not _env_flag("INTEL_DISTRIBUTION_DEDUPE_ENABLED", default=True):
        return None

    lookback_seconds = _env_int(
        "INTEL_DISTRIBUTION_DEDUPE_SECONDS",
        DUPLICATE_LOOKBACK_SECONDS,
        minimum=300,
    )
    topic_tokens = _topic_tokens(post)
    topic_signature = _topic_signature(post)
    source_urls = set(_source_urls(post))

    for item in _load_published_index(redis_client):
        if item.get("channel") != channel:
            continue
        age = _seconds_since(item.get("published_at"))
        if age is None or age > lookback_seconds:
            continue
        if item.get("fingerprint") == fingerprint:
            return "duplicate_fingerprint"
        if source_urls and source_urls.intersection(set(item.get("source_urls") or [])):
            return "duplicate_source"
        if item.get("topic_signature") == topic_signature:
            return "duplicate_topic"
        previous_tokens = set(item.get("topic_tokens") or [])
        if _title_overlap(topic_tokens, previous_tokens) >= TITLE_OVERLAP_THRESHOLD:
            return "duplicate_similar_topic"
    return None


def _channel_min_interval_seconds(channel: str) -> int:
    defaults = {"telegram": 12 * 60, "x": 30 * 60, "whatsapp": 30 * 60}
    env_name = f"INTEL_{channel.upper()}_AUTO_MIN_INTERVAL_SECONDS"
    return _env_int(env_name, defaults.get(channel, 30 * 60), minimum=0)


def _channel_hourly_limit(channel: str) -> int:
    defaults = {"telegram": 4, "x": 2, "whatsapp": 2}
    env_name = f"INTEL_{channel.upper()}_AUTO_HOURLY_LIMIT"
    return _env_int(env_name, defaults.get(channel, 2), minimum=0)


def _hour_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d%H")


def _auto_channel_gate(
    redis_client: SafeRedis,
    post: Dict[str, Any],
    channel: str,
    fingerprint: str,
) -> tuple[bool, str | None]:
    duplicate_reason = _recent_duplicate_reason(redis_client, post, channel, fingerprint)
    if duplicate_reason:
        return False, duplicate_reason

    min_interval = _channel_min_interval_seconds(channel)
    if min_interval > 0:
        last_published = redis_client.get(f"{LAST_PUBLISHED_KEY_PREFIX}{channel}")
        elapsed = _seconds_since(last_published)
        if elapsed is not None and elapsed < min_interval:
            return False, "channel_cadence"

    hourly_limit = _channel_hourly_limit(channel)
    if hourly_limit > 0:
        counter_key = f"{RATE_COUNTER_KEY_PREFIX}{channel}:{_hour_key()}"
        try:
            current = int(redis_client.get(counter_key) or 0)
        except Exception:
            current = 0
        if current >= hourly_limit:
            return False, "channel_hourly_limit"

    return True, None


def _record_published(redis_client: SafeRedis, post: Dict[str, Any], asset: Dict[str, Any]) -> None:
    channel = str(asset.get("channel") or "").strip().lower()
    if channel not in VALID_CHANNELS:
        return
    published_at = str(asset.get("published_at") or _iso_now())
    fingerprint = str(asset.get("dedupe_key") or _publication_fingerprint(post, channel))

    redis_client.set(f"{LAST_PUBLISHED_KEY_PREFIX}{channel}", published_at)
    counter_key = f"{RATE_COUNTER_KEY_PREFIX}{channel}:{_hour_key()}"
    count = redis_client.incr(counter_key)
    if count == 1:
        redis_client.expire(counter_key, 2 * 60 * 60)

    index = _load_published_index(redis_client)
    index.insert(0, {
        "channel": channel,
        "slug": post.get("slug"),
        "title": post.get("title"),
        "fingerprint": fingerprint,
        "topic_signature": _topic_signature(post),
        "topic_tokens": sorted(_topic_tokens(post)),
        "source_urls": _source_urls(post),
        "published_at": published_at,
    })
    _store_published_index(redis_client, index)


def _configured_for_channel(channel: str) -> bool:
    if channel == "telegram":
        return bool(os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHAT_ID"))
    if channel == "whatsapp":
        return bool(
            os.getenv("WHATSAPP_ACCESS_TOKEN")
            and os.getenv("WHATSAPP_PHONE_NUMBER_ID")
            and os.getenv("WHATSAPP_TO")
        )
    if channel == "threads":
        return bool(os.getenv("THREADS_ACCESS_TOKEN") and os.getenv("THREADS_USER_ID"))
    if channel == "x":
        return x_official_configured() or bool((os.getenv("X_PUBLISH_WEBHOOK_URL") or "").strip())
    return False


def _configured_auto_channels() -> List[str]:
    channels: List[str] = []
    if _configured_for_channel("telegram") and _env_flag("INTEL_TELEGRAM_AUTO_PUBLISH", default=True):
        channels.append("telegram")
    if _env_flag("INTEL_X_AUTO_PUBLISH", default=False) and _configured_for_channel("x"):
        channels.append("x")
    if _env_flag("INTEL_THREADS_AUTO_PUBLISH", default=False) and _configured_for_channel("threads"):
        channels.append("threads")
    return channels


def _default_auto_channels() -> List[str]:
    return _configured_auto_channels() or ["telegram"]


def _x_mode(post: Dict[str, Any]) -> str:
    slug = str(post.get("slug") or post.get("id") or post.get("title") or "").strip().lower()
    digest = hashlib.sha1(f"x:{slug}".encode("utf-8")).hexdigest()
    bucket = int(digest[:2], 16) % 6
    if bucket <= 2:
        return "thesis"
    if bucket <= 4:
        return "operator"
    return "dossier"


def _x_family_label(post: Dict[str, Any]) -> str:
    stream = str(post.get("stream") or "").strip().lower()
    institutional_type = str(post.get("institutional_type") or post.get("type") or "").strip().lower()
    if stream == "institutional":
        if institutional_type in {"product-update", "release-note", "dev-log"}:
            return "Produto / SNE OS"
        return "Intel / Institucional"
    return "Intel / Mercado"


def _x_default_action_line(post: Dict[str, Any]) -> str:
    tldr = _normalize_string_list(post.get("tldr"))
    if tldr:
        return tldr[0]
    category = str(post.get("category") or "").strip().lower()
    if category == "institutional":
        return "Ajuste produto, rollout e comunicacao a partir deste movimento."
    return "Revise execucao, liquidez e risco operacional a partir daqui."


def _x_auto_publish_gate(post: Dict[str, Any]) -> tuple[bool, str | None]:
    if not _env_flag("INTEL_X_AUTO_PUBLISH", default=False):
        return False, "x_auto_publish_disabled"
    if not _configured_for_channel("x"):
        return False, "x_not_configured"
    if _env_flag("INTEL_X_AUTO_PUBLISH_ALL", default=False):
        return True, None

    stream = str(post.get("stream") or "").strip().lower()
    category = str(post.get("category") or "").strip().lower()
    editorial_kind = str(post.get("editorial_kind") or "").strip().lower()
    institutional_type = str(post.get("institutional_type") or post.get("type") or "").strip().lower()
    title = _normalize_copy_line(post.get("title"))
    subtitle = _normalize_copy_line(post.get("subtitle") or post.get("excerpt"))
    if len(title) < 24 or len(subtitle) < 36:
        return False, "x_copy_too_thin"

    if stream == "institutional" or category == "institutional":
        if institutional_type in {"product-update", "release-note", "dev-log", "platform-note"}:
            return True, None
        return False, "x_institutional_not_priority"

    if category == "market":
        return True, None
    if editorial_kind in {"dossier", "analysis", "research-note"}:
        return True, None
    return False, "x_not_priority"


def _telegram_family_label(post: Dict[str, Any]) -> str:
    stream = str(post.get("stream") or "").strip().lower()
    institutional_type = str(post.get("institutional_type") or post.get("type") or "").strip().lower()
    if stream == "institutional":
        if institutional_type in {"product-update", "release-note", "dev-log"}:
            return "SNE OS | Produto"
        return "INTEL | Institucional"
    return "INTEL | Mercado"


def _telegram_mode(post: Dict[str, Any]) -> str:
    slug = str(post.get("slug") or post.get("id") or post.get("title") or "").strip().lower()
    digest = hashlib.sha1(slug.encode("utf-8")).hexdigest()
    bucket = int(digest[:2], 16) % 9
    if bucket <= 4:
        return "brief"
    if bucket <= 6:
        return "thesis"
    if bucket == 7:
        return "operator"
    return "dossier"


def _first_meaningful_line(*values: Any, limit: int = 150) -> str:
    for value in values:
        cleaned = _normalize_copy_line(value)
        if cleaned:
            return _truncate_copy_line(cleaned, limit)
    return ""


def _telegram_action_line(post: Dict[str, Any]) -> str:
    tldr = _normalize_string_list(post.get("tldr"))
    if tldr:
        return _truncate_copy_line(tldr[0], 88)
    category = str(post.get("category") or "").strip().lower()
    if category == "institutional":
        return "traduzir a mudanca em rollout, uso e comunicacao."
    return "revisar rotas, risco operacional e janelas de execucao."


def _telegram_secondary_line(post: Dict[str, Any]) -> str:
    tldr = _normalize_string_list(post.get("tldr"))
    if len(tldr) >= 2:
        return _truncate_copy_line(tldr[1], 132)
    excerpt = _normalize_copy_line(post.get("excerpt"))
    subtitle = _normalize_copy_line(post.get("subtitle"))
    title = _normalize_copy_line(post.get("title"))
    for candidate in (excerpt, subtitle, title):
        if candidate:
            return _truncate_copy_line(candidate, 132)
    return ""


def _telegram_cta_label(post: Dict[str, Any]) -> str:
    options = ["Leia o dossie:", "Leitura completa:", "Peca completa:"]
    slug = str(post.get("slug") or post.get("id") or "").strip().lower()
    if not slug:
        return options[0]
    digest = hashlib.sha1(f"cta:{slug}".encode("utf-8")).hexdigest()
    return options[int(digest[:2], 16) % len(options)]


def _telegram_body_lines(post: Dict[str, Any], mode: str, cta_url: str) -> List[str]:
    insight = _first_meaningful_line(
        post.get("subtitle"),
        post.get("excerpt"),
        limit=190,
    )
    operational = _first_meaningful_line(
        post.get("excerpt"),
        post.get("subtitle"),
        _telegram_action_line(post),
        limit=170,
    )
    secondary = _telegram_secondary_line(post)
    cta_label = _telegram_cta_label(post)

    if mode == "brief":
        lines: List[str] = []
        if insight:
            lines.append(insight)
        if operational and operational.lower() != insight.lower():
            lines.extend(["", operational])
        lines.extend(["", cta_label, cta_url])
        return lines

    if mode == "thesis":
        thesis = _truncate_copy_line(insight or operational, 200)
        consequence = _truncate_copy_line(secondary or operational, 170)
        lines = [thesis] if thesis else []
        if consequence and consequence.lower() != thesis.lower():
            lines.extend(["", consequence])
        lines.append("")
        lines.append(cta_url)
        return lines

    if mode == "operator":
        primary = _truncate_copy_line(insight or operational, 180)
        note = _truncate_copy_line(secondary or _telegram_action_line(post), 170)
        lines = [primary] if primary else []
        if note and note.lower() != primary.lower():
            lines.extend(["", note])
        return lines

    lead = _truncate_copy_line(insight or operational, 190)
    support = _truncate_copy_line(secondary or operational, 170)
    lines = [lead] if lead else []
    if support and support.lower() != lead.lower():
        lines.extend(["", support])
    lines.extend(["", cta_label, cta_url])
    return lines


def _compose_telegram_body(post: Dict[str, Any], cta_url: str) -> str:
    mode = _telegram_mode(post)
    return "\n".join(line for line in _telegram_body_lines(post, mode, cta_url) if line is not None).strip()


def _compose_x_body(
    post: Dict[str, Any],
    cta_url: str,
    headline: str,
    impact_line: str,
    action_line: str,
) -> str:
    mode = _x_mode(post)
    budgets = {
        "headline": 92 if mode == "dossier" else 86,
        "impact": 96 if mode != "operator" else 112,
        "action": 76,
    }
    minimums = {
        "headline": 42,
        "impact": 36,
        "action": 28,
    }

    def _sentence(value: str) -> str:
        cleaned = value.strip().rstrip(".…")
        if not cleaned:
            return ""
        return f"{cleaned}."

    def _render() -> tuple[str, Dict[str, str]]:
        parts = {
            "headline": _truncate_copy_line(headline, budgets["headline"]),
            "impact": _truncate_copy_line(impact_line, budgets["impact"]),
            "action": _truncate_copy_line(action_line, budgets["action"]),
        }
        lines: List[str] = []
        if mode == "operator":
            lines = [_sentence(parts["headline"]), "", _sentence(parts["impact"]), "", cta_url]
        elif mode == "dossier":
            lines = [_sentence(parts["headline"]), "", _sentence(parts["impact"]), "", "Leia o dossie:", cta_url]
        else:
            lines = [
                _sentence(parts["headline"]),
                "",
                _sentence(parts["impact"]),
                "",
                _sentence(parts["action"]),
                "",
                cta_url,
            ]
        body = "\n".join(line for line in lines if line is not None).strip()
        return body, parts

    body, parts = _render()
    while _effective_x_length(body) > 270:
        adjustable = [
            key for key in ("impact", "action", "headline")
            if budgets[key] > minimums[key]
        ]
        if not adjustable:
            body = "\n\n".join([_sentence(parts["headline"]), _sentence(parts["impact"]), cta_url]).strip()
            if _effective_x_length(body) <= 270:
                return body
            body = "\n\n".join([_sentence(parts["headline"]), cta_url]).strip()
            if _effective_x_length(body) <= 270:
                return body
            body = "\n\n".join([_sentence(_truncate_copy_line(headline, 80)), cta_url]).strip()
            return body
        longest = max(adjustable, key=lambda key: budgets[key])
        budgets[longest] -= 10
        body, parts = _render()
    return body


def _x_native_formats_enabled() -> bool:
    return _env_flag("INTEL_X_NATIVE_FORMATS_ENABLED", default=True)


def _x_format(post: Dict[str, Any]) -> str:
    if not _x_native_formats_enabled():
        return "summary_link"

    slug = str(post.get("slug") or post.get("id") or post.get("title") or "").strip().lower()
    digest = hashlib.sha1(f"x-format:{slug}".encode("utf-8")).hexdigest()
    bucket = int(digest[:2], 16) % 10
    category = str(post.get("category") or "").strip().lower()
    editorial_kind = str(post.get("editorial_kind") or "").strip().lower()

    if bucket <= 2:
        return "summary_link"
    if category == "market":
        return ["market_snapshot", "operator_checklist", "question", "hook_take"][bucket % 4]
    if editorial_kind in {"dossier", "analysis", "research-note"}:
        return ["thread", "hook_take", "contrarian", "operator_checklist"][bucket % 4]
    return ["hook_take", "question", "operator_checklist", "thread"][bucket % 4]


def _x_signal_line(post: Dict[str, Any], fallback: str = "") -> str:
    return _first_meaningful_line(
        post.get("subtitle"),
        post.get("excerpt"),
        fallback,
        limit=150,
    )


def _x_consequence_line(post: Dict[str, Any], fallback: str = "") -> str:
    tldr = _normalize_string_list(post.get("tldr"))
    return _first_meaningful_line(
        tldr[0] if tldr else "",
        post.get("excerpt"),
        post.get("subtitle"),
        fallback,
        limit=145,
    )


def _x_question_line(post: Dict[str, Any]) -> str:
    assets = [str(item).upper() for item in post.get("assets") or [] if str(item).strip()]
    category = str(post.get("category") or "").strip().lower()
    if assets:
        return f"O que muda para {assets[0]} nas próximas horas?"
    if category == "institutional":
        return "Esse movimento muda produto ou só narrativa?"
    return "Isso muda liquidez ou só manchete?"


def _x_checklist_items(post: Dict[str, Any]) -> List[str]:
    tldr = _normalize_string_list(post.get("tldr"))
    items = [_truncate_copy_line(item, 78) for item in tldr[:3] if item]
    defaults = [
        "Liquidez executável",
        "Risco de reversão",
        "Impacto em rotas e custo",
    ]
    for item in defaults:
        if len(items) >= 3:
            break
        items.append(item)
    return items[:3]


def _x_fit(text: str, limit: int = 270) -> str:
    if _effective_x_length(text) <= limit:
        return text.strip()
    lines = [line for line in text.splitlines()]
    while lines and _effective_x_length("\n".join(lines).strip()) > limit:
        longest_index = max(range(len(lines)), key=lambda index: len(lines[index]))
        current = lines[longest_index]
        if len(current) <= 36:
            lines.pop(longest_index)
            continue
        lines[longest_index] = _truncate_copy_line(current, max(36, len(current) - 18))
    return "\n".join(lines).strip()


def _x_reply_cta(cta_url: str) -> str:
    return f"Leitura completa:\n{cta_url}"


def _threads_format(post: Dict[str, Any]) -> str:
    slug = str(post.get("slug") or post.get("id") or post.get("title") or "").strip().lower()
    digest = hashlib.sha1(f"threads:{slug}".encode("utf-8")).hexdigest()
    bucket = int(digest[:2], 16) % 5
    if bucket <= 1:
        return "operator_note"
    if bucket <= 3:
        return "market_thesis"
    return "link_brief"


def _threads_subject(post: Dict[str, Any], headline: str) -> str:
    assets = [str(item).upper() for item in post.get("assets") or [] if str(item).strip()]
    if assets:
        return " / ".join(assets[:2])
    chains = [str(item).strip().capitalize() for item in post.get("chains") or [] if str(item).strip()]
    if chains:
        return " / ".join(chains[:2])
    title = _truncate_copy_line(headline or post.get("title") or "SNE Radar", 72)
    return title


def _threads_signal_line(post: Dict[str, Any], fallback: str) -> str:
    subtitle = _normalize_copy_line(post.get("subtitle"))
    excerpt = _normalize_copy_line(post.get("excerpt"))
    tldr = _normalize_string_list(post.get("tldr"))
    return _truncate_copy_line(subtitle or excerpt or (tldr[0] if tldr else fallback), 150)


def _threads_action_line(post: Dict[str, Any]) -> str:
    category = str(post.get("category") or "").strip().lower()
    topics = {str(item).strip().lower() for item in post.get("topics") or []}
    if category == "market":
        return "Preço importa menos que gatilho, liquidez e execução."
    if "seguranca" in topics or "security" in topics:
        return "Risco operacional primeiro; narrativa depois."
    if "defi" in topics:
        return "O ponto prático é liquidez, contraparte e rota."
    if str(post.get("stream") or "").strip().lower() == "institutional":
        return "Produto bom reduz fricção operacional, não só narrativa."
    return "A leitura útil é o que muda para risco, fluxo e decisão."


def _threads_fit(text: str, limit: int = 500) -> str:
    cleaned = "\n".join(_normalize_copy_line(line) for line in str(text or "").splitlines()).strip()
    if len(cleaned) <= limit:
        return cleaned
    return _truncate_copy_line(cleaned, limit)


def _compose_threads_body(post: Dict[str, Any], cta_url: str, headline: str, generated_body: str | None = None) -> str:
    selected_format = _threads_format(post)
    subject = _threads_subject(post, headline)
    signal = _threads_signal_line(post, generated_body or headline)
    action = _threads_action_line(post)

    if selected_format == "operator_note":
        return _threads_fit("\n".join([
            f"{subject}",
            "",
            signal,
            "",
            f"HALO: {action}",
        ]))

    if selected_format == "market_thesis":
        return _threads_fit("\n".join([
            f"{subject}: leitura de mesa.",
            "",
            signal,
            "",
            action,
        ]))

    return _threads_fit("\n".join([
        subject,
        "",
        signal,
        "",
        action,
        "",
        cta_url,
    ]))


def _compose_x_native_asset(
    post: Dict[str, Any],
    cta_url: str,
    headline: str,
    impact_line: str,
    action_line: str,
    summary_body: str,
) -> Dict[str, Any]:
    selected_format = _x_format(post)
    title = _truncate_copy_line(headline, 110)
    signal = _x_signal_line(post, impact_line or title)
    consequence = _x_consequence_line(post, action_line or signal)
    reply_cta = _x_reply_cta(cta_url)

    if selected_format == "summary_link":
        return {
            "x_format": "summary_link",
            "body": summary_body,
            "thread": [],
            "reply_cta": None,
        }

    if selected_format == "hook_take":
        body = _x_fit("\n".join([
            title,
            "",
            signal,
            "",
            _truncate_copy_line(consequence or action_line, 120),
        ]))
        return {"x_format": selected_format, "body": body, "thread": [body, reply_cta], "reply_cta": reply_cta}

    if selected_format == "market_snapshot":
        body = _x_fit("\n".join([
            f"Leitura de mercado: {title}",
            "",
            signal,
            "",
            consequence,
        ]))
        return {"x_format": selected_format, "body": body, "thread": [body, reply_cta], "reply_cta": reply_cta}

    if selected_format == "operator_checklist":
        items = _x_checklist_items(post)
        body = _x_fit("\n".join([
            f"{title}",
            "",
            "Checklist do operador:",
            f"1. {items[0]}",
            f"2. {items[1]}",
            f"3. {items[2]}",
        ]))
        return {"x_format": selected_format, "body": body, "thread": [body, reply_cta], "reply_cta": reply_cta}

    if selected_format == "question":
        body = _x_fit("\n".join([
            _x_question_line(post),
            "",
            signal or title,
            "",
            consequence,
        ]))
        return {"x_format": selected_format, "body": body, "thread": [body, reply_cta], "reply_cta": reply_cta}

    if selected_format == "contrarian":
        body = _x_fit("\n".join([
            f"O ponto não é só: {title}",
            "",
            f"O ponto é: {signal or consequence}",
            "",
            _truncate_copy_line(consequence or action_line, 120),
        ]))
        return {"x_format": selected_format, "body": body, "thread": [body, reply_cta], "reply_cta": reply_cta}

    opening = _x_fit("\n".join([
        title,
        "",
        signal,
    ]))
    detail = _x_fit("\n".join([
        "O que observar:",
        consequence,
        "",
        _truncate_copy_line(action_line or _x_default_action_line(post), 120),
    ]))
    return {
        "x_format": "thread",
        "body": opening,
        "thread": [opening, detail, reply_cta],
        "reply_cta": reply_cta,
    }


def _fallback_body(post: Dict[str, Any], channel: str, cta_url: str) -> str:
    title = str(post.get("title") or "SNELabs").strip()
    subtitle = str(post.get("subtitle") or post.get("excerpt") or "").strip()
    tldr = _normalize_string_list(post.get("tldr"))[:2]
    if channel == "telegram":
        return _compose_telegram_body(post, cta_url)
    if channel == "whatsapp":
        parts = [title]
        if subtitle:
            parts.append(subtitle)
        if tldr:
            parts.append(tldr[0])
        parts.append(cta_url)
        return "\n".join(parts).strip()
    if channel == "threads":
        return _compose_threads_body(post, cta_url, title)
    headline = title
    impact_line = subtitle or str(post.get("excerpt") or "").strip() or headline
    action_line = tldr[0] if tldr else _x_default_action_line(post)
    return _compose_x_body(post, cta_url, headline, impact_line, action_line)


def _llm_asset(post: Dict[str, Any], channel: str, cta_url: str) -> Dict[str, str] | None:
    provider = (os.getenv("INTEL_DISTRIBUTION_PROVIDER") or os.getenv("INTEL_INSTITUTIONAL_PROVIDER") or os.getenv("INTEL_ENRICHMENT_PROVIDER") or "heuristic").strip().lower()
    api_key = os.getenv("OPENAI_API_KEY")
    if provider == "heuristic" or not api_key:
        return None

    model = (os.getenv("INTEL_DISTRIBUTION_MODEL") or os.getenv("INTEL_INSTITUTIONAL_MODEL") or os.getenv("INTEL_ENRICHMENT_MODEL") or "gpt-5.4-mini").strip()
    base_url = (os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    prompt = {
        "post": {
            "title": post.get("title"),
            "subtitle": post.get("subtitle"),
            "excerpt": post.get("excerpt"),
            "tldr": post.get("tldr"),
            "institutional_type": post.get("institutional_type"),
            "products": post.get("products"),
            "stage": post.get("stage"),
            "stream": post.get("stream"),
            "category": post.get("category"),
            "editorial_family": _x_family_label(post) if channel == "x" else None,
        },
        "instruction": _channel_instruction(channel),
        "cta_url": cta_url,
    }
    payload = _openai_responses_payload(
        model,
        (
            "Voce adapta conteudo institucional da SNELabs para distribuicao multicanal. "
            "Nao invente fatos novos. Para X, responda em JSON com headline, impact_line e action_line. "
            "Para outros canais, responda em JSON com headline e body."
        ),
        json.dumps(prompt, ensure_ascii=False),
        1200,
    )

    try:
        response = requests.post(
            f"{base_url}/responses",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        content = _extract_response_text(data)
        if not content:
            return None
        parsed = _extract_json(content)
        if not isinstance(parsed, dict):
            return None
        headline = str(parsed.get("headline") or post.get("title") or "SNELabs").strip()
        if channel == "x":
            impact_line = str(parsed.get("impact_line") or post.get("subtitle") or post.get("excerpt") or headline).strip()
            action_line = str(parsed.get("action_line") or _x_default_action_line(post)).strip()
            body = _compose_x_body(post, cta_url, headline, impact_line, action_line)
        elif channel == "telegram":
            impact_line = str(parsed.get("impact_line") or post.get("excerpt") or post.get("subtitle") or "").strip()
            action_line = str(parsed.get("action_line") or _telegram_action_line(post)).strip()
            body = _compose_telegram_body(
                {
                    **post,
                    "subtitle": parsed.get("subtitle") or post.get("subtitle"),
                    "excerpt": impact_line or post.get("excerpt"),
                    "tldr": [action_line, *(_normalize_string_list(post.get("tldr"))[:1])],
                },
                cta_url,
            )
        elif channel == "threads":
            body = _compose_threads_body(post, cta_url, headline, str(parsed.get("body") or ""))
        else:
            body = str(parsed.get("body") or "").strip()
        if not body:
            return None
        return {"headline": headline, "body": body}
    except requests.HTTPError as exc:
        response = exc.response
        logger.warning(
            "Distribution asset generation failed for %s/%s: status=%s body=%s",
            post.get("slug"),
            channel,
            response.status_code if response is not None else "unknown",
            _truncate_response_body(response.text if response is not None else ""),
        )
    except Exception as exc:
        logger.warning("Distribution asset generation failed for %s/%s: %s", post.get("slug"), channel, exc)
    return None


def _build_asset(post: Dict[str, Any], channel: str) -> Dict[str, Any]:
    cta_url = _channel_cta_url(post, channel)
    generated = _llm_asset(post, channel, cta_url)
    headline = generated["headline"] if generated else str(post.get("title") or "SNELabs").strip()
    body = generated["body"] if generated else _fallback_body(post, channel, cta_url)
    x_format = None
    thread: List[str] = []
    reply_cta = None
    if channel == "x":
        tldr = _normalize_string_list(post.get("tldr"))
        impact_line = str(post.get("subtitle") or post.get("excerpt") or headline).strip()
        action_line = tldr[0] if tldr else _x_default_action_line(post)
        x_asset = _compose_x_native_asset(post, cta_url, headline, impact_line, action_line, body)
        x_format = x_asset["x_format"]
        body = x_asset["body"]
        thread = x_asset["thread"]
        reply_cta = x_asset["reply_cta"]
    elif channel == "threads":
        body = _compose_threads_body(post, cta_url, headline, body)
    dedupe_key = _publication_fingerprint(post, channel)
    asset = {
        "post_id": post.get("id"),
        "slug": post["slug"],
        "channel": channel,
        "headline": headline,
        "body": body,
        "cta_url": cta_url,
        "status": "ready",
        "dedupe_key": dedupe_key,
        "published_at": None,
        "generated_at": _iso_now(),
        "format_version": DISTRIBUTION_FORMAT_VERSION,
    }
    if channel == "x":
        asset["x_format"] = x_format
        asset["thread"] = thread
        asset["reply_cta"] = reply_cta
    return asset


def fetch_distribution_assets(slug: str) -> List[Dict[str, Any]]:
    redis_client = SafeRedis()
    channels = _load_index(redis_client, slug)
    assets: List[Dict[str, Any]] = []
    for channel in channels:
        payload = _read_json(redis_client, _asset_key(slug, channel))
        if isinstance(payload, dict):
            assets.append(payload)
    return assets


def generate_distribution_assets(slug: str, channels: Any = None, force: bool = False) -> Dict[str, Any]:
    post = fetch_combined_intel_post(slug)
    if not post:
        return {"slug": slug, "assets": [], "error": "Intel post not found"}

    redis_client = SafeRedis()
    selected_channels = _normalize_channels(channels)
    stored_channels = _load_index(redis_client, slug)
    assets: List[Dict[str, Any]] = []

    for channel in selected_channels:
        existing = _read_json(redis_client, _asset_key(slug, channel))
        if isinstance(existing, dict) and not force:
            already_published = existing.get("status") == "published" and existing.get("published_at")
            current_format = existing.get("format_version") == DISTRIBUTION_FORMAT_VERSION
            if already_published or current_format:
                assets.append(existing)
                continue
        asset = _build_asset(post, channel)
        _write_json(redis_client, _asset_key(slug, channel), asset)
        assets.append(asset)
        if channel not in stored_channels:
            stored_channels.append(channel)

    _store_index(redis_client, slug, stored_channels)
    return {"slug": slug, "assets": assets}


def _publish_to_telegram(asset: Dict[str, Any]) -> tuple[str, str | None]:
    message = f"<b>{html.escape(str(asset['headline']), quote=False)}</b>\n\n{html.escape(str(asset['body']), quote=False)}"
    sent, error = send_telegram_text(
        message,
        disable_web_page_preview=False,
        sanitize=False,
    )
    return ("published", None) if sent else ("publish_failed", error)


def _publish_to_whatsapp(asset: Dict[str, Any]) -> tuple[str, str | None]:
    access_token = (os.getenv("WHATSAPP_ACCESS_TOKEN") or "").strip()
    phone_number_id = (os.getenv("WHATSAPP_PHONE_NUMBER_ID") or "").strip()
    recipient = (os.getenv("WHATSAPP_TO") or "").strip()
    if not access_token or not phone_number_id or not recipient:
        return "publish_failed", "whatsapp_not_configured"

    response = requests.post(
        f"https://graph.facebook.com/v22.0/{phone_number_id}/messages",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json={
            "messaging_product": "whatsapp",
            "to": recipient,
            "type": "text",
            "text": {"body": f"{asset['headline']}\n\n{asset['body']}"},
        },
        timeout=20,
    )
    response.raise_for_status()
    return "published", None


def _threads_api_base() -> str:
    version = (os.getenv("THREADS_API_VERSION") or "v1.0").strip().strip("/")
    return f"https://graph.threads.net/{version}"


def _publish_to_threads(asset: Dict[str, Any]) -> tuple[str, str | None]:
    access_token = (os.getenv("THREADS_ACCESS_TOKEN") or "").strip()
    user_id = (os.getenv("THREADS_USER_ID") or "").strip()
    if not access_token or not user_id:
        return "publish_failed", "threads_not_configured"

    text = _truncate_copy_line(str(asset.get("body") or ""), 500)
    if not text:
        return "publish_failed", "threads_body_empty"

    create_response = requests.post(
        f"{_threads_api_base()}/{user_id}/threads",
        data={
            "media_type": "TEXT",
            "text": text,
            "access_token": access_token,
        },
        timeout=20,
    )
    create_response.raise_for_status()
    creation = create_response.json()
    creation_id = str(creation.get("id") or "").strip()
    if not creation_id:
        return "publish_failed", f"threads_missing_creation_id:{_truncate_response_body(create_response.text)}"

    publish_response = requests.post(
        f"{_threads_api_base()}/{user_id}/threads_publish",
        data={
            "creation_id": creation_id,
            "access_token": access_token,
        },
        timeout=20,
    )
    publish_response.raise_for_status()
    published = publish_response.json()
    post_id = str(published.get("id") or "").strip()
    if post_id:
        asset["external_id"] = post_id
    return "published", None


def _validate_x_preview(asset: Dict[str, Any]) -> tuple[bool, str | None]:
    if not _env_flag("INTEL_X_VALIDATE_PREVIEW", default=True):
        return True, None

    slug = str(asset.get("slug") or "").strip()
    cta_url = str(asset.get("cta_url") or "").strip()
    if not slug or not cta_url:
        return False, "x_preview_missing_slug_or_url"

    image_url = build_intel_og_image_url(slug)
    try:
        share_response = requests.get(cta_url, timeout=X_PREVIEW_TIMEOUT_SECONDS)
        if share_response.status_code != 200:
            return False, f"x_share_unavailable:{share_response.status_code}"
        share_html = share_response.text or ""
        if "twitter:image" not in share_html and "og:image" not in share_html:
            return False, "x_share_missing_preview_meta"

        image_response = requests.get(image_url, timeout=X_PREVIEW_TIMEOUT_SECONDS)
        if image_response.status_code != 200:
            return False, f"x_og_unavailable:{image_response.status_code}"
        content_type = (image_response.headers.get("content-type") or "").lower()
        if content_type and not content_type.startswith("image/"):
            return False, f"x_og_invalid_content_type:{content_type[:40]}"
        if len(image_response.content or b"") < 1024:
            return False, "x_og_empty_image"
    except requests.RequestException as exc:
        return False, f"x_preview_validation_failed:{exc}"
    return True, None


def _publish_to_x(asset: Dict[str, Any]) -> tuple[str, str | None]:
    preview_ok, preview_error = _validate_x_preview(asset)
    if not preview_ok:
        return "publish_failed", preview_error

    if x_official_configured():
        thread = asset.get("thread")
        if isinstance(thread, list) and len([part for part in thread if str(part or "").strip()]) > 1:
            sent, payload, error = x_post_thread([str(part) for part in thread])
        else:
            sent, payload, error = x_post_text(asset["body"])
        if sent:
            if isinstance(payload, dict):
                tweets = payload.get("tweets")
                if isinstance(tweets, list) and tweets:
                    external_ids: List[str] = []
                    for tweet in tweets:
                        data = tweet.get("data") if isinstance(tweet, dict) else None
                        if isinstance(data, dict) and data.get("id"):
                            external_ids.append(str(data["id"]))
                    if external_ids:
                        asset["external_id"] = external_ids[0]
                        asset["external_ids"] = external_ids
                else:
                    data = payload.get("data")
                    if isinstance(data, dict) and data.get("id"):
                        asset["external_id"] = data["id"]
            return "published", None
        return "publish_failed", error

    webhook_url = (os.getenv("X_PUBLISH_WEBHOOK_URL") or "").strip()
    if not webhook_url:
        return "publish_failed", "x_not_configured"

    headers = {"Content-Type": "application/json"}
    bearer = (os.getenv("X_PUBLISH_WEBHOOK_TOKEN") or "").strip()
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"

    response = requests.post(
        webhook_url,
        headers=headers,
        json={
            "headline": asset["headline"],
            "body": asset["body"],
            "x_format": asset.get("x_format"),
            "thread": asset.get("thread") or [],
            "reply_cta": asset.get("reply_cta"),
            "slug": asset["slug"],
            "cta_url": asset["cta_url"],
        },
        timeout=20,
    )
    response.raise_for_status()
    return "published", None


def _http_error_detail(response: requests.Response | None) -> str:
    if response is None:
        return ""
    safe_headers = {
        key: value
        for key, value in response.headers.items()
        if key.lower() in {
            "content-type",
            "x-rate-limit-limit",
            "x-rate-limit-remaining",
            "x-rate-limit-reset",
            "x-request-id",
            "x-transaction-id",
        }
    }
    return json.dumps(
        {
            "status_code": response.status_code,
            "headers": safe_headers,
            "body": _truncate_response_body(response.text if response is not None else ""),
        },
        ensure_ascii=False,
    )


def publish_distribution(slug: str, channels: Any = None, dry_run: bool = False, auto: bool = False) -> Dict[str, Any]:
    post = fetch_combined_intel_post(slug)
    if not post:
        return {"slug": slug, "results": [], "error": "Intel post not found"}
    if post.get("visibility") == "internal":
        return {"slug": slug, "results": [], "error": "Internal posts are not publishable"}
    if not post.get("distribution_ready", True):
        return {"slug": slug, "results": [], "error": "Post is not distribution ready"}

    selected_channels = _normalize_channels(channels)
    results: List[Dict[str, Any]] = []
    if auto and "x" in selected_channels:
        allowed, reason = _x_auto_publish_gate(post)
        if not allowed:
            selected_channels = [channel for channel in selected_channels if channel != "x"]
            results.append({"channel": "x", "status": "skipped", "reason": reason or "x_not_eligible"})

    if not selected_channels:
        return {"slug": slug, "results": results}

    redis_client = SafeRedis()
    if auto and not dry_run:
        gated_channels: List[str] = []
        for channel in selected_channels:
            fingerprint = _publication_fingerprint(post, channel)
            allowed, reason = _auto_channel_gate(redis_client, post, channel, fingerprint)
            if allowed:
                gated_channels.append(channel)
            else:
                results.append({"channel": channel, "status": "skipped", "reason": reason or "auto_gate"})
        selected_channels = gated_channels

    if not selected_channels:
        return {"slug": slug, "results": results}

    preview = generate_distribution_assets(slug, selected_channels)
    assets = preview.get("assets", [])

    for asset in assets:
        channel = asset["channel"]
        if not dry_run and asset.get("status") == "published" and asset.get("published_at"):
            results.append({"channel": channel, "status": "skipped", "reason": "already_published"})
            continue
        if dry_run:
            asset["status"] = "previewed"
            _write_json(redis_client, _asset_key(slug, channel), asset)
            results.append({"channel": channel, "status": "previewed"})
            continue

        try:
            if channel == "telegram":
                status, error = _publish_to_telegram(asset)
            elif channel == "whatsapp":
                status, error = _publish_to_whatsapp(asset)
            elif channel == "threads":
                status, error = _publish_to_threads(asset)
            else:
                status, error = _publish_to_x(asset)
        except requests.HTTPError as exc:
            response = exc.response
            status = "publish_failed"
            error = _http_error_detail(response) or _truncate_response_body(response.text if response is not None else "")
        except Exception as exc:
            status = "publish_failed"
            error = str(exc)

        asset["status"] = status
        asset["published_at"] = _iso_now() if status == "published" else None
        if error:
            asset["error"] = error
        elif "error" in asset:
            asset.pop("error", None)
        if status == "published" and auto:
            _record_published(redis_client, post, asset)
        _write_json(redis_client, _asset_key(slug, channel), asset)
        results.append({"channel": channel, "status": status, **({"error": error} if error else {})})

    return {"slug": slug, "results": results}


def auto_publish_enabled() -> bool:
    return bool(_configured_auto_channels())


def auto_publish_intel_post(slug: str, channels: Any = None) -> Dict[str, Any]:
    selected_channels = _normalize_channels(channels or _default_auto_channels())
    if not auto_publish_enabled():
        return {
            "slug": slug,
            "results": [{"channel": channel, "status": "disabled"} for channel in selected_channels],
        }
    return publish_distribution(slug, selected_channels, dry_run=False, auto=True)


def auto_publish_latest_posts(
    *,
    stream: str = "external",
    channels: Any = None,
    limit: int = 3,
) -> Dict[str, Any]:
    selected_channels = _normalize_channels(channels or _default_auto_channels())
    normalized_limit = max(1, min(int(limit or 1), 12))
    if not auto_publish_enabled():
        return {
            "stream": stream,
            "channels": selected_channels,
            "count": 0,
            "items": [],
            "disabled": True,
        }
    posts = fetch_combined_intel_posts(limit=max(normalized_limit * 4, normalized_limit), stream=stream)
    published: List[Dict[str, Any]] = []

    for post in posts:
        if len(published) >= normalized_limit:
            break
        result = publish_distribution(str(post.get("slug") or ""), selected_channels, dry_run=False, auto=True)
        delivered = any(item.get("status") == "published" for item in result.get("results", []))
        if delivered:
            published.append({
                "slug": post.get("slug"),
                "title": post.get("title"),
                "results": result.get("results", []),
            })

    return {
        "stream": stream,
        "channels": selected_channels,
        "count": len(published),
        "items": published,
    }


def fetch_distribution_status(slug: str) -> Dict[str, Any]:
    assets = fetch_distribution_assets(slug)
    return {
        "slug": slug,
        "channels": [
            {
                "channel": asset.get("channel"),
                "status": asset.get("status"),
                "published_at": asset.get("published_at"),
                **({"error": asset.get("error")} if asset.get("error") else {}),
            }
            for asset in assets
        ],
    }
