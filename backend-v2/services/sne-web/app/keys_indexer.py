"""
Keys indexer status helpers.

V1 starts in rpc-direct mode. This module exists so the transition to a real
event indexer does not require reshaping the entitlement layer later.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


def get_keys_indexer_status(snapshot: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    latest_block = (snapshot or {}).get("lastIndexedBlock")
    source = (snapshot or {}).get("source") or "rpc_direct"

    return {
        "mode": "rpc_direct",
        "healthy": source not in {"rpc_error"},
        "source": source,
        "lastIndexedBlock": latest_block,
    }
