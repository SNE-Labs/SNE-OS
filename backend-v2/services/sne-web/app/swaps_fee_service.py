"""
Swaps fee policy derived from SNE Keys entitlement.
"""

from __future__ import annotations

from typing import Any, Dict


def resolve_fee_tier(entitlement: Dict[str, Any]) -> Dict[str, Any]:
    effective_access = bool(entitlement.get("effectiveAccess"))

    if effective_access:
        return {
            "tier": "operator_discount",
            "discountBps": 250,
            "label": "operator",
            "reason": "Operator Key ownership or valid delegation detected.",
        }

    return {
        "tier": "standard",
        "discountBps": 0,
        "label": "public",
        "reason": "No effective Operator access detected.",
    }
