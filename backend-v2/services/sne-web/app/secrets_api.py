"""
Secrets API - encrypted secrets control plane for SNE OS.
"""

from datetime import datetime
from flask import Blueprint, jsonify, request, session
import logging
import jwt

from .auth_siwe import JWT_ALGORITHM, JWT_SECRET
from .secrets_service import (
    build_secrets_overview,
    create_secret_item,
    delete_secret_item,
    get_secret_item,
    list_secret_items,
    update_secret_item,
)

logger = logging.getLogger(__name__)

secrets_bp = Blueprint("secrets", __name__)


def _resolve_auth_context() -> dict:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "", 1).strip()
        if token:
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                exp = payload.get("exp")
                if exp and datetime.fromtimestamp(exp) > datetime.utcnow():
                    address = payload.get("address")
                    if address:
                        return {
                            "authenticated": True,
                            "address": address.lower(),
                            "identity_id": payload.get("identity_id"),
                            "source": "jwt",
                        }
            except jwt.ExpiredSignatureError:
                logger.info("Secrets auth context received expired JWT")
            except jwt.InvalidTokenError:
                logger.info("Secrets auth context received invalid JWT")
            except Exception as exc:
                logger.warning(f"Secrets auth context failed to decode JWT: {exc}")

    session_address = session.get("siwe_address")
    return {
        "authenticated": bool(session_address),
        "address": session_address,
        "identity_id": session.get("identity_id"),
        "source": "session" if session_address else "anonymous",
    }


def _resolve_owner_key(auth: dict) -> str | None:
    return auth.get("identity_id") or auth.get("address")


def _require_authenticated_owner():
    auth = _resolve_auth_context()
    owner_key = _resolve_owner_key(auth)
    if not owner_key:
        return None, (jsonify({"error": {"code": "UNAUTHENTICATED", "message": "Connect wallet required"}}), 401)
    return {
        "owner_key": owner_key,
        "address": auth.get("address"),
        "identity_id": auth.get("identity_id"),
    }, None


@secrets_bp.get("/overview")
def overview():
    """
    Aggregated Secrets page payload.
    GET /api/secrets/overview?address=0x...
    """
    try:
        auth = _resolve_auth_context()
        address = request.args.get("address") or auth.get("address")
        owner_key = _resolve_owner_key(auth) if auth.get("authenticated") else None
        return jsonify(build_secrets_overview(address, bool(auth.get("authenticated")), owner_key)), 200
    except Exception as exc:
        logger.error(f"Secrets overview error: {exc}")
        return jsonify(build_secrets_overview(None, False, None)), 200


@secrets_bp.get("/items")
def items():
    owner, error = _require_authenticated_owner()
    if error:
        return error

    vault_id = request.args.get("vault_id")
    result = list_secret_items(owner["owner_key"], vault_id)
    return jsonify(result), 200


@secrets_bp.get("/items/<item_id>")
def item(item_id: str):
    owner, error = _require_authenticated_owner()
    if error:
        return error

    result = get_secret_item(owner["owner_key"], item_id)
    if not result:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Secret item not found"}}), 404
    return jsonify(result), 200


@secrets_bp.post("/items")
def create():
    owner, error = _require_authenticated_owner()
    if error:
        return error

    try:
        payload = request.get_json(silent=True) or {}
        item = create_secret_item(owner["owner_key"], payload)
        return jsonify(item), 201
    except ValueError as exc:
        return jsonify({"error": {"code": "BAD_REQUEST", "message": str(exc)}}), 400
    except RuntimeError as exc:
        return jsonify({"error": {"code": "STORAGE_UNAVAILABLE", "message": str(exc)}}), 503
    except Exception as exc:
        logger.error(f"Secrets create error: {exc}")
        return jsonify({"error": {"code": "INTERNAL_ERROR", "message": "Failed to create secret item"}}), 500


@secrets_bp.put("/items/<item_id>")
def update(item_id: str):
    owner, error = _require_authenticated_owner()
    if error:
        return error

    try:
        payload = request.get_json(silent=True) or {}
        item = update_secret_item(owner["owner_key"], item_id, payload)
        return jsonify(item), 200
    except ValueError as exc:
        if str(exc) == "Secret item not found":
            return jsonify({"error": {"code": "NOT_FOUND", "message": str(exc)}}), 404
        return jsonify({"error": {"code": "BAD_REQUEST", "message": str(exc)}}), 400
    except RuntimeError as exc:
        return jsonify({"error": {"code": "STORAGE_UNAVAILABLE", "message": str(exc)}}), 503
    except Exception as exc:
        logger.error(f"Secrets update error: {exc}")
        return jsonify({"error": {"code": "INTERNAL_ERROR", "message": "Failed to update secret item"}}), 500


@secrets_bp.delete("/items/<item_id>")
def remove(item_id: str):
    owner, error = _require_authenticated_owner()
    if error:
        return error

    try:
        deleted = delete_secret_item(owner["owner_key"], item_id)
        if not deleted:
            return jsonify({"error": {"code": "NOT_FOUND", "message": "Secret item not found"}}), 404
        return jsonify({"ok": True, "deleted": True, "id": item_id}), 200
    except RuntimeError as exc:
        return jsonify({"error": {"code": "STORAGE_UNAVAILABLE", "message": str(exc)}}), 503
    except Exception as exc:
        logger.error(f"Secrets delete error: {exc}")
        return jsonify({"error": {"code": "INTERNAL_ERROR", "message": "Failed to delete secret item"}}), 500
