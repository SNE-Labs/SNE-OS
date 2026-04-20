"""
Checkout service for sovereign Tron purchase orders and Arbitrum activation targets.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
import re
import uuid

from .config import Config
from .extensions import db
from .models import ActivationOrder

EVM_ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")
TRON_ADDRESS_RE = re.compile(r"^T[1-9A-HJ-NP-Za-km-z]{33}$")

FINAL_ORDER_STATUSES = {"activated", "cancelled", "refunded"}
TRON_SESSION_ALLOWED_STATUSES = {"created", "awaiting_payment"}
CANCELLABLE_ORDER_STATUSES = {"created", "awaiting_payment"}


@dataclass
class CheckoutError(Exception):
    code: str
    message: str
    status: int = 400
    details: dict | None = None


def _utcnow() -> datetime:
    return datetime.utcnow()


def _normalize_evm_address(value: str | None, field_name: str) -> str:
    candidate = (value or "").strip()
    if not EVM_ADDRESS_RE.fullmatch(candidate):
        raise CheckoutError("BAD_REQUEST", f"Invalid {field_name}", 400, {"field": field_name})
    return candidate.lower()


def _normalize_tron_address(value: str | None) -> str:
    candidate = (value or "").strip()
    if not TRON_ADDRESS_RE.fullmatch(candidate):
        raise CheckoutError("BAD_REQUEST", "Invalid buyerTronAddress", 400, {"field": "buyerTronAddress"})
    return candidate


def _normalize_amount(value: str | int | float | Decimal) -> Decimal:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise CheckoutError("CONFIG_ERROR", "Invalid checkout amount configuration", 500) from exc
    return amount.quantize(Decimal("0.000001"))


def _decimal_to_string(value: Decimal | None) -> str | None:
    if value is None:
        return None
    normalized = value.quantize(Decimal("0.000001"))
    return format(normalized, "f")


def _resolve_product_definition(product_code: str | None) -> dict:
    canonical_code = Config.SNE_CHECKOUT_PRODUCT_CODE
    if product_code and product_code != canonical_code:
        raise CheckoutError(
            "UNSUPPORTED_PRODUCT",
            "Only the Operator Key checkout flow is available in this phase",
            400,
            {"productCode": product_code},
        )

    return {
        "productCode": canonical_code,
        "label": "Operator Key",
        "accessClass": "operator",
        "paymentChain": Config.SNE_CHECKOUT_PAYMENT_CHAIN,
        "paymentAsset": Config.SNE_CHECKOUT_PAYMENT_ASSET,
        "activationChain": Config.SNE_CHECKOUT_ACTIVATION_CHAIN,
        "expectedAmount": _normalize_amount(Config.SNE_CHECKOUT_OPERATOR_PRICE_USDT),
    }


def _payment_instructions(order: ActivationOrder) -> dict:
    return {
        "chain": order.payment_chain,
        "asset": order.payment_asset,
        "expectedAmount": _decimal_to_string(order.expected_amount),
        "buyerTronAddress": order.buyer_tron_address,
        "treasuryAddress": Config.TRON_TREASURY_ADDRESS,
        "assetContract": Config.TRON_USDT_CONTRACT,
        "assetDecimals": Config.TRON_USDT_DECIMALS,
        "rpcUrl": Config.TRON_RPC_URL,
    }


def serialize_activation_order(order: ActivationOrder) -> dict:
    metadata = order.session_metadata or {}
    return {
        "id": order.id,
        "status": order.status,
        "productCode": order.product_code,
        "createdByAddress": order.created_by_address,
        "buyerTronAddress": order.buyer_tron_address,
        "targetArbitrumAddress": order.target_arbitrum_address,
        "paymentChain": order.payment_chain,
        "paymentAsset": order.payment_asset,
        "expectedAmount": _decimal_to_string(order.expected_amount),
        "receivedAmount": _decimal_to_string(order.received_amount),
        "paymentTxHash": order.payment_tx_hash,
        "paymentConfirmedAt": order.payment_confirmed_at.isoformat() if order.payment_confirmed_at else None,
        "activationChain": order.activation_chain,
        "activationTxHash": order.activation_tx_hash,
        "activationAttempts": order.activation_attempts,
        "idempotencyKey": order.idempotency_key,
        "errorCode": order.error_code,
        "errorMessage": order.error_message,
        "createdAt": order.created_at.isoformat() if order.created_at else None,
        "updatedAt": order.updated_at.isoformat() if order.updated_at else None,
        "product": {
            "code": order.product_code,
            "label": "Operator Key",
            "accessClass": "operator",
        },
        "payment": {
            **_payment_instructions(order),
            "txHash": order.payment_tx_hash,
            "confirmedAt": order.payment_confirmed_at.isoformat() if order.payment_confirmed_at else None,
        },
        "activation": {
            "chain": order.activation_chain,
            "targetAddress": order.target_arbitrum_address,
            "txHash": order.activation_tx_hash,
            "attempts": order.activation_attempts,
        },
        "session": {
            "walletProvider": metadata.get("walletProvider"),
            "paymentMode": metadata.get("paymentMode") or metadata.get("gasMode"),
            "authSource": metadata.get("authSource"),
            "cancelReason": metadata.get("cancelReason"),
        },
    }


def _require_owned_order(order_id: str, auth_address: str) -> ActivationOrder:
    order = ActivationOrder.query.filter_by(id=order_id).first()
    if not order:
        raise CheckoutError("NOT_FOUND", "Activation order not found", 404, {"orderId": order_id})

    if order.created_by_address.lower() != auth_address.lower():
        raise CheckoutError("FORBIDDEN", "Order does not belong to the active wallet", 403, {"orderId": order_id})

    return order


def create_activation_order(
    *,
    auth_address: str,
    product_code: str | None,
    target_arbitrum_address: str | None,
    idempotency_key: str | None,
    auth_source: str | None,
) -> dict:
    creator_address = _normalize_evm_address(auth_address, "address")
    target_address = _normalize_evm_address(target_arbitrum_address or auth_address, "targetArbitrumAddress")
    product = _resolve_product_definition(product_code)
    resolved_idempotency_key = (idempotency_key or f"idem_{uuid.uuid4().hex}").strip()

    if not resolved_idempotency_key:
        raise CheckoutError("BAD_REQUEST", "Missing idempotencyKey", 400, {"field": "idempotencyKey"})

    existing = ActivationOrder.query.filter_by(idempotency_key=resolved_idempotency_key).first()
    if existing:
        if existing.created_by_address.lower() != creator_address:
            raise CheckoutError("IDEMPOTENCY_CONFLICT", "Idempotency key already belongs to another wallet", 409)
        return serialize_activation_order(existing)

    order = ActivationOrder(
        created_by_address=creator_address,
        product_code=product["productCode"],
        status="created",
        target_arbitrum_address=target_address,
        payment_chain=product["paymentChain"],
        payment_asset=product["paymentAsset"],
        expected_amount=product["expectedAmount"],
        activation_chain=product["activationChain"],
        idempotency_key=resolved_idempotency_key,
        session_metadata={
            "authSource": auth_source or "unknown",
        },
    )
    db.session.add(order)
    db.session.commit()
    return serialize_activation_order(order)


def get_activation_order(*, order_id: str, auth_address: str) -> dict:
    order = _require_owned_order(order_id, auth_address)
    return serialize_activation_order(order)


def create_tron_session(
    *,
    order_id: str,
    auth_address: str,
    buyer_tron_address: str | None,
    wallet_provider: str | None,
    payment_mode: str | None,
) -> dict:
    order = _require_owned_order(order_id, auth_address)

    if order.status in FINAL_ORDER_STATUSES:
        raise CheckoutError("ORDER_FINALIZED", "Order is already finalized", 409, {"status": order.status})

    if order.status not in TRON_SESSION_ALLOWED_STATUSES:
        raise CheckoutError("INVALID_ORDER_STATE", "Order is not ready for a Tron payment session", 409, {"status": order.status})

    if order.payment_tx_hash or order.payment_confirmed_at:
        raise CheckoutError("PAYMENT_ALREADY_BOUND", "Order already has a payment attached", 409, {"orderId": order.id})

    metadata = dict(order.session_metadata or {})
    metadata["walletProvider"] = (wallet_provider or "tronlink").strip().lower()
    metadata["paymentMode"] = (payment_mode or "wallet_signed_transfer").strip().lower()
    metadata.pop("gasMode", None)
    metadata["tronSessionCreatedAt"] = _utcnow().isoformat()

    order.buyer_tron_address = _normalize_tron_address(buyer_tron_address)
    order.status = "awaiting_payment"
    order.session_metadata = metadata
    order.updated_at = _utcnow()

    db.session.commit()
    return serialize_activation_order(order)


def cancel_activation_order(*, order_id: str, auth_address: str, cancel_reason: str | None) -> dict:
    order = _require_owned_order(order_id, auth_address)

    if order.status in FINAL_ORDER_STATUSES:
        return serialize_activation_order(order)

    if order.status not in CANCELLABLE_ORDER_STATUSES:
        raise CheckoutError("INVALID_ORDER_STATE", "Order can no longer be cancelled from this state", 409, {"status": order.status})

    if order.payment_tx_hash or order.payment_confirmed_at:
        raise CheckoutError("PAYMENT_ALREADY_SEEN", "Order already has payment activity and cannot be cancelled here", 409)

    metadata = dict(order.session_metadata or {})
    if cancel_reason:
        metadata["cancelReason"] = cancel_reason.strip()

    order.status = "cancelled"
    order.session_metadata = metadata
    order.updated_at = _utcnow()

    db.session.commit()
    return serialize_activation_order(order)
