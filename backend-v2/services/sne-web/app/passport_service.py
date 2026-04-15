"""
Passport service for SNE OS.
Builds identity overview payloads from public on-chain state.
"""

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional

from .networks import (
    get_public_network_metadata,
    list_enabled_network_keys,
    normalize_evm_address,
    with_evm_provider,
)
from .passport_identity_service import get_identity_by_address, serialize_identity

logger = logging.getLogger(__name__)


def resolve_identity(address: str, network_key: Optional[str] = None) -> Dict[str, Any]:
    checksum_address = normalize_evm_address(address)
    network = get_public_network_metadata(network_key or "scroll")
    def _load_identity(w3):
        balance_wei = w3.eth.get_balance(checksum_address)
        tx_count = w3.eth.get_transaction_count(checksum_address)
        code = w3.eth.get_code(checksum_address)
        balance_eth = float(w3.from_wei(balance_wei, "ether"))
        return balance_wei, tx_count, code, balance_eth

    _, tx_count, code, balance_eth = with_evm_provider(network["key"], _load_identity)

    has_code = bool(code and code != b"" and code.hex() != "0x")
    has_activity = tx_count > 0 or balance_eth > 0

    identity = {
        "address": address,
        "accountType": "contract" if has_code else "wallet",
        "txCount": tx_count,
        "balanceEth": f"{balance_eth:.6f}",
        "checkedAt": datetime.utcnow().isoformat(),
        "hasActivity": has_activity,
        "hasCode": has_code,
    }

    assertions = [
        {
            "id": "wallet-address",
            "label": "Address resolved",
            "status": "present",
            "source": "rpc",
            "value": address,
        },
        {
            "id": "onchain-activity",
            "label": "On-chain activity",
            "status": "present" if has_activity else "missing",
            "source": "derived",
            "value": f"{tx_count} tx",
        },
        {
            "id": "account-type",
            "label": "Account type",
            "status": "present",
            "source": "rpc",
            "value": identity["accountType"],
        },
        {
            "id": "sne-licenses",
            "label": "SNE identity assertions",
            "status": "missing",
            "source": "on-chain",
            "value": "0",
        },
    ]

    return {
        "licenses": [],
        "keys": [],
        "boxes": [],
        "identity": identity,
        "assertions": assertions,
        "network": network,
        "pou": {"nodesPublic": 0},
        "metadata": {
            "cached": False,
            "source": f"{network['key']}-rpc",
        },
    }


def build_account_snapshot(address: str, network_key: str, primary_network_key: Optional[str]) -> Dict[str, Any]:
    checksum_address = normalize_evm_address(address)
    network = get_public_network_metadata(network_key)
    snapshot: Dict[str, Any] = {
        "network": network,
        "address": address,
        "primary": network_key == (primary_network_key or "scroll"),
        "status": "unavailable",
        "account_type": None,
        "tx_count": None,
        "balance": None,
        "has_activity": False,
        "source": f"{network_key}-rpc",
    }

    try:
        def _load_snapshot(w3):
            balance_wei = w3.eth.get_balance(checksum_address)
            tx_count = w3.eth.get_transaction_count(checksum_address)
            code = w3.eth.get_code(checksum_address)
            balance_native = float(w3.from_wei(balance_wei, "ether"))
            return balance_wei, tx_count, code, balance_native

        _, tx_count, code, balance_native = with_evm_provider(network_key, _load_snapshot)
        has_code = bool(code and code != b"" and code.hex() != "0x")
        has_activity = tx_count > 0 or balance_native > 0

        snapshot.update({
            "status": "active" if has_activity else "idle",
            "account_type": "contract" if has_code else "wallet",
            "tx_count": tx_count,
            "balance": f"{balance_native:.6f} {network['native_asset']}",
            "has_activity": has_activity,
        })
    except Exception as exc:
        logger.warning("Passport account snapshot failed for %s on %s: %s", address, network_key, exc)
        snapshot["status"] = "degraded"
    return snapshot


def build_linked_accounts(address: str, primary_network_key: Optional[str]) -> List[Dict[str, Any]]:
    return [
        build_account_snapshot(address, network_key, primary_network_key)
        for network_key in list_enabled_network_keys(family="evm", readable_only=True)
    ]


def build_network_scope() -> List[Dict[str, Any]]:
    scope: List[Dict[str, Any]] = []
    for network_key in list_enabled_network_keys():
        network = get_public_network_metadata(network_key)
        scope.append({
            "network": network,
            "link_strategy": "same-address"
            if network["family"] == "evm"
            else "external-binding-required",
        })
    return scope


def build_passport_overview(address: Optional[str], network_key: Optional[str] = None) -> Dict[str, Any]:
    network = get_public_network_metadata(network_key or "scroll")

    if not address:
        return {
            "connected": False,
            "status": {"label": "offline", "tone": "pending"},
            "profile": None,
            "surface": {
                "address": None,
                "network": network["label"],
                "capital": f"-- {network['native_asset']}",
                "gas": "--",
            },
            "network_meta": network,
            "primary_account": None,
            "linked_accounts": [],
            "network_scope": build_network_scope(),
            "inventory": [],
        }

    try:
        profile = resolve_identity(address, network["key"])
        identity = profile["identity"]
    except Exception as exc:
        logger.warning("Passport identity resolution failed for %s on %s: %s", address, network["key"], exc)
        profile = {
            "licenses": [],
            "keys": [],
            "boxes": [],
            "identity": {
                "address": address,
                "accountType": None,
                "txCount": 0,
                "balanceEth": "--",
                "checkedAt": datetime.utcnow().isoformat(),
                "hasActivity": False,
                "hasCode": False,
            },
            "assertions": [],
            "network": network,
            "pou": {"nodesPublic": 0},
            "metadata": {
                "cached": False,
                "source": f"{network['key']}-rpc",
                "degraded": True,
            },
        }
        identity = profile["identity"]

    passport_identity = None
    try:
        identity_record = get_identity_by_address(address)
        if identity_record:
            passport_identity = serialize_identity(identity_record, include_events=False)
    except Exception as exc:
        logger.warning("Passport checkpoint resolution failed for %s: %s", address, exc)

    linked_accounts = build_linked_accounts(address, network["key"])
    active_accounts = sum(1 for account in linked_accounts if account["status"] == "active")

    if profile["metadata"].get("degraded"):
        status = {"label": "degraded", "tone": "warning"}
    elif profile["licenses"]:
        status = {"label": "verified", "tone": "success"}
    elif identity["hasActivity"]:
        status = {"label": "active", "tone": "active"}
    else:
        status = {"label": "pending", "tone": "warning"}

    inventory = [
        {"label": "Asserções", "value": str(len(profile["assertions"]))},
        {"label": "Licenças", "value": str(len(profile["licenses"]))},
        {"label": "Chaves", "value": str(len(profile["keys"]))},
        {"label": "Caixas", "value": str(len(profile["boxes"]))},
        {"label": "Networks", "value": str(active_accounts)},
    ]

    return {
        "connected": True,
        "status": status,
        "profile": {
            **profile,
            "passport": passport_identity,
        },
        "surface": {
            "address": address,
            "network": network["label"],
            "capital": f"{identity['balanceEth']} {network['native_asset']}",
            "gas": "--",
        },
        "network_meta": network,
        "primary_account": next((account for account in linked_accounts if account["primary"]), None),
        "linked_accounts": linked_accounts,
        "network_scope": build_network_scope(),
        "inventory": inventory,
    }
