"""Temporary public media cache for Radar report social images."""

from __future__ import annotations

import base64
import secrets
from typing import Optional

from .utils.redis_safe import SafeRedis


_REDIS = SafeRedis()
_PREFIX = "radar:report:media:"
_TTL_SECONDS = 15 * 60


def store_radar_report_media(image_bytes: bytes, *, ttl_seconds: int = _TTL_SECONDS) -> str:
    media_id = secrets.token_urlsafe(18)
    encoded = base64.b64encode(image_bytes).decode("ascii")
    _REDIS.setex(f"{_PREFIX}{media_id}", ttl_seconds, encoded)
    return media_id


def get_radar_report_media(media_id: str) -> Optional[bytes]:
    normalized = str(media_id or "").strip()
    if not normalized:
        return None
    encoded = _REDIS.get(f"{_PREFIX}{normalized}")
    if not encoded:
        return None
    try:
        return base64.b64decode(encoded, validate=True)
    except Exception:
        return None
