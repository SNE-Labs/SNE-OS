"""
Activation service that mints Operator Keys on Arbitrum after Tron payment confirmation.
"""

from __future__ import annotations

from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Any, Optional

from eth_account import Account
from web3 import Web3

from .checkout_service import CheckoutError, serialize_activation_order
from .config import Config
from .extensions import db
from .models import ActivationOrder
from .networks import get_evm_rpc_urls
from .keys_entitlement_service import build_keys_entitlement

logger = logging.getLogger(__name__)

_ACTIVATABLE_STATUSES = {"payment_confirmed", "activation_pending", "activation_failed"}

_OPERATOR_KEY_WRITE_ABI = [
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "saleController",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "nextSaleController", "type": "address"}],
        "name": "setSaleController",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
        ],
        "name": "mintOperator",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


def _utcnow() -> datetime:
    return datetime.utcnow()


def _load_order(order_id: str, auth_address: Optional[str], trusted: bool) -> ActivationOrder:
    order = ActivationOrder.query.filter_by(id=order_id).first()
    if not order:
        raise CheckoutError("NOT_FOUND", "Activation order not found", 404, {"orderId": order_id})
    if not trusted and auth_address and order.created_by_address.lower() != auth_address.lower():
        raise CheckoutError("FORBIDDEN", "Order does not belong to the active wallet", 403, {"orderId": order_id})
    return order


def _contracts_root() -> Path:
    return Path(__file__).resolve().parents[4] / "contracts"


def _load_deployment_manifest(network_key: str) -> dict[str, Any]:
    env_path = (Config.SNE_KEYS_DEPLOYMENT_PATH or "").strip()
    manifest_path = Path(env_path) if env_path else (_contracts_root() / "deployments" / f"{network_key}.json")
    try:
        if not manifest_path.exists():
            return {}
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Failed to load deployment manifest from %s: %s", manifest_path, exc)
        return {}


def _operator_key_contract(order: ActivationOrder) -> str:
    direct_value = (Config.SNE_OPERATOR_KEY_CONTRACT or "").strip()
    if direct_value:
        return Web3.to_checksum_address(direct_value)

    manifest = _load_deployment_manifest(order.activation_chain)
    manifest_value = manifest.get("operatorKey")
    if manifest_value:
        return Web3.to_checksum_address(str(manifest_value))

    raise CheckoutError("CONFIG_ERROR", "Operator Key contract is not configured for activation", 500)


def _activation_account():
    private_key = (Config.SNE_ACTIVATION_PRIVATE_KEY or "").strip()
    if not private_key:
        raise CheckoutError("CONFIG_ERROR", "SNE_ACTIVATION_PRIVATE_KEY is not configured", 500)
    return Account.from_key(private_key)


def _activation_web3(network_key: str) -> Web3:
    rpc_urls = get_evm_rpc_urls(network_key)
    if not rpc_urls:
        raise CheckoutError("CONFIG_ERROR", f"No RPC URLs configured for {network_key}", 500)

    last_error: Optional[Exception] = None
    for rpc_url in rpc_urls:
        try:
            provider = Web3.HTTPProvider(rpc_url)
            w3 = Web3(provider)
            if w3.is_connected():
                return w3
        except Exception as exc:
            last_error = exc

    raise CheckoutError("RPC_ERROR", f"Failed to connect to {network_key} RPC", 502, {"error": str(last_error) if last_error else None})


def _build_tx_params(w3: Web3, signer_address: str, nonce: int, gas_estimate: int) -> dict[str, Any]:
    tx: dict[str, Any] = {
        "from": signer_address,
        "nonce": nonce,
        "chainId": w3.eth.chain_id,
        "gas": max(int(gas_estimate * 1.2), gas_estimate + 25_000),
    }
    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas")
    if base_fee is not None:
        priority_fee = w3.to_wei(0.1, "gwei")
        tx["maxPriorityFeePerGas"] = priority_fee
        tx["maxFeePerGas"] = int(base_fee * 2 + priority_fee)
    else:
        tx["gasPrice"] = w3.eth.gas_price
    return tx


def _send_contract_transaction(w3: Web3, signer, function_call, nonce: int) -> tuple[str, int]:
    signer_address = Web3.to_checksum_address(signer.address)
    try:
        gas_estimate = int(function_call.estimate_gas({"from": signer_address}))
    except Exception:
        gas_estimate = 250_000

    tx = function_call.build_transaction(_build_tx_params(w3, signer_address, nonce, gas_estimate))
    signed = signer.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    if receipt.status != 1:
        raise CheckoutError("ACTIVATION_TX_REVERTED", "Activation transaction reverted on-chain", 502)
    return tx_hash.hex(), nonce + 1


def process_activation_order(*, order_id: str, auth_address: Optional[str], trusted: bool = False) -> dict[str, Any]:
    order = _load_order(order_id, auth_address, trusted)

    if order.status == "activated":
        return serialize_activation_order(order)

    if order.status not in _ACTIVATABLE_STATUSES:
        raise CheckoutError("INVALID_ORDER_STATE", "Order is not ready for activation", 409, {"status": order.status})

    if not order.payment_confirmed_at or not order.payment_tx_hash:
        raise CheckoutError("PAYMENT_NOT_CONFIRMED", "Order has no confirmed Tron payment yet", 409)

    entitlement = build_keys_entitlement(order.target_arbitrum_address)
    if entitlement.get("hasOperatorKey"):
        metadata = dict(order.session_metadata or {})
        metadata["activation"] = {
            **(metadata.get("activation") or {}),
            "skippedAt": _utcnow().isoformat(),
            "skipReason": "target_already_has_operator_key",
        }
        order.status = "activation_failed"
        order.error_code = "TARGET_ALREADY_HAS_KEY"
        order.error_message = "Target wallet already holds an Operator Key"
        order.session_metadata = metadata
        order.updated_at = _utcnow()
        db.session.commit()
        raise CheckoutError("TARGET_ALREADY_HAS_KEY", "Target wallet already has an Operator Key", 409)

    signer = _activation_account()
    w3 = _activation_web3(order.activation_chain)
    operator_key_address = _operator_key_contract(order)
    operator_key = w3.eth.contract(address=operator_key_address, abi=_OPERATOR_KEY_WRITE_ABI)
    signer_address = Web3.to_checksum_address(signer.address)
    target_address = Web3.to_checksum_address(order.target_arbitrum_address)
    nonce = w3.eth.get_transaction_count(signer_address, "pending")

    owner_address = operator_key.functions.owner().call()
    current_sale_controller = operator_key.functions.saleController().call()

    order.status = "activation_pending"
    order.activation_attempts = int(order.activation_attempts or 0) + 1
    order.updated_at = _utcnow()
    db.session.commit()

    previous_controller = Web3.to_checksum_address(current_sale_controller)
    restore_required = False

    try:
        if signer_address.lower() != previous_controller.lower():
            if signer_address.lower() != Web3.to_checksum_address(owner_address).lower():
                raise CheckoutError(
                    "ACTIVATION_SIGNER_INVALID",
                    "Activation signer must be the current sale controller or the Operator Key owner",
                    500,
                )
            _, nonce = _send_contract_transaction(
                w3,
                signer,
                operator_key.functions.setSaleController(signer_address),
                nonce,
            )
            restore_required = Config.SNE_ACTIVATION_RESTORE_CONTROLLER and previous_controller.lower() != signer_address.lower()

        tx_hash, nonce = _send_contract_transaction(
            w3,
            signer,
            operator_key.functions.mintOperator(target_address, Config.SNE_ACTIVATION_MINT_AMOUNT),
            nonce,
        )

        if restore_required:
            try:
                _, nonce = _send_contract_transaction(
                    w3,
                    signer,
                    operator_key.functions.setSaleController(previous_controller),
                    nonce,
                )
            except Exception as restore_exc:
                logger.error("Failed to restore OperatorKey sale controller: %s", restore_exc, exc_info=True)

        confirmation = build_keys_entitlement(order.target_arbitrum_address)
        if not confirmation.get("hasOperatorKey"):
            raise CheckoutError("ACTIVATION_NOT_VISIBLE", "Mint transaction succeeded but entitlement is not yet visible", 502)

        metadata = dict(order.session_metadata or {})
        metadata["activation"] = {
            "processedAt": _utcnow().isoformat(),
            "targetAddress": target_address,
            "operatorKeyContract": operator_key_address,
            "previousSaleController": previous_controller,
            "restoredController": restore_required,
        }

        order.status = "activated"
        order.activation_tx_hash = tx_hash
        order.error_code = None
        order.error_message = None
        order.session_metadata = metadata
        order.updated_at = _utcnow()
        db.session.commit()
        return serialize_activation_order(order)

    except CheckoutError as exc:
        order.status = "activation_failed"
        order.error_code = exc.code
        order.error_message = exc.message
        order.updated_at = _utcnow()
        db.session.commit()
        raise
    except Exception as exc:
        logger.error("Activation processing failed for %s: %s", order.id, exc, exc_info=True)
        order.status = "activation_failed"
        order.error_code = "ACTIVATION_FAILED"
        order.error_message = str(exc)
        order.updated_at = _utcnow()
        db.session.commit()
        raise CheckoutError("ACTIVATION_FAILED", "Failed to activate Operator Key on Arbitrum", 502) from exc

