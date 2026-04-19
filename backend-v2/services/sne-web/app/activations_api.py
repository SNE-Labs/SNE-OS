"""
Activation endpoints for cross-chain Operator Key processing.
"""

from __future__ import annotations

import logging

from flask import Blueprint, g, jsonify

from .activation_service import process_activation_order
from .checkout_service import CheckoutError, get_activation_order
from .common.auth import require_authenticated_user
from .common.http import fail

logger = logging.getLogger(__name__)

activations_bp = Blueprint("activations", __name__)


@activations_bp.get("/<order_id>")
@require_authenticated_user
def get_activation(order_id: str):
    try:
        return jsonify(get_activation_order(order_id=order_id, auth_address=g.user["address"])), 200
    except CheckoutError as exc:
        return fail(exc.code, exc.message, exc.status, **(exc.details or {}))
    except Exception as exc:
        logger.error("Activation fetch failed: %s", exc, exc_info=True)
        return fail("INTERNAL_ERROR", "Failed to fetch activation", 500)


@activations_bp.post("/<order_id>/process")
@require_authenticated_user
def process_activation(order_id: str):
    try:
        return jsonify(process_activation_order(order_id=order_id, auth_address=g.user["address"])), 200
    except CheckoutError as exc:
        return fail(exc.code, exc.message, exc.status, **(exc.details or {}))
    except Exception as exc:
        logger.error("Activation process failed: %s", exc, exc_info=True)
        return fail("INTERNAL_ERROR", "Failed to process activation", 500)


@activations_bp.post("/<order_id>/retry")
@require_authenticated_user
def retry_activation(order_id: str):
    try:
        return jsonify(process_activation_order(order_id=order_id, auth_address=g.user["address"])), 200
    except CheckoutError as exc:
        return fail(exc.code, exc.message, exc.status, **(exc.details or {}))
    except Exception as exc:
        logger.error("Activation retry failed: %s", exc, exc_info=True)
        return fail("INTERNAL_ERROR", "Failed to retry activation", 500)
