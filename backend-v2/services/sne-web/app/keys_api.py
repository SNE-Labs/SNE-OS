"""
Keys API - SNE access layer.
"""

from flask import Blueprint, jsonify, request, session
import logging

from .keys_service import build_keys_overview

logger = logging.getLogger(__name__)

keys_bp = Blueprint("keys", __name__)


@keys_bp.get("/overview")
def overview():
    """
    Aggregated Keys page payload.
    GET /api/keys/overview?address=0x...
    """
    try:
        address = request.args.get("address") or session.get("siwe_address")
        return jsonify(build_keys_overview(address, bool(session.get("siwe_address")))), 200
    except Exception as e:
        logger.error(f"Keys overview error: {e}")
        return jsonify(build_keys_overview(None, False)), 200
