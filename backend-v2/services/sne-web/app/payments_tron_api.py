"""
HTTP endpoints for Tron payment reconciliation.
"""

from __future__ import annotations

import logging

from flask import Blueprint, g, jsonify, request

from .activation_service import process_activation_order
from .checkout_service import CheckoutError
from .common.auth import require_authenticated_user
from .common.http import fail
from .config import Config
from .tron_payments_service import reconcile_tron_payment

logger = logging.getLogger(__name__)

payments_tron_bp = Blueprint("payments_tron", __name__)


@payments_tron_bp.post("/reconcile/<order_id>")
@require_authenticated_user
def reconcile_payment(order_id: str):
    body = request.get_json(silent=True) or {}
    try:
        order = reconcile_tron_payment(
            order_id=order_id,
            tx_hash=body.get("txHash"),
            auth_address=g.user["address"],
            auto_process=bool(body.get("autoProcess", True)),
        )
        return jsonify(order), 200
    except CheckoutError as exc:
        return fail(exc.code, exc.message, exc.status, **(exc.details or {}))
    except Exception as exc:
        logger.error("Tron payment reconcile failed: %s", exc, exc_info=True)
        return fail("INTERNAL_ERROR", "Failed to reconcile Tron payment", 500)


@payments_tron_bp.post("/webhook")
def webhook_payment():
    body = request.get_json(silent=True) or {}
    shared_secret = (Config.TRON_WEBHOOK_SECRET or "").strip()
    if not shared_secret:
        return fail("WEBHOOK_DISABLED", "TRON_WEBHOOK_SECRET is not configured", 501)

    provided_secret = (request.headers.get("X-SNE-WEBHOOK-SECRET") or "").strip()
    if provided_secret != shared_secret:
        return fail("FORBIDDEN", "Invalid webhook secret", 403)

    order_id = body.get("orderId")
    tx_hash = body.get("txHash")
    if not order_id or not tx_hash:
        return fail("BAD_REQUEST", "orderId and txHash are required", 400)

    try:
        order = reconcile_tron_payment(
            order_id=order_id,
            tx_hash=tx_hash,
            trusted=True,
            auto_process=bool(body.get("autoProcess", True)),
        )
        return jsonify(order), 200
    except CheckoutError as exc:
        return fail(exc.code, exc.message, exc.status, **(exc.details or {}))
    except Exception as exc:
        logger.error("Tron payment webhook failed: %s", exc, exc_info=True)
        return fail("INTERNAL_ERROR", "Failed to process Tron webhook", 500)

