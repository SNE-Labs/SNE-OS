"""
Operator Cockpit aggregation for SNE Keys.

This payload is intentionally read-only. It centralizes entitlement, contract,
checkout, activation, and indexer state so the UI does not need to infer access
flow from multiple partial endpoints.
"""

from __future__ import annotations

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional

from .checkout_service import FINAL_ORDER_STATUSES, serialize_activation_order
from .config import Config
from .keys_contract_service import read_keys_contracts_status
from .keys_entitlement_service import build_keys_entitlement
from .models import ActivationOrder

logger = logging.getLogger(__name__)


def _utcnow_iso() -> str:
    return datetime.utcnow().isoformat()


def _normalize_address(value: Optional[str]) -> Optional[str]:
    candidate = (value or "").strip()
    return candidate.lower() if candidate else None


def _empty_entitlement(address: Optional[str], error: Optional[str] = None) -> Dict[str, Any]:
    wallet = _normalize_address(address)
    return {
        "wallet": wallet,
        "ownerWallet": None,
        "delegateWallet": None,
        "hasOperatorKey": False,
        "accessClass": "none",
        "effectiveAccess": False,
        "feeTier": "standard",
        "feePolicy": {
            "tier": "standard",
            "discountBps": 0,
            "label": "Standard",
            "reason": "fallback",
        },
        "source": "fallback",
        "lastIndexedBlock": None,
        "contractsConfigured": False,
        "checkedAt": _utcnow_iso(),
        "indexer": {
            "mode": "fallback",
            "healthy": False,
            "source": "fallback",
            "lastIndexedBlock": None,
        },
        "error": error,
    }


def _empty_contracts(error: Optional[str] = None) -> Dict[str, Any]:
    return {
        "network": Config.SNE_KEYS_NETWORK or "arbitrum",
        "configured": False,
        "source": "fallback",
        "operatorKey": None,
        "keySale": None,
        "delegationRegistry": None,
        "legacyRegistry": None,
        "usdt": None,
        "treasury": None,
        "operatorPriceUnits": None,
        "operatorPriceDisplay": None,
        "keySalePaused": None,
        "saleController": None,
        "latestBlock": None,
        "manifestNetwork": None,
        "error": error,
    }


def build_operator_cockpit_fallback(address: Optional[str] = None, error: Optional[str] = None) -> Dict[str, Any]:
    entitlement = _empty_entitlement(address, error)
    contracts = _empty_contracts(error)
    wallet = entitlement.get("wallet")
    indexer = entitlement["indexer"]
    checkout = {
        "available": False,
        "productCode": Config.SNE_CHECKOUT_PRODUCT_CODE,
        "productLabel": "Operator Key",
        "price": {
            "amount": str(Config.SNE_CHECKOUT_OPERATOR_PRICE_USDT),
            "asset": Config.SNE_CHECKOUT_PAYMENT_ASSET.upper(),
            "chain": Config.SNE_CHECKOUT_PAYMENT_CHAIN,
        },
        "pendingOrder": None,
        "recentOrders": [],
        "lastPayment": None,
        "lastActivation": None,
    }
    return {
        "session": {
            "authenticated": False,
            "address": wallet,
            "role": "discovery" if wallet else "anonymous",
        },
        "entitlement": entitlement,
        "contracts": contracts,
        "indexer": indexer,
        "checkout": checkout,
        "timeline": [
            _timeline_event(
                "operator_cockpit_fallback",
                "Operator Cockpit fallback",
                "warning",
                entitlement.get("checkedAt"),
                detail=error or "Fallback sem dependências externas",
            )
        ],
        "nextAction": {
            "state": "indexer_degraded",
            "label": "Revalidar entitlement",
            "href": "/keys",
            "priority": "high",
        },
        "lastUpdated": _utcnow_iso(),
    }


def _session_role(wallet: Optional[str], entitlement: Dict[str, Any]) -> str:
    if not wallet:
        return "anonymous"

    normalized_wallet = wallet.lower()
    owner_wallet = _normalize_address(entitlement.get("ownerWallet"))
    delegate_wallet = _normalize_address(entitlement.get("delegateWallet"))

    if entitlement.get("effectiveAccess") and owner_wallet == normalized_wallet:
        return "owner"
    if entitlement.get("effectiveAccess") and delegate_wallet == normalized_wallet:
        return "delegate"
    return "discovery"


def _safe_recent_orders(address: Optional[str], limit: int = 5) -> List[Dict[str, Any]]:
    wallet = _normalize_address(address)
    if not wallet:
        return []

    try:
        orders = (
            ActivationOrder.query.filter(ActivationOrder.created_by_address == wallet)
            .order_by(ActivationOrder.updated_at.desc())
            .limit(limit)
            .all()
        )
        return [serialize_activation_order(order) for order in orders]
    except Exception as exc:
        logger.warning("Failed to load Operator checkout orders for %s: %s", wallet, exc)
        return []


def _first_pending_order(orders: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    return next((order for order in orders if order.get("status") not in FINAL_ORDER_STATUSES), None)


def _last_payment(orders: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    for order in orders:
        payment = order.get("payment") or {}
        if payment.get("txHash"):
            return {
                "orderId": order.get("id"),
                "status": order.get("status"),
                "txHash": payment.get("txHash"),
                "confirmedAt": payment.get("confirmedAt"),
                "amount": order.get("receivedAmount") or order.get("expectedAmount"),
                "chain": payment.get("chain"),
                "asset": payment.get("asset"),
            }
    return None


def _last_activation(orders: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    for order in orders:
        activation = order.get("activation") or {}
        if order.get("activationTxHash") or activation.get("txHash"):
            return {
                "orderId": order.get("id"),
                "status": order.get("status"),
                "txHash": order.get("activationTxHash") or activation.get("txHash"),
                "state": activation.get("state"),
                "confirmedAt": activation.get("confirmedAt"),
                "processedAt": activation.get("processedAt"),
            }
    return None


def _timeline_event(
    kind: str,
    label: str,
    status: str,
    timestamp: Optional[str] = None,
    tx_hash: Optional[str] = None,
    detail: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "kind": kind,
        "label": label,
        "status": status,
        "timestamp": timestamp,
        "txHash": tx_hash,
        "detail": detail,
    }


def _order_timeline(order: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not order:
        return []

    events = [
        _timeline_event(
            "checkout_created",
            "Checkout iniciado",
            "complete",
            order.get("createdAt"),
            detail=order.get("id"),
        )
    ]

    if order.get("buyerTronAddress"):
        events.append(
            _timeline_event(
                "tron_session",
                "Sessão Tron vinculada",
                "complete",
                order.get("updatedAt"),
                detail=order.get("buyerTronAddress"),
            )
        )

    payment = order.get("payment") or {}
    if payment.get("txHash"):
        events.append(
            _timeline_event(
                "payment_confirmed" if payment.get("confirmedAt") else "payment_seen",
                "Pagamento USDT detectado",
                "complete" if payment.get("confirmedAt") else "pending",
                payment.get("confirmedAt") or payment.get("verifiedAt"),
                payment.get("txHash"),
            )
        )

    activation = order.get("activation") or {}
    activation_tx = order.get("activationTxHash")
    if activation_tx:
        events.append(
            _timeline_event(
                "activation_submitted",
                "Mint Operator submetido",
                "complete" if order.get("status") == "activated" else "pending",
                activation.get("submittedAt") or order.get("updatedAt"),
                activation_tx,
                activation.get("state"),
            )
        )

    if order.get("status") == "activated":
        events.append(
            _timeline_event(
                "activated",
                "Operator Key ativado",
                "complete",
                activation.get("confirmedAt") or order.get("updatedAt"),
                activation_tx,
            )
        )
    elif order.get("status") == "activation_failed":
        events.append(
            _timeline_event(
                "activation_failed",
                "Ativação falhou",
                "warning",
                activation.get("failedAt") or order.get("updatedAt"),
                activation_tx,
                order.get("errorMessage"),
            )
        )
    elif order.get("status") == "cancelled":
        events.append(
            _timeline_event(
                "checkout_cancelled",
                "Checkout cancelado",
                "warning",
                order.get("updatedAt"),
            )
        )

    return events


def _build_timeline(
    *,
    entitlement: Dict[str, Any],
    pending_order: Optional[Dict[str, Any]],
    last_order: Optional[Dict[str, Any]],
    indexer: Dict[str, Any],
) -> List[Dict[str, Any]]:
    base_order = pending_order or last_order
    events = _order_timeline(base_order)

    if entitlement.get("effectiveAccess"):
        events.append(
            _timeline_event(
                "entitlement_resolved",
                "Entitlement Operator resolvido",
                "complete",
                entitlement.get("checkedAt"),
                detail=entitlement.get("source"),
            )
        )
    elif entitlement.get("wallet"):
        events.append(
            _timeline_event(
                "entitlement_checked",
                "Entitlement verificado",
                "pending",
                entitlement.get("checkedAt"),
                detail="Sem acesso Operator efetivo",
            )
        )

    events.append(
        _timeline_event(
            "indexer_status",
            "Indexer de Keys",
            "complete" if indexer.get("healthy") else "warning",
            entitlement.get("checkedAt"),
            detail=f"{indexer.get('mode', 'unknown')} · bloco {indexer.get('lastIndexedBlock') or '--'}",
        )
    )

    return events[-10:]


def _next_action(
    *,
    wallet: Optional[str],
    role: str,
    entitlement: Dict[str, Any],
    contracts: Dict[str, Any],
    pending_order: Optional[Dict[str, Any]],
    indexer: Dict[str, Any],
) -> Dict[str, Any]:
    if not wallet:
        return {
            "state": "connect_wallet",
            "label": "Conectar wallet",
            "href": "/keys",
            "priority": "high",
        }

    if not contracts.get("configured") or not entitlement.get("contractsConfigured"):
        return {
            "state": "contracts_unconfigured",
            "label": "Configurar contratos",
            "href": "/status",
            "priority": "high",
        }

    if not indexer.get("healthy"):
        return {
            "state": "indexer_degraded",
            "label": "Revalidar entitlement",
            "href": "/keys",
            "priority": "high",
        }

    if pending_order:
        status = pending_order.get("status")
        if status in {"created", "awaiting_payment"}:
            return {
                "state": "continue_checkout",
                "label": "Continuar checkout",
                "href": "/keys",
                "priority": "high",
                "orderId": pending_order.get("id"),
            }
        if status in {"payment_confirmed", "activation_pending", "activation_submitted", "activation_failed"}:
            return {
                "state": "continue_activation",
                "label": "Continuar ativação",
                "href": "/keys",
                "priority": "high",
                "orderId": pending_order.get("id"),
            }

    if entitlement.get("effectiveAccess"):
        if role == "owner" and not entitlement.get("delegateWallet"):
            return {
                "state": "configure_delegate",
                "label": "Configurar delegate",
                "href": "/keys",
                "priority": "medium",
            }
        return {
            "state": "operator_ready",
            "label": "Abrir Swaps",
            "href": "/swaps",
            "priority": "medium",
        }

    return {
        "state": "buy_operator",
        "label": "Comprar Operator",
        "href": "/keys",
        "priority": "high",
    }


def build_operator_cockpit(
    address: Optional[str],
    authenticated: bool,
    include_private_orders: bool = False,
) -> Dict[str, Any]:
    try:
        entitlement = build_keys_entitlement(address)
    except Exception as exc:
        logger.warning("Operator cockpit entitlement fallback for %s: %s", address, exc)
        entitlement = _empty_entitlement(address, str(exc))

    try:
        contracts = read_keys_contracts_status()
    except Exception as exc:
        logger.warning("Operator cockpit contracts fallback: %s", exc)
        contracts = _empty_contracts(str(exc))

    wallet = entitlement.get("wallet") or _normalize_address(address)
    role = _session_role(wallet, entitlement)
    recent_orders = _safe_recent_orders(wallet) if include_private_orders else []
    pending_order = _first_pending_order(recent_orders)
    last_order = recent_orders[0] if recent_orders else None
    indexer = entitlement.get("indexer") or {}

    checkout = {
        "available": bool(wallet and contracts.get("configured") and not entitlement.get("effectiveAccess")),
        "productCode": Config.SNE_CHECKOUT_PRODUCT_CODE,
        "productLabel": "Operator Key",
        "price": {
            "amount": str(Config.SNE_CHECKOUT_OPERATOR_PRICE_USDT),
            "asset": Config.SNE_CHECKOUT_PAYMENT_ASSET.upper(),
            "chain": Config.SNE_CHECKOUT_PAYMENT_CHAIN,
        },
        "pendingOrder": pending_order,
        "recentOrders": recent_orders,
        "lastPayment": _last_payment(recent_orders),
        "lastActivation": _last_activation(recent_orders),
    }

    return {
        "session": {
            "authenticated": bool(authenticated),
            "address": wallet,
            "role": role,
        },
        "entitlement": entitlement,
        "contracts": contracts,
        "indexer": indexer,
        "checkout": checkout,
        "timeline": _build_timeline(
            entitlement=entitlement,
            pending_order=pending_order,
            last_order=last_order,
            indexer=indexer,
        ),
        "nextAction": _next_action(
            wallet=wallet,
            role=role,
            entitlement=entitlement,
            contracts=contracts,
            pending_order=pending_order,
            indexer=indexer,
        ),
        "lastUpdated": _utcnow_iso(),
    }
