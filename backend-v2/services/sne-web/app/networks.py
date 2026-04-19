"""
Multi-chain registry and provider helpers for SNE OS.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Callable, Dict, List, Optional, TypeVar

from web3 import Web3


NetworkConfig = Dict[str, Any]
T = TypeVar("T")

logger = logging.getLogger(__name__)


def _split_urls(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _rpc_urls(env_many: str, env_single: str, defaults: List[str]) -> List[str]:
    return _split_urls(os.getenv(env_many)) or _split_urls(os.getenv(env_single)) or defaults


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
        "rpc_urls": _rpc_urls(
            "ETHEREUM_RPC_URLS",
            "ETHEREUM_RPC_URL",
            [
                "https://ethereum-rpc.publicnode.com",
                "https://rpc.ankr.com/eth",
                "https://cloudflare-eth.com",
            ],
        ),
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
    "arbitrum": {
        "key": "arbitrum",
        "label": "Arbitrum",
        "family": "evm",
        "native_asset": "ETH",
        "chain_id": 42161,
        "explorer_url": "https://arbiscan.io",
        "rpc_urls": _rpc_urls(
            "ARBITRUM_RPC_URLS",
            "ARBITRUM_RPC_URL",
            [
                "https://arbitrum-one-rpc.publicnode.com",
                "https://arb1.arbitrum.io/rpc",
            ],
        ),
        "enabled": True,
        "read_supported": True,
        "write_supported": True,
    },
    "arbitrum-sepolia": {
        "key": "arbitrum-sepolia",
        "label": "Arbitrum Sepolia",
        "family": "evm",
        "native_asset": "ETH",
        "chain_id": int(os.getenv("ARBITRUM_SEPOLIA_CHAIN_ID", "421614")),
        "explorer_url": "https://sepolia.arbiscan.io",
        "rpc_urls": _rpc_urls(
            "ARBITRUM_SEPOLIA_RPC_URLS",
            "ARBITRUM_SEPOLIA_RPC_URL",
            [
                "https://sepolia-rollup.arbitrum.io/rpc",
                "https://arbitrum-sepolia-rpc.publicnode.com",
            ],
        ),
        "enabled": True,
        "read_supported": True,
        "write_supported": True,
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
    "optimism": {
        "key": "optimism",
        "label": "Optimism",
        "family": "evm",
        "native_asset": "ETH",
        "chain_id": 10,
        "explorer_url": "https://optimistic.etherscan.io",
        "rpc_urls": _rpc_urls(
            "OPTIMISM_RPC_URLS",
            "OPTIMISM_RPC_URL",
            [
                "https://optimism-rpc.publicnode.com",
                "https://mainnet.optimism.io",
            ],
        ),
        "enabled": True,
        "read_supported": True,
        "write_supported": True,
    },
    "polygon": {
        "key": "polygon",
        "label": "Polygon",
        "family": "evm",
        "native_asset": "POL",
        "chain_id": 137,
        "explorer_url": "https://polygonscan.com",
        "rpc_urls": _rpc_urls(
            "POLYGON_RPC_URLS",
            "POLYGON_RPC_URL",
            [
                "https://polygon-bor-rpc.publicnode.com",
                "https://1rpc.io/matic",
                "https://polygon-rpc.com",
            ],
        ),
        "enabled": True,
        "read_supported": True,
        "write_supported": True,
    },
    "base": {
        "key": "base",
        "label": "Base",
        "family": "evm",
        "native_asset": "ETH",
        "chain_id": 8453,
        "explorer_url": "https://basescan.org",
        "rpc_urls": _rpc_urls(
            "BASE_RPC_URLS",
            "BASE_RPC_URL",
            [
                "https://base-rpc.publicnode.com",
                "https://mainnet.base.org",
            ],
        ),
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
        "rpc_urls": _rpc_urls(
            "SCROLL_RPC_URLS",
            "SCROLL_RPC_URL",
            [
                "https://rpc.scroll.io",
                "https://scroll-mainnet.public.blastapi.io",
            ],
        ),
        "enabled": True,
        "read_supported": True,
        "write_supported": True,
    },
}


DEFAULT_NETWORK_KEY = os.getenv("DEFAULT_NETWORK", "arbitrum")


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
    rpc_urls = config.get("rpc_urls") or []
    if config["family"] != "evm" or not rpc_urls:
        return None
    return Web3(Web3.HTTPProvider(rpc_urls[0]))


def get_evm_rpc_urls(network_key: Optional[str]) -> List[str]:
    config = get_network(network_key)
    if config["family"] != "evm":
        return []
    return list(config.get("rpc_urls") or [])


def with_evm_provider(network_key: Optional[str], callback: Callable[[Web3], T]) -> T:
    config = get_network(network_key)
    if config["family"] != "evm":
        raise RuntimeError(f"{config['label']} is not an EVM network")

    last_exc: Optional[Exception] = None
    rpc_urls = get_evm_rpc_urls(network_key)
    if not rpc_urls:
        raise RuntimeError(f"{config['label']} RPC unavailable")

    for rpc_url in rpc_urls:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        try:
            if not w3.is_connected():
                raise RuntimeError(f"RPC not connected: {rpc_url}")
            return callback(w3)
        except Exception as exc:
            last_exc = exc
            logger.warning("RPC provider failed for %s via %s: %s", config["key"], rpc_url, exc)

    if last_exc:
        raise last_exc
    raise RuntimeError(f"{config['label']} RPC unavailable")


def normalize_evm_address(address: Optional[str]) -> Optional[str]:
    if not address:
        return None
    return Web3.to_checksum_address(address)
