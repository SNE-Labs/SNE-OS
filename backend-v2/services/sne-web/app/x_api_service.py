"""
Official X API publisher for SNELabs distribution.
Supports OAuth 2 user-context posting with refresh-token rotation.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
import os
from typing import Any, Dict, Tuple

import requests

from .utils.redis_safe import SafeRedis

logger = logging.getLogger(__name__)

X_TOKEN_CACHE_KEY = "x:oauth:token"
X_ACCOUNT_CACHE_KEY = "x:oauth:account"
X_TOKEN_TTL_SECONDS = 86400 * 30


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _token_url() -> str:
    return "https://api.x.com/2/oauth2/token"


def _api_base() -> str:
    return "https://api.x.com/2"


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def _read_json(redis_client: SafeRedis, key: str) -> Any:
    cached = redis_client.get(key)
    if not cached:
        return None
    try:
        return json.loads(cached)
    except Exception:
        return None


def _write_json(redis_client: SafeRedis, key: str, payload: Any, ttl_seconds: int = X_TOKEN_TTL_SECONDS) -> None:
    redis_client.setex(key, ttl_seconds, json.dumps(payload, ensure_ascii=False))


def x_official_configured() -> bool:
    return bool(_env("X_CLIENT_ID") and (_env("X_ACCESS_TOKEN") or _env("X_REFRESH_TOKEN")))


def _token_record() -> Dict[str, Any]:
    redis_client = SafeRedis()
    cached = _read_json(redis_client, X_TOKEN_CACHE_KEY)
    if isinstance(cached, dict) and cached.get("access_token"):
        return cached

    payload = {
        "access_token": _env("X_ACCESS_TOKEN"),
        "refresh_token": _env("X_REFRESH_TOKEN"),
        "token_type": _env("X_TOKEN_TYPE") or "bearer",
        "scope": _env("X_TOKEN_SCOPE"),
        "updated_at": _iso_now(),
    }
    if payload["access_token"] or payload["refresh_token"]:
        _write_json(redis_client, X_TOKEN_CACHE_KEY, payload)
    return payload


def _store_token_record(payload: Dict[str, Any]) -> None:
    redis_client = SafeRedis()
    payload = {
        **payload,
        "updated_at": _iso_now(),
    }
    _write_json(redis_client, X_TOKEN_CACHE_KEY, payload)


def _refresh_access_token() -> Tuple[bool, str | None]:
    refresh_token = _token_record().get("refresh_token") or _env("X_REFRESH_TOKEN")
    client_id = _env("X_CLIENT_ID")
    client_secret = _env("X_CLIENT_SECRET")
    if not refresh_token or not client_id:
        return False, "x_refresh_not_configured"

    payload = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id,
    }
    if client_secret:
        payload["client_secret"] = client_secret

    response = requests.post(
        _token_url(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=payload,
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()
    _store_token_record({
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token") or refresh_token,
        "token_type": data.get("token_type", "bearer"),
        "scope": data.get("scope", ""),
    })
    return True, None


def _access_token() -> Tuple[str | None, str | None]:
    record = _token_record()
    access_token = str(record.get("access_token") or "").strip()
    if access_token:
        return access_token, None
    refreshed, error = _refresh_access_token()
    if not refreshed:
        return None, error
    record = _token_record()
    access_token = str(record.get("access_token") or "").strip()
    return (access_token, None) if access_token else (None, "x_access_token_unavailable")


def x_post_text(text: str) -> Tuple[bool, Dict[str, Any] | None, str | None]:
    access_token, error = _access_token()
    if not access_token:
        return False, None, error

    response = requests.post(
        f"{_api_base()}/tweets",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json={"text": text},
        timeout=20,
    )
    if response.status_code == 401 and _token_record().get("refresh_token"):
        refreshed, refresh_error = _refresh_access_token()
        if not refreshed:
            return False, None, refresh_error
        access_token, error = _access_token()
        if not access_token:
            return False, None, error
        response = requests.post(
            f"{_api_base()}/tweets",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"text": text},
            timeout=20,
        )

    response.raise_for_status()
    data = response.json()
    return True, data, None


def x_get_authenticated_user(force: bool = False) -> Dict[str, Any] | None:
    redis_client = SafeRedis()
    if not force:
        cached = _read_json(redis_client, X_ACCOUNT_CACHE_KEY)
        if isinstance(cached, dict) and cached.get("data"):
            return cached

    access_token, error = _access_token()
    if not access_token:
        return None
    response = requests.get(
        f"{_api_base()}/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()
    _write_json(redis_client, X_ACCOUNT_CACHE_KEY, data, ttl_seconds=86400)
    return data
