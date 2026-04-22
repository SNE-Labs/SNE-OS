"""Threads publishing helpers."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Tuple

import requests

from .intel_enrichment import _truncate_response_body

logger = logging.getLogger(__name__)


def _threads_api_base() -> str:
    version = (os.getenv("THREADS_API_VERSION") or "v1.0").strip().strip("/")
    return f"https://graph.threads.net/{version}"


def _threads_credentials() -> Tuple[str, str]:
    return (os.getenv("THREADS_ACCESS_TOKEN") or "").strip(), (os.getenv("THREADS_USER_ID") or "").strip()


def threads_configured() -> bool:
    access_token, user_id = _threads_credentials()
    return bool(access_token and user_id)


def _http_error_detail(response: requests.Response | None) -> str:
    if response is None:
        return ""
    safe_headers = {
        key: value
        for key, value in response.headers.items()
        if key.lower() in {"content-type", "x-fb-trace-id", "x-fb-debug"}
    }
    return json.dumps(
        {
            "status_code": response.status_code,
            "headers": safe_headers,
            "body": _truncate_response_body(response.text if response is not None else ""),
        },
        ensure_ascii=False,
    )


def send_threads_post(text: str, *, image_url: str | None = None) -> Tuple[bool, Dict[str, Any] | None, str | None]:
    access_token, user_id = _threads_credentials()
    if not access_token or not user_id:
        return False, None, "threads_not_configured"

    body = str(text or "").strip()
    if not body:
        return False, None, "threads_body_empty"

    payload: Dict[str, Any] = {
        "media_type": "IMAGE" if image_url else "TEXT",
        "text": body,
        "access_token": access_token,
    }
    if image_url:
        payload["image_url"] = image_url

    try:
        create_response = requests.post(
            f"{_threads_api_base()}/{user_id}/threads",
            data=payload,
            timeout=25,
        )
        create_response.raise_for_status()
        creation = create_response.json()
        creation_id = str(creation.get("id") or "").strip()
        if not creation_id:
            return False, creation, f"threads_missing_creation_id:{_truncate_response_body(create_response.text)}"

        publish_response = requests.post(
            f"{_threads_api_base()}/{user_id}/threads_publish",
            data={
                "creation_id": creation_id,
                "access_token": access_token,
            },
            timeout=25,
        )
        publish_response.raise_for_status()
        published = publish_response.json()
        return True, published if isinstance(published, dict) else None, None
    except requests.HTTPError as exc:
        return False, None, _http_error_detail(exc.response) or "threads_http_error"
    except Exception as exc:
        logger.warning("Threads publish failed: %s", exc)
        return False, None, str(exc)
