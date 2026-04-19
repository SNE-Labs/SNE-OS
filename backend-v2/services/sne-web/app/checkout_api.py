"""
Checkout API for ActivationOrder lifecycle.
"""

from flask import Blueprint, g, jsonify, request
import logging

from .checkout_service import (
    CheckoutError,
    cancel_activation_order,
    create_activation_order,
    create_tron_session,
    get_activation_order,
)
from .common.auth import require_authenticated_user
from .common.http import fail

logger = logging.getLogger(__name__)

checkout_bp = Blueprint("checkout", __name__)


@checkout_bp.post("/orders")
@require_authenticated_user
def create_order():
    body = request.get_json(silent=True) or {}
    try:
        order = create_activation_order(
            auth_address=g.user["address"],
            product_code=body.get("productCode"),
            target_arbitrum_address=body.get("targetArbitrumAddress"),
            idempotency_key=body.get("idempotencyKey"),
            auth_source=g.user.get("auth_source"),
        )
        return jsonify(order), 201
    except CheckoutError as exc:
        return fail(exc.code, exc.message, exc.status, **(exc.details or {}))
    except Exception as exc:
        logger.error("Checkout order creation failed: %s", exc, exc_info=True)
        return fail("INTERNAL_ERROR", "Failed to create activation order", 500)


@checkout_bp.get("/orders/<order_id>")
@require_authenticated_user
def get_order(order_id: str):
    try:
        return jsonify(get_activation_order(order_id=order_id, auth_address=g.user["address"])), 200
    except CheckoutError as exc:
        return fail(exc.code, exc.message, exc.status, **(exc.details or {}))
    except Exception as exc:
        logger.error("Checkout order fetch failed: %s", exc, exc_info=True)
        return fail("INTERNAL_ERROR", "Failed to fetch activation order", 500)


@checkout_bp.post("/orders/<order_id>/tron-session")
@require_authenticated_user
def bind_tron_session(order_id: str):
    body = request.get_json(silent=True) or {}
    try:
        return jsonify(
            create_tron_session(
                order_id=order_id,
                auth_address=g.user["address"],
                buyer_tron_address=body.get("buyerTronAddress"),
                wallet_provider=body.get("walletProvider"),
                gas_mode=body.get("gasMode"),
            )
        ), 200
    except CheckoutError as exc:
        return fail(exc.code, exc.message, exc.status, **(exc.details or {}))
    except Exception as exc:
        logger.error("Checkout Tron session failed: %s", exc, exc_info=True)
        return fail("INTERNAL_ERROR", "Failed to bind Tron session", 500)


@checkout_bp.post("/orders/<order_id>/cancel")
@require_authenticated_user
def cancel_order(order_id: str):
    body = request.get_json(silent=True) or {}
    try:
        return jsonify(
            cancel_activation_order(
                order_id=order_id,
                auth_address=g.user["address"],
                cancel_reason=body.get("reason"),
            )
        ), 200
    except CheckoutError as exc:
        return fail(exc.code, exc.message, exc.status, **(exc.details or {}))
    except Exception as exc:
        logger.error("Checkout order cancellation failed: %s", exc, exc_info=True)
        return fail("INTERNAL_ERROR", "Failed to cancel activation order", 500)
