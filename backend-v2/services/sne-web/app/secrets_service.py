"""
Secrets service for SNE OS.
Defines the encrypted-secrets control plane without exposing plaintext server-side.
"""

from __future__ import annotations

from datetime import datetime
import json
import os
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .passport_service import build_linked_accounts, build_network_scope
from .utils.redis_safe import SafeRedis


SECRETS_STORAGE_TTL_SECONDS = int(os.getenv("SECRETS_STORAGE_TTL_SECONDS", str(60 * 60 * 24 * 365)))


def _env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _sync_surface() -> Dict[str, Any]:
    cloak_enabled = _env_flag("CLOAK_ENABLED", False)
    cloak_rpc_url = os.getenv("CLOAK_RPC_URL")
    cloak_proxy_url = os.getenv("CLOAK_PROXY_URL")
    configured = bool(cloak_enabled and (cloak_rpc_url or cloak_proxy_url))

    return {
        "backend": "cloak" if cloak_enabled else "disabled",
        "configured": configured,
        "rpc_url": cloak_rpc_url,
        "proxy_url": cloak_proxy_url,
        "mode": "client-side-encrypted",
        "detail": (
            "Cloak sync disponível para ciphertext e metadata."
            if configured
            else "Secrets permanecem locais até uma camada de sync criptografada ser configurada."
        ),
    }


def _storage_surface() -> Dict[str, Any]:
    redis_client = SafeRedis()
    configured = bool(redis_client.available)
    backend = "redis" if configured else "disabled"
    return {
        "backend": backend,
        "configured": configured,
        "ttl_seconds": SECRETS_STORAGE_TTL_SECONDS if configured else None,
        "detail": (
            "Ciphertext envelopes são persistidos no storage configurado."
            if configured
            else "Nenhum storage configurado para envelopes cifrados."
        ),
    }


def _capabilities(sync_surface: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "plaintext_server_side": False,
        "client_side_encryption_required": True,
        "wallet_bound_unlock": True,
        "device_binding_supported": True,
        "sharing_supported": False,
        "recovery_supported": False,
        "sync_supported": bool(sync_surface["configured"]),
        "sync_backend": sync_surface["backend"],
    }


def _vault_definitions() -> List[Dict[str, Any]]:
    return [
        {
            "id": "passwords",
            "label": "Passwords",
            "count": 0,
            "state": "empty",
            "detail": "Credenciais de login armazenadas como ciphertext.",
        },
        {
            "id": "api_keys",
            "label": "API Keys",
            "count": 0,
            "state": "empty",
            "detail": "Chaves de API e tokens operacionais protegidos por criptografia local.",
        },
        {
            "id": "secure_notes",
            "label": "Secure Notes",
            "count": 0,
            "state": "empty",
            "detail": "Notas privadas, recovery codes e fragments em cofre cifrado.",
        },
        {
            "id": "recovery_material",
            "label": "Recovery Material",
            "count": 0,
            "state": "empty",
            "detail": "Material sensível exige recovery model antes de sync remoto.",
        },
    ]


def _build_vaults(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    counts: Dict[str, int] = {}
    for item in items:
        vault_id = item.get("vault_id")
        if not vault_id:
            continue
        counts[vault_id] = counts.get(vault_id, 0) + 1

    vaults: List[Dict[str, Any]] = []
    for vault in _vault_definitions():
        count = counts.get(vault["id"], 0)
        vaults.append({
            **vault,
            "count": count,
            "state": "ready" if count > 0 else "empty",
        })
    return vaults


def _sort_items_by_recency(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return sorted(
        items,
        key=lambda item: item.get("updated_at") or item.get("created_at") or "",
        reverse=True,
    )


def _build_recent_items(items: List[Dict[str, Any]], limit: int = 3) -> List[Dict[str, Any]]:
    recent: List[Dict[str, Any]] = []
    for item in _sort_items_by_recency(items)[:limit]:
        recent.append({
            "id": item.get("id"),
            "vault_id": item.get("vault_id"),
            "kind": item.get("kind"),
            "label": item.get("label"),
            "updated_at": item.get("updated_at") or item.get("created_at"),
            "created_at": item.get("created_at"),
        })
    return recent


def _latest_item_timestamp(items: List[Dict[str, Any]]) -> Optional[str]:
    ordered = _sort_items_by_recency(items)
    if not ordered:
        return None
    return ordered[0].get("updated_at") or ordered[0].get("created_at")


def _decode_redis_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if isinstance(value, str):
        return value
    return str(value)


def _index_key(address: str) -> str:
    return f"secrets:index:{address.lower()}"


def _item_key(address: str, item_id: str) -> str:
    return f"secrets:item:{address.lower()}:{item_id}"


def _read_index(redis_client: SafeRedis, address: str) -> List[Dict[str, Any]]:
    raw = _decode_redis_value(redis_client.get(_index_key(address)))
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def _write_index(redis_client: SafeRedis, address: str, items: List[Dict[str, Any]]) -> bool:
    return bool(redis_client.setex(_index_key(address), SECRETS_STORAGE_TTL_SECONDS, json.dumps(items)))


def _normalize_vault_id(vault_id: str) -> str:
    allowed = {"passwords", "api_keys", "secure_notes", "recovery_material"}
    if vault_id not in allowed:
        raise ValueError("Invalid vault_id")
    return vault_id


def _validate_envelope(payload: Dict[str, Any]) -> Dict[str, Any]:
    vault_id = _normalize_vault_id(str(payload.get("vault_id", "")).strip())
    kind = str(payload.get("kind", "")).strip() or vault_id[:-1] if vault_id.endswith("s") else vault_id
    algorithm = str(payload.get("algorithm", "")).strip()
    ciphertext = str(payload.get("ciphertext", "")).strip()
    wrapped_key = str(payload.get("wrapped_key", "")).strip()
    iv = str(payload.get("iv", "")).strip()
    auth_tag = str(payload.get("auth_tag", "")).strip()

    if not algorithm or not ciphertext or not wrapped_key or not iv or not auth_tag:
        raise ValueError("Missing required encrypted envelope fields")

    item = {
        "id": payload.get("id") or uuid4().hex,
        "vault_id": vault_id,
        "kind": kind,
        "label": str(payload.get("label", "")).strip() or "Untitled secret",
        "algorithm": algorithm,
        "ciphertext": ciphertext,
        "wrapped_key": wrapped_key,
        "iv": iv,
        "auth_tag": auth_tag,
        "aad": payload.get("aad"),
        "metadata": payload.get("metadata") or {},
        "version": int(payload.get("version", 1)),
        "created_at": payload.get("created_at") or datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    return item


def list_secret_items(address: str, vault_id: Optional[str] = None) -> Dict[str, Any]:
    redis_client = SafeRedis()
    storage = _storage_surface()
    if not storage["configured"]:
        return {
            "configured": False,
            "items": [],
            "count": 0,
        }

    items = _read_index(redis_client, address)
    if vault_id:
        vault_id = _normalize_vault_id(vault_id)
        items = [item for item in items if item.get("vault_id") == vault_id]

    return {
        "configured": True,
        "items": items,
        "count": len(items),
    }


def get_secret_item(address: str, item_id: str) -> Optional[Dict[str, Any]]:
    redis_client = SafeRedis()
    raw = _decode_redis_value(redis_client.get(_item_key(address, item_id)))
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def create_secret_item(address: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    redis_client = SafeRedis()
    storage = _storage_surface()
    if not storage["configured"]:
        raise RuntimeError("Secrets storage not configured")

    item = _validate_envelope(payload)
    item_key = _item_key(address, item["id"])
    persisted = redis_client.setex(item_key, SECRETS_STORAGE_TTL_SECONDS, json.dumps(item))
    if not persisted:
        raise RuntimeError("Failed to persist encrypted envelope")

    index = _read_index(redis_client, address)
    index = [existing for existing in index if existing.get("id") != item["id"]]
    index.append({
        "id": item["id"],
        "vault_id": item["vault_id"],
        "kind": item["kind"],
        "label": item["label"],
        "algorithm": item["algorithm"],
        "version": item["version"],
        "metadata": item["metadata"],
        "created_at": item["created_at"],
        "updated_at": item["updated_at"],
    })
    _write_index(redis_client, address, index)
    return item


def delete_secret_item(address: str, item_id: str) -> bool:
    redis_client = SafeRedis()
    storage = _storage_surface()
    if not storage["configured"]:
        raise RuntimeError("Secrets storage not configured")

    redis_client.delete(_item_key(address, item_id))
    index = _read_index(redis_client, address)
    next_index = [item for item in index if item.get("id") != item_id]
    _write_index(redis_client, address, next_index)
    return len(next_index) != len(index)


def build_secrets_overview(address: Optional[str], authenticated: bool) -> Dict[str, Any]:
    sync_surface = _sync_surface()
    storage_surface = _storage_surface()
    capabilities = _capabilities(sync_surface)

    if not address:
        return {
            "connected": False,
            "status": {"label": "locked", "tone": "pending"},
            "surface": {
                "address": None,
                "mode": "client-side-encrypted",
                "source": "local-only",
            },
            "capabilities": capabilities,
            "policy": {
                "plaintext_server_side": False,
                "exportability": "ciphertext-only",
                "custody": "user-controlled",
            },
            "sync": sync_surface,
            "storage": storage_surface,
            "linked_accounts": [],
            "network_scope": build_network_scope(),
            "vaults": _build_vaults([]),
            "item_count": 0,
            "recent_items": [],
            "updated_at": None,
            "items": [],
            "access": {
                "session_bound": False,
                "linked_accounts_required": True,
                "device_binding": "optional",
            },
            "last_updated": datetime.utcnow().isoformat(),
        }

    linked_accounts = build_linked_accounts(address, "scroll")
    status = {"label": "session", "tone": "active"} if authenticated else {"label": "readonly", "tone": "warning"}
    items_payload = list_secret_items(address) if storage_surface["configured"] else {"items": [], "count": 0}
    items = items_payload["items"]

    return {
        "connected": True,
        "status": status,
        "surface": {
            "address": address,
            "mode": "client-side-encrypted",
            "source": "session",
        },
        "capabilities": capabilities,
        "policy": {
            "plaintext_server_side": False,
            "exportability": "ciphertext-only",
            "custody": "user-controlled",
        },
        "sync": sync_surface,
        "storage": storage_surface,
        "linked_accounts": linked_accounts,
        "network_scope": build_network_scope(),
        "vaults": _build_vaults(items),
        "item_count": items_payload["count"],
        "recent_items": _build_recent_items(items),
        "updated_at": _latest_item_timestamp(items),
        "items": items,
        "access": {
            "session_bound": authenticated,
            "linked_accounts_required": True,
            "device_binding": "optional",
        },
        "last_updated": datetime.utcnow().isoformat(),
    }
