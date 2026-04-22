"""
Official X API publisher for SNELabs distribution.
Supports OAuth 1.0a user-context posting and OAuth 2 user-context fallback.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
import os
from typing import Any, Dict, List, Tuple

import requests
from requests_oauthlib import OAuth1

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


def _oauth1_consumer_key() -> str:
    return _env("X_API_KEY") or _env("X_CONSUMER_KEY")


def _oauth1_consumer_secret() -> str:
    return _env("X_API_SECRET") or _env("X_CONSUMER_SECRET")


def _oauth1_access_token() -> str:
    return _env("X_ACCESS_TOKEN")


def _oauth1_access_token_secret() -> str:
    return _env("X_ACCESS_TOKEN_SECRET")


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


def _oauth1_configured() -> bool:
    return bool(
        _oauth1_consumer_key()
        and _oauth1_consumer_secret()
        and _oauth1_access_token()
        and _oauth1_access_token_secret()
    )


def _oauth2_configured() -> bool:
    return bool(_env("X_CLIENT_ID") and (_env("X_ACCESS_TOKEN") or _env("X_REFRESH_TOKEN")))


def x_official_configured() -> bool:
    return _oauth1_configured() or _oauth2_configured()


def x_auth_mode() -> str | None:
    if _oauth1_configured():
        return "oauth1"
    if _oauth2_configured():
        return "oauth2"
    return None


def _oauth1_auth() -> OAuth1:
    return OAuth1(
        client_key=_oauth1_consumer_key(),
        client_secret=_oauth1_consumer_secret(),
        resource_owner_key=_oauth1_access_token(),
        resource_owner_secret=_oauth1_access_token_secret(),
        signature_type="auth_header",
    )


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


def _tweet_payload(text: str, reply_to_id: str | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"text": text}
    if reply_to_id:
        payload["reply"] = {"in_reply_to_tweet_id": reply_to_id}
    return payload


def _tweet_id(payload: Dict[str, Any] | None) -> str | None:
    if not isinstance(payload, dict):
        return None
    data = payload.get("data")
    if not isinstance(data, dict):
        return None
    tweet_id = str(data.get("id") or "").strip()
    return tweet_id or None


def x_post_text(text: str, reply_to_id: str | None = None) -> Tuple[bool, Dict[str, Any] | None, str | None]:
    json_payload = _tweet_payload(text, reply_to_id)
    if _oauth1_configured():
        response = requests.post(
            f"{_api_base()}/tweets",
            auth=_oauth1_auth(),
            headers={"Content-Type": "application/json"},
            json=json_payload,
            timeout=20,
        )
        response.raise_for_status()
        return True, response.json(), None

    access_token, error = _access_token()
    if not access_token:
        return False, None, error

    response = requests.post(
        f"{_api_base()}/tweets",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json=json_payload,
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
            json=json_payload,
            timeout=20,
        )

    response.raise_for_status()
    data = response.json()
    return True, data, None


def x_post_thread(parts: List[str]) -> Tuple[bool, Dict[str, Any] | None, str | None]:
    clean_parts = [str(part or "").strip() for part in parts if str(part or "").strip()]
    if not clean_parts:
        return False, None, "x_thread_empty"
    if len(clean_parts) == 1:
        return x_post_text(clean_parts[0])

    posted: List[Dict[str, Any]] = []
    reply_to_id: str | None = None
    for part in clean_parts:
        sent, payload, error = x_post_text(part, reply_to_id=reply_to_id)
        if not sent:
            return False, {"tweets": posted}, error or "x_thread_part_failed"
        if isinstance(payload, dict):
            posted.append(payload)
        reply_to_id = _tweet_id(payload)
        if not reply_to_id:
            return False, {"tweets": posted}, "x_thread_missing_tweet_id"
    return True, {"tweets": posted}, None


def x_get_authenticated_user(force: bool = False) -> Dict[str, Any] | None:
    redis_client = SafeRedis()
    if not force:
        cached = _read_json(redis_client, X_ACCOUNT_CACHE_KEY)
        if isinstance(cached, dict) and cached.get("data"):
            return cached

    if _oauth1_configured():
        response = requests.get(
            f"{_api_base()}/users/me",
            auth=_oauth1_auth(),
            timeout=20,
        )
    else:
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
    if isinstance(data, dict):
        data["auth_mode"] = x_auth_mode()
    _write_json(redis_client, X_ACCOUNT_CACHE_KEY, data, ttl_seconds=86400)
    return data
