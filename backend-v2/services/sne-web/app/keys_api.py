"""
Keys API - SNE sovereign access layer.
"""

from flask import Blueprint, jsonify, request
import logging

from .keys_service import build_keys_overview
from .keys_entitlement_service import build_keys_entitlement
from .common.auth import get_auth_context

logger = logging.getLogger(__name__)

keys_bp = Blueprint("keys", __name__)


@keys_bp.get("/overview")
def overview():
    """
    Aggregated Keys page payload.
    GET /api/keys/overview?address=0x...
    """
    try:
        auth = get_auth_context()
        address = request.args.get("address") or auth.get("address")
        return jsonify(build_keys_overview(address, bool(auth.get("address")))), 200
    except Exception as e:
        logger.error(f"Keys overview error: {e}")
        return jsonify(build_keys_overview(None, False)), 200


@keys_bp.get("/entitlement")
def entitlement():
    """
    Resolve effective sovereign access for a wallet.
    GET /api/keys/entitlement?address=0x...
    """
    try:
        auth = get_auth_context()
        address = request.args.get("address") or auth.get("address")
        return jsonify(build_keys_entitlement(address)), 200
    except Exception as e:
        logger.error(f"Keys entitlement error: {e}")
        return jsonify(build_keys_entitlement(None)), 200


@keys_bp.get("/delegation")
def delegation():
    """
    Return owner/delegate resolution for a wallet.
    GET /api/keys/delegation?address=0x...
    """
    try:
        auth = get_auth_context()
        address = request.args.get("address") or auth.get("address")
        entitlement = build_keys_entitlement(address)
        return jsonify({
            "wallet": entitlement.get("wallet"),
            "ownerWallet": entitlement.get("ownerWallet"),
            "delegateWallet": entitlement.get("delegateWallet"),
            "effectiveAccess": entitlement.get("effectiveAccess"),
            "source": entitlement.get("source"),
            "lastIndexedBlock": entitlement.get("lastIndexedBlock"),
        }), 200
    except Exception as e:
        logger.error(f"Keys delegation error: {e}")
        return jsonify({
            "wallet": None,
            "ownerWallet": None,
            "delegateWallet": None,
            "effectiveAccess": False,
            "source": "error",
            "lastIndexedBlock": None,
        }), 200
