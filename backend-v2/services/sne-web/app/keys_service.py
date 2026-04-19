"""
Keys service for SNE OS.
Builds access-layer view models from sovereign entitlement state.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from .keys_entitlement_service import build_keys_entitlement


def build_keys_overview(address: Optional[str], authenticated: bool) -> Dict[str, Any]:
    entitlement = build_keys_entitlement(address)
    connected = bool(entitlement.get("wallet"))
    effective_access = bool(entitlement.get("effectiveAccess"))
    has_operator_key = bool(entitlement.get("hasOperatorKey"))
    owner_wallet = entitlement.get("ownerWallet")
    delegate_wallet = entitlement.get("delegateWallet")
    source = entitlement.get("source", "unknown")

    if not address:
        return {
            "connected": False,
            "status": {"label": "offline", "tone": "pending"},
            "surface": {
                "address": None,
                "access_level": "public",
                "source": source,
            },
            "signals": [
                {"title": "Licenças", "value": "0", "detail": "Nenhum Operator Key resolvido"},
                {"title": "Delegação", "value": "0", "detail": "Nenhum vínculo operacional ativo"},
                {"title": "Dispositivos", "value": "0", "detail": "Nenhum dispositivo confiável registrado"},
            ],
            "grants": [],
            "bindings": [],
            "devices": [],
            "boundary": {
                "grants": "Licenças e grants definem o que esta conta pode acessar.",
                "devices": "Devices e bindings representam a camada portátil de confiança.",
            },
            "last_updated": datetime.utcnow().isoformat(),
        }

    status = (
        {"label": "operator", "tone": "success"}
        if effective_access
        else {"label": "readonly", "tone": "warning"} if authenticated else {"label": "public", "tone": "pending"}
    )

    return {
        "connected": connected,
        "status": status,
        "surface": {
            "address": entitlement.get("wallet") or address,
            "access_level": entitlement.get("accessClass", "none"),
            "source": source,
        },
        "signals": [
            {
                "title": "Licenças",
                "value": "1" if has_operator_key else "0",
                "detail": "Operator Key na wallet atual" if has_operator_key else "Nenhum Operator Key na wallet atual",
            },
            {
                "title": "Delegação",
                "value": "1" if delegate_wallet else "0",
                "detail": (
                    f"Delegate ativa para {delegate_wallet}"
                    if has_operator_key and delegate_wallet
                    else f"Acesso delegado por {owner_wallet}"
                    if delegate_wallet and owner_wallet and owner_wallet != address
                    else "Nenhum vínculo operacional ativo"
                ),
            },
            {"title": "Dispositivos", "value": "0", "detail": "Nenhum dispositivo confiável registrado"},
        ],
        "grants": [
            {
                "id": "operator-key",
                "label": "Operator Key",
                "status": "active" if effective_access else "inactive",
            }
        ] if entitlement.get("contractsConfigured") else [],
        "bindings": [
            {
                "id": "delegate-binding",
                "label": delegate_wallet,
                "status": "active",
            }
        ] if delegate_wallet else [],
        "devices": [],
        "boundary": {
            "grants": "A classe Operator e derivada de posse on-chain ou delegação válida.",
            "devices": "Bindings operacionais estendem uso, mas nunca substituem a posse do Key.",
        },
        "last_updated": datetime.utcnow().isoformat(),
    }
