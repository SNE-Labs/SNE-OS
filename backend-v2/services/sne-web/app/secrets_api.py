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
        "source": "session" if session_address else "anonymous",
    }


def _require_authenticated_address():
    auth = _resolve_auth_context()
    address = auth.get("address")
    if not address:
        return None, (jsonify({"error": {"code": "UNAUTHENTICATED", "message": "Connect wallet required"}}), 401)
    return address, None


@secrets_bp.get("/overview")
def overview():
    """
    Aggregated Secrets page payload.
    GET /api/secrets/overview?address=0x...
    """
    try:
        auth = _resolve_auth_context()
        address = request.args.get("address") or auth.get("address")
        return jsonify(build_secrets_overview(address, bool(auth.get("authenticated")))), 200
    except Exception as exc:
        logger.error(f"Secrets overview error: {exc}")
        return jsonify(build_secrets_overview(None, False)), 200


@secrets_bp.get("/items")
def items():
    address, error = _require_authenticated_address()
    if error:
        return error

    vault_id = request.args.get("vault_id")
    result = list_secret_items(address, vault_id)
    return jsonify(result), 200


@secrets_bp.get("/items/<item_id>")
def item(item_id: str):
    address, error = _require_authenticated_address()
    if error:
        return error

    result = get_secret_item(address, item_id)
    if not result:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Secret item not found"}}), 404
    return jsonify(result), 200


@secrets_bp.post("/items")
def create():
    address, error = _require_authenticated_address()
    if error:
        return error

    try:
        payload = request.get_json(silent=True) or {}
        item = create_secret_item(address, payload)
        return jsonify(item), 201
    except ValueError as exc:
        return jsonify({"error": {"code": "BAD_REQUEST", "message": str(exc)}}), 400
    except RuntimeError as exc:
        return jsonify({"error": {"code": "STORAGE_UNAVAILABLE", "message": str(exc)}}), 503
    except Exception as exc:
        logger.error(f"Secrets create error: {exc}")
        return jsonify({"error": {"code": "INTERNAL_ERROR", "message": "Failed to create secret item"}}), 500


@secrets_bp.delete("/items/<item_id>")
def remove(item_id: str):
    address, error = _require_authenticated_address()
    if error:
        return error

    try:
        deleted = delete_secret_item(address, item_id)
        if not deleted:
            return jsonify({"error": {"code": "NOT_FOUND", "message": "Secret item not found"}}), 404
        return jsonify({"ok": True, "deleted": True, "id": item_id}), 200
    except RuntimeError as exc:
        return jsonify({"error": {"code": "STORAGE_UNAVAILABLE", "message": str(exc)}}), 503
    except Exception as exc:
        logger.error(f"Secrets delete error: {exc}")
        return jsonify({"error": {"code": "INTERNAL_ERROR", "message": "Failed to delete secret item"}}), 500
