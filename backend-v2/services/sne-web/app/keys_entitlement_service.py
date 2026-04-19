"""
Operational entitlement resolution for SNE Keys.

Rules:
- rpc-direct decides when indexer projections are unavailable
- stale or missing projections never grant premium by themselves
- in case of doubt, deny premium
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from .keys_contract_service import read_keys_snapshot
from .keys_indexer import get_keys_indexer_status
from .swaps_fee_service import resolve_fee_tier


def build_keys_entitlement(address: Optional[str]) -> Dict[str, Any]:
    snapshot = read_keys_snapshot(address)
    indexer_status = get_keys_indexer_status(snapshot)
    fee_policy = resolve_fee_tier(snapshot)

    return {
        "wallet": snapshot.get("wallet"),
        "ownerWallet": snapshot.get("ownerWallet"),
        "delegateWallet": snapshot.get("delegateWallet"),
        "hasOperatorKey": bool(snapshot.get("hasOperatorKey")),
        "accessClass": snapshot.get("accessClass", "none"),
        "effectiveAccess": bool(snapshot.get("effectiveAccess")),
        "feeTier": fee_policy["tier"],
        "feePolicy": fee_policy,
        "source": snapshot.get("source", "unknown"),
        "lastIndexedBlock": indexer_status.get("lastIndexedBlock"),
        "contractsConfigured": bool(snapshot.get("contractsConfigured")),
        "checkedAt": datetime.utcnow().isoformat(),
        "indexer": indexer_status,
        "error": snapshot.get("error"),
    }
