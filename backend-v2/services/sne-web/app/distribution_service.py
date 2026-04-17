"""
Distribution asset generation and controlled publishing for Intel institutional content.
"""

from __future__ import annotations

from datetime import datetime, timezone
import html
import json
import logging
import os
import re
from typing import Any, Dict, List

import requests

from .institutional_service import fetch_combined_intel_post, fetch_combined_intel_posts
from .intel_enrichment import (
    _extract_json,
    _extract_response_text,
    _openai_responses_payload,
    _truncate_response_body,
)
from .og_image_service import build_intel_share_url
from .telegram_delivery import send_telegram_text
from .utils.redis_safe import SafeRedis
from .x_api_service import x_official_configured, x_post_text

logger = logging.getLogger(__name__)

VALID_CHANNELS = {"telegram", "whatsapp", "x"}
ASSET_KEY_PREFIX = "intel:distribution:asset:"
ASSET_INDEX_PREFIX = "intel:distribution:index:"
URL_PATTERN = re.compile(r"https?://\S+")
TRAILING_STOPWORDS = {
    "a", "as", "ao", "aos", "com", "da", "das", "de", "do", "dos", "e",
    "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "sem", "um", "uma",
}


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
            "Crie uma peça para Telegram em pt-BR com headline forte, um bloco curto de contexto, "
            "até 900 caracteres e um CTA final."
        )
    if channel == "whatsapp":
        return (
            "Crie uma peça para WhatsApp em pt-BR com tom direto, até 600 caracteres, "
            "curta o suficiente para boletim e feche com um link."
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


def _telegram_family_label(post: Dict[str, Any]) -> str:
    stream = str(post.get("stream") or "").strip().lower()
    institutional_type = str(post.get("institutional_type") or post.get("type") or "").strip().lower()
    if stream == "institutional":
        if institutional_type in {"product-update", "release-note", "dev-log"}:
            return "SNE OS | Produto"
        return "INTEL | Institucional"
    return "INTEL | Mercado"


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


def _compose_telegram_body(post: Dict[str, Any], cta_url: str) -> str:
    family = _telegram_family_label(post)
    insight = _first_meaningful_line(
        post.get("subtitle"),
        post.get("excerpt"),
        limit=160,
    )
    impact = _first_meaningful_line(
        post.get("excerpt"),
        post.get("subtitle"),
        limit=94,
    )
    action = _telegram_action_line(post)
    lines: List[str] = [family]
    if insight:
        lines.extend(["", insight])
    detail_lines = [line for line in [f"- impacto: {impact}" if impact else "", f"- acao: {action}" if action else ""] if line]
    if detail_lines:
        lines.extend(["", *detail_lines])
    lines.extend(["", "Dossie completo:", cta_url, "", "SNE Labs Intel"])
    return "\n".join(lines).strip()


def _compose_x_body(
    post: Dict[str, Any],
    cta_url: str,
    headline: str,
    impact_line: str,
    action_line: str,
) -> str:
    family = _x_family_label(post)
    family_prefix = f"{family}: "
    link_line = cta_url
    budgets = {
        "headline": 72,
        "impact": 74,
        "action": 70,
    }
    minimums = {
        "headline": 38,
        "impact": 32,
        "action": 28,
    }

    def _render() -> tuple[str, Dict[str, str]]:
        parts = {
            "headline": _truncate_copy_line(headline, budgets["headline"]),
            "impact": _truncate_copy_line(impact_line, budgets["impact"]),
            "action": _truncate_copy_line(action_line, budgets["action"]),
        }
        sentences = [
            f"{family_prefix}{parts['headline'].rstrip('.…')}.",
            f"{parts['impact'].rstrip('.…')}.",
            f"{parts['action'].rstrip('.…')}.",
        ]
        body = " ".join(sentences + [link_line]).strip()
        return body, parts

    body, parts = _render()
    while _effective_x_length(body) > 270:
        adjustable = [
            key for key in ("impact", "action", "headline")
            if budgets[key] > minimums[key]
        ]
        if not adjustable:
            body = " ".join(
                [
                    f"{family_prefix}{parts['headline'].rstrip('.…')}.",
                    f"{parts['impact'].rstrip('.…')}.",
                    link_line,
                ]
            ).strip()
            if _effective_x_length(body) <= 270:
                return body
            body = " ".join(
                [
                    f"{family_prefix}{parts['headline'].rstrip('.…')}.",
                    link_line,
                ]
            ).strip()
            if _effective_x_length(body) <= 270:
                return body
            body = " ".join([parts["headline"].rstrip(".…") + ".", link_line]).strip()
            return body
        longest = max(adjustable, key=lambda key: budgets[key])
        budgets[longest] -= 10
        body, parts = _render()
    return body


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
            "Nao invente fatos novos e responda em JSON com headline e body."
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
                    "tldr": [action_line],
                },
                cta_url,
            )
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
    return {
        "post_id": post.get("id"),
        "slug": post["slug"],
        "channel": channel,
        "headline": headline,
        "body": body,
        "cta_url": cta_url,
        "status": "ready",
        "dedupe_key": f"{post.get('id')}:{channel}",
        "published_at": None,
        "generated_at": _iso_now(),
    }


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


def _publish_to_x(asset: Dict[str, Any]) -> tuple[str, str | None]:
    if x_official_configured():
        sent, payload, error = x_post_text(asset["body"])
        if sent:
            if isinstance(payload, dict):
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
            "slug": asset["slug"],
            "cta_url": asset["cta_url"],
        },
        timeout=20,
    )
    response.raise_for_status()
    return "published", None


def publish_distribution(slug: str, channels: Any = None, dry_run: bool = False) -> Dict[str, Any]:
    post = fetch_combined_intel_post(slug)
    if not post:
        return {"slug": slug, "results": [], "error": "Intel post not found"}
    if post.get("visibility") == "internal":
        return {"slug": slug, "results": [], "error": "Internal posts are not publishable"}
    if not post.get("distribution_ready", True):
        return {"slug": slug, "results": [], "error": "Post is not distribution ready"}

    preview = generate_distribution_assets(slug, channels)
    assets = preview.get("assets", [])
    redis_client = SafeRedis()
    results: List[Dict[str, Any]] = []

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
            else:
                status, error = _publish_to_x(asset)
        except requests.HTTPError as exc:
            response = exc.response
            status = "publish_failed"
            error = _truncate_response_body(response.text if response is not None else "")
        except Exception as exc:
            status = "publish_failed"
            error = str(exc)

        asset["status"] = status
        asset["published_at"] = _iso_now() if status == "published" else None
        if error:
            asset["error"] = error
        _write_json(redis_client, _asset_key(slug, channel), asset)
        results.append({"channel": channel, "status": status, **({"error": error} if error else {})})

    return {"slug": slug, "results": results}


def auto_publish_enabled() -> bool:
    if not (os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHAT_ID")):
        return False
    return _env_flag("INTEL_TELEGRAM_AUTO_PUBLISH", default=True)


def auto_publish_intel_post(slug: str, channels: Any = None) -> Dict[str, Any]:
    selected_channels = _normalize_channels(channels or ["telegram"])
    if not auto_publish_enabled():
        return {
            "slug": slug,
            "results": [{"channel": channel, "status": "disabled"} for channel in selected_channels],
        }
    return publish_distribution(slug, selected_channels, dry_run=False)


def auto_publish_latest_posts(
    *,
    stream: str = "external",
    channels: Any = None,
    limit: int = 3,
) -> Dict[str, Any]:
    selected_channels = _normalize_channels(channels or ["telegram"])
    normalized_limit = max(1, min(int(limit or 1), 12))
    posts = fetch_combined_intel_posts(limit=max(normalized_limit * 4, normalized_limit), stream=stream)
    published: List[Dict[str, Any]] = []

    for post in posts:
        if len(published) >= normalized_limit:
            break
        result = publish_distribution(str(post.get("slug") or ""), selected_channels, dry_run=False)
        statuses = [item.get("status") for item in result.get("results", [])]
        if any(status in {"published", "skipped"} for status in statuses):
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
