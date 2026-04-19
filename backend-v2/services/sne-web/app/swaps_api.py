"""
Swaps API - execution fee policy surface.
"""

from flask import Blueprint, jsonify, request
import logging

from .common.auth import get_auth_context
from .keys_entitlement_service import build_keys_entitlement
from .swaps_fee_service import resolve_fee_tier

logger = logging.getLogger(__name__)

swaps_bp = Blueprint("swaps", __name__)


@swaps_bp.get("/fee-tier")
def fee_tier():
    """
    Return fee tier derived from sovereign entitlement.
    GET /api/swaps/fee-tier?address=0x...
    """
    try:
        auth = get_auth_context()
        address = request.args.get("address") or auth.get("address")
        entitlement = build_keys_entitlement(address)
        return jsonify({
            "wallet": entitlement.get("wallet"),
            "feeTier": entitlement.get("feeTier"),
            "feePolicy": resolve_fee_tier(entitlement),
            "effectiveAccess": entitlement.get("effectiveAccess"),
            "source": entitlement.get("source"),
        }), 200
    except Exception as e:
        logger.error(f"Swaps fee tier error: {e}")
        return jsonify({
            "wallet": None,
            "feeTier": "standard",
            "feePolicy": resolve_fee_tier({}),
            "effectiveAccess": False,
            "source": "error",
        }), 200
