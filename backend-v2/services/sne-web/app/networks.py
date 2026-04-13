"""
Multi-chain registry and provider helpers for SNE OS.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from web3 import Web3


NetworkConfig = Dict[str, Any]


NETWORKS: Dict[str, NetworkConfig] = {
    "bitcoin": {
        "key": "bitcoin",
        "label": "Bitcoin",
        "family": "btc",
        "native_asset": "BTC",
        "chain_id": None,
        "explorer_url": "https://mempool.space",
        "rpc_url": os.getenv("BITCOIN_RPC_URL"),
        "enabled": True,
        "read_supported": False,
        "write_supported": False,
    },
    "ethereum": {
        "key": "ethereum",
        "label": "Ethereum",
        "family": "evm",
        "native_asset": "ETH",
        "chain_id": 1,
        "explorer_url": "https://etherscan.io",
        "rpc_url": os.getenv("ETHEREUM_RPC_URL", "https://eth.llamarpc.com"),
        "enabled": True,
        "read_supported": True,
        "write_supported": True,
    },
    "solana": {
        "key": "solana",
        "label": "Solana",
        "family": "svm",
        "native_asset": "SOL",
        "chain_id": None,
        "explorer_url": "https://solscan.io",
        "rpc_url": os.getenv("SOLANA_RPC_URL"),
        "enabled": True,
        "read_supported": False,
        "write_supported": False,
    },
    "tron": {
        "key": "tron",
        "label": "Tron",
        "family": "tron",
        "native_asset": "TRX",
        "chain_id": None,
        "explorer_url": "https://tronscan.org",
        "rpc_url": os.getenv("TRON_RPC_URL"),
        "enabled": True,
        "read_supported": False,
        "write_supported": False,
    },
    "polygon": {
        "key": "polygon",
        "label": "Polygon",
        "family": "evm",
        "native_asset": "POL",
        "chain_id": 137,
        "explorer_url": "https://polygonscan.com",
        "rpc_url": os.getenv("POLYGON_RPC_URL", "https://polygon-rpc.com"),
        "enabled": True,
        "read_supported": True,
        "write_supported": True,
    },
    "scroll": {
        "key": "scroll",
        "label": "Scroll",
        "family": "evm",
        "native_asset": "ETH",
        "chain_id": int(os.getenv("SCROLL_CHAIN_ID", "534352")),
        "explorer_url": "https://scrollscan.com",
        "rpc_url": os.getenv("SCROLL_RPC_URL", "https://rpc.scroll.io"),
        "enabled": True,
        "read_supported": True,
        "write_supported": True,
    },
}


DEFAULT_NETWORK_KEY = os.getenv("DEFAULT_NETWORK", "scroll")


def get_network(network_key: Optional[str]) -> NetworkConfig:
    key = (network_key or DEFAULT_NETWORK_KEY).strip().lower()
    return NETWORKS.get(key, NETWORKS[DEFAULT_NETWORK_KEY])


def list_networks() -> List[NetworkConfig]:
    return [get_public_network_metadata(config["key"]) for config in NETWORKS.values()]


def list_enabled_network_keys(
    family: Optional[str] = None,
    readable_only: bool = False,
) -> List[str]:
    keys: List[str] = []
    for key, config in NETWORKS.items():
        if not config.get("enabled"):
            continue
        if family and config.get("family") != family:
            continue
        if readable_only and not config.get("read_supported"):
            continue
        keys.append(key)
    return keys


def get_public_network_metadata(network_key: str) -> NetworkConfig:
    config = get_network(network_key)
    return {
        "key": config["key"],
        "label": config["label"],
        "family": config["family"],
        "native_asset": config["native_asset"],
        "chain_id": config["chain_id"],
        "explorer_url": config["explorer_url"],
        "enabled": bool(config["enabled"]),
        "capabilities": {
            "read": bool(config["read_supported"]),
            "write": bool(config["write_supported"]),
        },
    }


def get_default_network_metadata() -> NetworkConfig:
    return get_public_network_metadata(DEFAULT_NETWORK_KEY)


def get_evm_web3(network_key: Optional[str]) -> Optional[Web3]:
    config = get_network(network_key)
    if config["family"] != "evm" or not config.get("rpc_url"):
        return None
    return Web3(Web3.HTTPProvider(config["rpc_url"]))


def normalize_evm_address(address: Optional[str]) -> Optional[str]:
    if not address:
        return None
    return Web3.to_checksum_address(address)
