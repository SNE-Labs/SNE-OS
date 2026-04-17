"""
Telegram delivery helpers for Intel distribution.
Carries over the useful operational ideas from the legacy stack:
- HTML sanitization
- chunking for long messages
- retry with exponential backoff
"""

from __future__ import annotations

import html
import logging
import os
import time
from typing import List, Tuple

import requests

logger = logging.getLogger(__name__)

TELEGRAM_MESSAGE_LIMIT = 3500


def sanitize_html(text: str) -> str:
    return html.escape(text or "", quote=False)


def split_message(text: str, limit: int = TELEGRAM_MESSAGE_LIMIT) -> List[str]:
    cleaned = (text or "").strip()
    if not cleaned:
        return []
    if len(cleaned) <= limit:
        return [cleaned]

    parts: List[str] = []
    current: List[str] = []
    current_len = 0

    for line in cleaned.splitlines():
        normalized = line.rstrip()
        candidate_len = current_len + len(normalized) + (1 if current else 0)
        if current and candidate_len > limit:
            parts.append("\n".join(current).strip())
            current = [normalized]
            current_len = len(normalized)
            continue

        if not current and len(normalized) > limit:
            start = 0
            while start < len(normalized):
                parts.append(normalized[start:start + limit].strip())
                start += limit
            current = []
            current_len = 0
            continue

        current.append(normalized)
        current_len = candidate_len

    if current:
        parts.append("\n".join(current).strip())

    return [part for part in parts if part]


def send_telegram_text(
    text: str,
    *,
    chat_id: str | None = None,
    retry_count: int = 3,
    disable_web_page_preview: bool = False,
) -> Tuple[bool, str | None]:
    token = (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
    resolved_chat_id = (chat_id or os.getenv("TELEGRAM_CHAT_ID") or "").strip()
    if not token:
        return False, "telegram_not_configured"
    if not resolved_chat_id:
        return False, "telegram_chat_not_configured"

    message_parts = split_message(sanitize_html(text))
    if not message_parts:
        return False, "telegram_message_empty"

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    for part in message_parts:
        sent = False
        last_error: str | None = None
        for attempt in range(retry_count):
            try:
                response = requests.post(
                    url,
                    json={
                        "chat_id": resolved_chat_id,
                        "text": part,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": disable_web_page_preview,
                    },
                    timeout=10,
                )
                response.raise_for_status()
                sent = True
                break
            except requests.HTTPError as exc:
                response = exc.response
                last_error = response.text[:400] if response is not None else "telegram_http_error"
                logger.warning(
                    "Telegram send failed: attempt=%s/%s status=%s body=%s",
                    attempt + 1,
                    retry_count,
                    response.status_code if response is not None else "unknown",
                    last_error,
                )
            except Exception as exc:
                last_error = str(exc)
                logger.warning(
                    "Telegram send failed: attempt=%s/%s error=%s",
                    attempt + 1,
                    retry_count,
                    last_error,
                )

            if attempt < retry_count - 1:
                time.sleep(2 ** attempt)

        if not sent:
            return False, last_error or "telegram_send_failed"

    return True, None
