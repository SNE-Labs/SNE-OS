"""
Secrets API - encrypted secrets control plane for SNE OS.
"""

from flask import Blueprint, jsonify, request, session
import logging

from .secrets_service import (
    build_secrets_overview,
    create_secret_item,
    delete_secret_item,
    get_secret_item,
    list_secret_items,
)

logger = logging.getLogger(__name__)

secrets_bp = Blueprint("secrets", __name__)


def _require_session_address():
    address = session.get("siwe_address")
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
        address = request.args.get("address") or session.get("siwe_address")
        return jsonify(build_secrets_overview(address, bool(session.get("siwe_address")))), 200
    except Exception as exc:
        logger.error(f"Secrets overview error: {exc}")
        return jsonify(build_secrets_overview(None, False)), 200


@secrets_bp.get("/items")
def items():
    address, error = _require_session_address()
    if error:
        return error

    vault_id = request.args.get("vault_id")
    result = list_secret_items(address, vault_id)
    return jsonify(result), 200


@secrets_bp.get("/items/<item_id>")
def item(item_id: str):
    address, error = _require_session_address()
    if error:
        return error

    result = get_secret_item(address, item_id)
    if not result:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Secret item not found"}}), 404
    return jsonify(result), 200


@secrets_bp.post("/items")
def create():
    address, error = _require_session_address()
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
    address, error = _require_session_address()
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
