"""
Direct on-chain reads for SNE Keys.

This service is intentionally conservative:
- on-chain (or direct RPC reads) decides
- unconfigured contracts never grant premium
- legacy registry support exists only as a transitional fallback
"""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

from web3.constants import ADDRESS_ZERO

from .networks import normalize_evm_address, with_evm_provider

logger = logging.getLogger(__name__)

_OPERATOR_KEY_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "account", "type": "address"},
            {"internalType": "uint256", "name": "id", "type": "uint256"},
        ],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "OPERATOR_KEY_ID",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

_DELEGATION_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "delegateOf",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "ownerOfDelegate",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "wallet", "type": "address"}],
        "name": "effectiveOwner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "wallet", "type": "address"}],
        "name": "hasEffectiveOperatorAccess",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
]

_KEY_SALE_ABI = [
    {
        "inputs": [],
        "name": "operatorPrice",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "paused",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "treasury",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "usdt",
        "outputs": [{"internalType": "contract IERC20", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
]


def _contracts_root() -> Path:
    return Path(__file__).resolve().parents[4] / "contracts"


@lru_cache(maxsize=1)
def _deployment_manifest() -> Dict[str, Any]:
    network = _keys_network()
    env_path = os.getenv("SNE_KEYS_DEPLOYMENT_PATH")
    default_path = _contracts_root() / "deployments" / f"{network}.json"
    manifest_path = Path(env_path) if env_path else default_path

    try:
        if not manifest_path.exists():
            return {}
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Failed to load SNE Keys deployment manifest from %s: %s", manifest_path, exc)
        return {}


@lru_cache(maxsize=1)
def _legacy_registry_abi() -> list[dict[str, Any]]:
    path = Path(os.getenv("SNE_KEYS_LEGACY_ABI_PATH", str(_contracts_root() / "SNELicenseRegistry.abi.json")))
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Failed to load legacy SNE registry ABI from %s: %s", path, exc)
        return []


def _clean_address(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if value == ADDRESS_ZERO:
        return None
    try:
        return normalize_evm_address(value)
    except Exception:
        return None


def _keys_network() -> str:
    return os.getenv("SNE_KEYS_NETWORK", os.getenv("DEFAULT_NETWORK", "arbitrum"))


def _env_or_manifest(env_key: str, manifest_key: str) -> Optional[str]:
    direct_value = os.getenv(env_key)
    if direct_value:
        return direct_value
    manifest = _deployment_manifest()
    value = manifest.get(manifest_key)
    return str(value) if value else None


def _operator_key_contract() -> Optional[str]:
    return _clean_address(_env_or_manifest("SNE_OPERATOR_KEY_CONTRACT", "operatorKey"))


def _delegation_registry_contract() -> Optional[str]:
    return _clean_address(_env_or_manifest("SNE_DELEGATION_REGISTRY_CONTRACT", "delegationRegistry"))


def _key_sale_contract() -> Optional[str]:
    return _clean_address(_env_or_manifest("SNE_KEYSALE_CONTRACT", "keySale"))


def _legacy_registry_contract() -> Optional[str]:
    return _clean_address(os.getenv("SNE_KEYS_LEGACY_REGISTRY_CONTRACT"))


def _manifest_value(key: str) -> Optional[str]:
    value = _deployment_manifest().get(key)
    return str(value) if value is not None else None


def read_keys_contracts_status() -> Dict[str, Any]:
    """Return best-effort contract configuration and sale state for cockpit UI."""
    network = _keys_network()
    manifest = _deployment_manifest()
    operator_key_contract = _operator_key_contract()
    delegation_registry_contract = _delegation_registry_contract()
    key_sale_contract = _key_sale_contract()
    legacy_registry_contract = _legacy_registry_contract()
    manifest_operator_price = _manifest_value("operatorPrice")
    configured = bool(operator_key_contract or legacy_registry_contract)

    status: Dict[str, Any] = {
        "network": network,
        "configured": configured,
        "source": "deployment_manifest" if manifest else "env" if configured else "unconfigured",
        "operatorKey": operator_key_contract,
        "keySale": key_sale_contract,
        "delegationRegistry": delegation_registry_contract,
        "legacyRegistry": legacy_registry_contract,
        "usdt": _clean_address(os.getenv("SNE_CHECKOUT_USDT_CONTRACT")) or _clean_address(_manifest_value("usdt")),
        "treasury": _clean_address(os.getenv("TRON_TREASURY_ADDRESS")) or _clean_address(_manifest_value("treasury")),
        "operatorPriceUnits": manifest_operator_price,
        "operatorPriceDisplay": None,
        "keySalePaused": None,
        "saleController": None,
        "latestBlock": None,
        "manifestNetwork": manifest.get("network"),
        "error": None,
    }

    if not operator_key_contract and not key_sale_contract:
        return status

    def _read(w3):
        status["latestBlock"] = int(w3.eth.block_number)

        if operator_key_contract:
            operator_key = w3.eth.contract(address=operator_key_contract, abi=[
                {
                    "inputs": [],
                    "name": "saleController",
                    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function",
                }
            ])
            status["saleController"] = _clean_address(operator_key.functions.saleController().call())

        if key_sale_contract:
            key_sale = w3.eth.contract(address=key_sale_contract, abi=_KEY_SALE_ABI)
            operator_price_units = int(key_sale.functions.operatorPrice().call())
            status["operatorPriceUnits"] = str(operator_price_units)
            status["operatorPriceDisplay"] = f"{operator_price_units / 1_000_000:.6f} USDT"
            status["keySalePaused"] = bool(key_sale.functions.paused().call())
            status["treasury"] = _clean_address(key_sale.functions.treasury().call())
            status["usdt"] = _clean_address(key_sale.functions.usdt().call())

        return status

    try:
        return with_evm_provider(network, _read)
    except Exception as exc:
        logger.warning("Failed to resolve keys contract status: %s", exc)
        status["error"] = str(exc)
        return status


def read_keys_snapshot(address: Optional[str]) -> Dict[str, Any]:
    wallet = _clean_address(address)
    if not wallet:
        return {
            "wallet": None,
            "ownerWallet": None,
            "delegateWallet": None,
            "hasOperatorKey": False,
            "accessClass": "none",
            "effectiveAccess": False,
            "source": "missing_wallet",
            "lastIndexedBlock": None,
            "contractsConfigured": False,
        }

    operator_key_contract = _operator_key_contract()
    delegation_registry_contract = _delegation_registry_contract()
    legacy_registry_contract = _legacy_registry_contract()

    if not operator_key_contract and not legacy_registry_contract:
        return {
            "wallet": wallet,
            "ownerWallet": None,
            "delegateWallet": None,
            "hasOperatorKey": False,
            "accessClass": "none",
            "effectiveAccess": False,
            "source": "unconfigured",
            "lastIndexedBlock": None,
            "contractsConfigured": False,
        }

    def _read(w3):
        latest_block = w3.eth.block_number

        if operator_key_contract:
            operator_key = w3.eth.contract(address=operator_key_contract, abi=_OPERATOR_KEY_ABI)
            operator_key_id = int(operator_key.functions.OPERATOR_KEY_ID().call())
            wallet_balance = int(operator_key.functions.balanceOf(wallet, operator_key_id).call())
            has_operator_key = wallet_balance > 0

            owner_wallet = wallet if has_operator_key else None
            delegate_wallet = None
            effective_access = has_operator_key

            if delegation_registry_contract:
                delegation_registry = w3.eth.contract(
                    address=delegation_registry_contract,
                    abi=_DELEGATION_REGISTRY_ABI,
                )

                if has_operator_key:
                    delegate_wallet = _clean_address(delegation_registry.functions.delegateOf(wallet).call())
                else:
                    effective_owner = _clean_address(delegation_registry.functions.effectiveOwner(wallet).call())
                    effective_access = bool(delegation_registry.functions.hasEffectiveOperatorAccess(wallet).call())
                    if effective_owner and effective_access:
                        owner_wallet = effective_owner
                        delegate_wallet = wallet

            return {
                "wallet": wallet,
                "ownerWallet": owner_wallet,
                "delegateWallet": delegate_wallet,
                "hasOperatorKey": has_operator_key,
                "accessClass": "operator" if effective_access else "none",
                "effectiveAccess": effective_access,
                "source": "rpc_direct",
                "lastIndexedBlock": latest_block,
                "contractsConfigured": True,
            }

        legacy_registry = w3.eth.contract(address=legacy_registry_contract, abi=_legacy_registry_abi())
        has_access = bool(legacy_registry.functions.checkAccess(wallet).call())

        return {
            "wallet": wallet,
            "ownerWallet": wallet if has_access else None,
            "delegateWallet": None,
            "hasOperatorKey": has_access,
            "accessClass": "operator" if has_access else "none",
            "effectiveAccess": has_access,
            "source": "legacy_registry",
            "lastIndexedBlock": latest_block,
            "contractsConfigured": True,
        }

    try:
        return with_evm_provider(_keys_network(), _read)
    except Exception as exc:
        logger.warning("Failed to resolve keys snapshot for %s: %s", wallet, exc)
        return {
            "wallet": wallet,
            "ownerWallet": None,
            "delegateWallet": None,
            "hasOperatorKey": False,
            "accessClass": "none",
            "effectiveAccess": False,
            "source": "rpc_error",
            "lastIndexedBlock": None,
            "contractsConfigured": bool(operator_key_contract or legacy_registry_contract),
            "error": str(exc),
        }
