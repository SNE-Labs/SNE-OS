"""
Passport service for SNE OS.
Builds identity overview payloads from public on-chain state.
"""

from datetime import datetime
import os
from typing import Any, Dict, Optional

from web3 import Web3


SCROLL_RPC_URL = os.getenv("SCROLL_RPC_URL", "https://rpc.scroll.io")


def _get_web3() -> Web3:
    return Web3(Web3.HTTPProvider(SCROLL_RPC_URL))


def resolve_identity(address: str) -> Dict[str, Any]:
    w3 = _get_web3()
    if not w3.is_connected():
        raise RuntimeError("Scroll RPC unavailable")

    balance_wei = w3.eth.get_balance(address)
    tx_count = w3.eth.get_transaction_count(address)
    code = w3.eth.get_code(address)
    balance_eth = float(w3.from_wei(balance_wei, "ether"))

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
        "pou": {"nodesPublic": 0},
        "metadata": {
            "cached": False,
            "source": "rpc",
        },
    }


def build_passport_overview(address: Optional[str]) -> Dict[str, Any]:
    if not address:
        return {
            "connected": False,
            "status": {"label": "offline", "tone": "pending"},
            "profile": None,
            "surface": {
                "address": None,
                "capital": "--",
                "gas": "--",
            },
            "inventory": [],
        }

    profile = resolve_identity(address)
    identity = profile["identity"]

    if profile["licenses"]:
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
    ]

    return {
        "connected": True,
        "status": status,
        "profile": profile,
        "surface": {
            "address": address,
            "capital": f"{identity['balanceEth']} ETH",
            "gas": "--",
        },
        "inventory": inventory,
    }
