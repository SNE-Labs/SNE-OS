"""
Tron payment verification and reconciliation for ActivationOrder.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
import hashlib
import json
import logging
from typing import Any, Optional

import requests
from web3 import Web3

from .checkout_service import CheckoutError, serialize_activation_order
from .config import Config
from .extensions import db
from .models import ActivationOrder

logger = logging.getLogger(__name__)

_BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_BASE58_INDEX = {char: index for index, char in enumerate(_BASE58_ALPHABET)}
_TRANSFER_TOPIC = Web3.keccak(text="Transfer(address,address,uint256)").hex().removeprefix("0x").lower()
_RECONCILABLE_STATUSES = {
    "awaiting_payment",
    "payment_seen",
    "payment_confirmed",
    "activation_pending",
    "activation_submitted",
    "activation_failed",
}


def _utcnow() -> datetime:
    return datetime.utcnow()


def _normalize_tx_hash(tx_hash: Optional[str]) -> str:
    candidate = (tx_hash or "").strip().lower()
    if candidate.startswith("0x"):
        candidate = candidate[2:]
    if len(candidate) != 64 or any(char not in "0123456789abcdef" for char in candidate):
        raise CheckoutError("BAD_REQUEST", "Invalid txHash", 400, {"field": "txHash"})
    return candidate


def _base58check_decode(value: str) -> bytes:
    number = 0
    for char in value:
        if char not in _BASE58_INDEX:
            raise CheckoutError("BAD_REQUEST", "Invalid Tron address encoding", 400)
        number = number * 58 + _BASE58_INDEX[char]

    full_bytes = number.to_bytes((number.bit_length() + 7) // 8, "big") if number else b""
    leading_zeroes = len(value) - len(value.lstrip("1"))
    payload = (b"\x00" * leading_zeroes) + full_bytes
    if len(payload) < 5:
        raise CheckoutError("BAD_REQUEST", "Invalid Tron address length", 400)

    data, checksum = payload[:-4], payload[-4:]
    computed = hashlib.sha256(hashlib.sha256(data).digest()).digest()[:4]
    if checksum != computed:
        raise CheckoutError("BAD_REQUEST", "Invalid Tron address checksum", 400)
    return data


def _tron_address_to_hex41(address: str) -> str:
    decoded = _base58check_decode(address)
    if len(decoded) != 21 or decoded[0] != 0x41:
        raise CheckoutError("BAD_REQUEST", "Invalid Tron address payload", 400)
    return decoded.hex().lower()


def _tron_address_to_topic20(address: str) -> str:
    return _tron_address_to_hex41(address)[2:]


def _normalize_hex(value: Any) -> str:
    candidate = str(value or "").strip().lower()
    if candidate.startswith("0x"):
        candidate = candidate[2:]
    return candidate


def _tron_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if Config.TRON_API_KEY:
        headers["TRON-PRO-API-KEY"] = Config.TRON_API_KEY
    return headers


def _tron_rpc_url() -> str:
    rpc_url = (Config.TRON_RPC_URL or "").strip().rstrip("/")
    if not rpc_url:
        raise CheckoutError("CONFIG_ERROR", "TRON_RPC_URL is not configured", 500)
    return rpc_url


def _tron_post(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = f"{_tron_rpc_url()}{path}"
    try:
        response = requests.post(
            url,
            headers=_tron_headers(),
            json=payload,
            timeout=Config.TRON_HTTP_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        raise CheckoutError("TRON_RPC_ERROR", "Failed to query Tron RPC", 502, {"path": path}) from exc
    except json.JSONDecodeError as exc:
        raise CheckoutError("TRON_RPC_ERROR", "Invalid Tron RPC response", 502, {"path": path}) from exc


def _fetch_tron_transaction(tx_hash: str) -> tuple[dict[str, Any], dict[str, Any]]:
    transaction = _tron_post("/wallet/gettransactionbyid", {"value": tx_hash})
    if not transaction:
        raise CheckoutError("PAYMENT_NOT_FOUND", "Tron transaction not found", 404, {"txHash": tx_hash})

    transaction_info = _tron_post("/walletsolidity/gettransactioninfobyid", {"value": tx_hash})
    if not transaction_info:
        raise CheckoutError("PAYMENT_NOT_CONFIRMED", "Tron transaction is not confirmed yet", 409, {"txHash": tx_hash})

    return transaction, transaction_info


def _expected_amount_units(order: ActivationOrder) -> int:
    decimals = Config.TRON_USDT_DECIMALS
    scale = Decimal(10) ** decimals
    return int((order.expected_amount * scale).quantize(Decimal("1")))


def _verify_contract_call(transaction: dict[str, Any], buyer_hex41: str, contract_hex41: str) -> None:
    raw_contracts = ((transaction.get("raw_data") or {}).get("contract") or [])
    if not raw_contracts:
        raise CheckoutError("PAYMENT_INVALID", "Tron transaction has no contract payload", 409)

    first_contract = raw_contracts[0]
    if first_contract.get("type") != "TriggerSmartContract":
        raise CheckoutError("PAYMENT_INVALID", "Tron transaction is not a smart-contract transfer", 409)

    parameter_value = ((first_contract.get("parameter") or {}).get("value") or {})
    tx_buyer = _normalize_hex(parameter_value.get("owner_address"))
    tx_contract = _normalize_hex(parameter_value.get("contract_address"))

    if tx_buyer != buyer_hex41:
        raise CheckoutError("PAYMENT_BUYER_MISMATCH", "Tron payment was not sent by the bound buyer wallet", 409)
    if tx_contract != contract_hex41:
        raise CheckoutError("PAYMENT_ASSET_MISMATCH", "Tron payment used an unexpected asset contract", 409)


def _verify_transfer_log(
    transaction_info: dict[str, Any],
    *,
    buyer_address: str,
    treasury_address: str,
    contract_address: str,
    expected_amount_units: int,
) -> dict[str, Any]:
    receipt = transaction_info.get("receipt") or {}
    if receipt.get("result") != "SUCCESS":
        raise CheckoutError("PAYMENT_NOT_CONFIRMED", "Tron payment execution did not succeed", 409)

    buyer_topic = _tron_address_to_topic20(buyer_address)
    treasury_topic = _tron_address_to_topic20(treasury_address)
    contract_hex41 = _tron_address_to_hex41(contract_address)

    for log_entry in transaction_info.get("log") or []:
        log_address = _normalize_hex(log_entry.get("address"))
        topics = [_normalize_hex(topic) for topic in (log_entry.get("topics") or [])]
        if not topics or topics[0] != _TRANSFER_TOPIC:
            continue
        if log_address != contract_hex41:
            continue

        from_topic = topics[1][-40:] if len(topics) > 1 else ""
        to_topic = topics[2][-40:] if len(topics) > 2 else ""
        value_hex = _normalize_hex(log_entry.get("data"))
        if not value_hex:
            continue

        transfer_amount = int(value_hex, 16)
        if from_topic == buyer_topic and to_topic == treasury_topic and transfer_amount == expected_amount_units:
            return {
                "blockNumber": transaction_info.get("blockNumber"),
                "from": buyer_address,
                "to": treasury_address,
                "contract": contract_address,
                "amountUnits": str(transfer_amount),
            }

    raise CheckoutError(
        "PAYMENT_TRANSFER_NOT_FOUND",
        "Tron transaction does not contain the expected USDT transfer",
        409,
    )


def _load_owned_order(order_id: str, auth_address: str) -> ActivationOrder:
    order = ActivationOrder.query.filter_by(id=order_id).first()
    if not order:
        raise CheckoutError("NOT_FOUND", "Activation order not found", 404, {"orderId": order_id})
    if order.created_by_address.lower() != auth_address.lower():
        raise CheckoutError("FORBIDDEN", "Order does not belong to the active wallet", 403, {"orderId": order_id})
    return order


def _load_order(order_id: str) -> ActivationOrder:
    order = ActivationOrder.query.filter_by(id=order_id).first()
    if not order:
        raise CheckoutError("NOT_FOUND", "Activation order not found", 404, {"orderId": order_id})
    return order


def reconcile_tron_payment(
    *,
    order_id: str,
    tx_hash: str,
    auth_address: Optional[str] = None,
    auto_process: bool = True,
    trusted: bool = False,
) -> dict[str, Any]:
    order = _load_order(order_id) if trusted else _load_owned_order(order_id, auth_address or "")
    normalized_tx_hash = _normalize_tx_hash(tx_hash)

    if order.status == "activated":
        if order.payment_tx_hash and _normalize_hex(order.payment_tx_hash) not in {"", normalized_tx_hash}:
            raise CheckoutError("TX_HASH_CONFLICT", "Order already bound to another transaction hash", 409)
        return serialize_activation_order(order)

    if order.status not in _RECONCILABLE_STATUSES:
        raise CheckoutError("INVALID_ORDER_STATE", "Order is not ready for Tron reconciliation", 409, {"status": order.status})

    if not order.buyer_tron_address:
        raise CheckoutError("ORDER_NOT_BOUND", "Bind a Tron buyer wallet before reconciling payment", 409)

    if order.payment_tx_hash and _normalize_hex(order.payment_tx_hash) not in {"", normalized_tx_hash}:
        raise CheckoutError("TX_HASH_CONFLICT", "Order already bound to another transaction hash", 409)

    duplicate_order = (
        ActivationOrder.query
        .filter(ActivationOrder.id != order.id, ActivationOrder.payment_tx_hash == normalized_tx_hash)
        .first()
    )
    if duplicate_order:
        raise CheckoutError("PAYMENT_ALREADY_USED", "This Tron payment is already linked to another order", 409)

    treasury_address = (Config.TRON_TREASURY_ADDRESS or "").strip()
    contract_address = (Config.TRON_USDT_CONTRACT or "").strip()
    if not treasury_address or not contract_address:
        raise CheckoutError("CONFIG_ERROR", "Tron treasury or USDT contract is not configured", 500)

    transaction, transaction_info = _fetch_tron_transaction(normalized_tx_hash)
    buyer_hex41 = _tron_address_to_hex41(order.buyer_tron_address)
    contract_hex41 = _tron_address_to_hex41(contract_address)
    _verify_contract_call(transaction, buyer_hex41, contract_hex41)

    verification = _verify_transfer_log(
        transaction_info,
        buyer_address=order.buyer_tron_address,
        treasury_address=treasury_address,
        contract_address=contract_address,
        expected_amount_units=_expected_amount_units(order),
    )

    metadata = dict(order.session_metadata or {})
    metadata["tronPayment"] = {
        "verifiedAt": _utcnow().isoformat(),
        "txHash": normalized_tx_hash,
        **verification,
    }

    order.payment_tx_hash = normalized_tx_hash
    order.received_amount = order.expected_amount
    order.payment_confirmed_at = _utcnow()
    order.status = "payment_confirmed"
    order.session_metadata = metadata
    order.updated_at = _utcnow()

    db.session.commit()

    if auto_process:
        from .activation_service import process_activation_order

        return process_activation_order(
            order_id=order.id,
            auth_address=auth_address if not trusted else None,
            trusted=trusted,
        )

    return serialize_activation_order(order)

