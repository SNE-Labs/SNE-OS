"""
Keys service for SNE OS.
Builds access-layer view models from session and wallet context.
"""

from datetime import datetime
from typing import Any, Dict, Optional


def build_keys_overview(address: Optional[str], authenticated: bool) -> Dict[str, Any]:
    if not address:
        return {
            "connected": False,
            "status": {"label": "offline", "tone": "pending"},
            "surface": {
                "address": None,
                "access_level": "public",
                "source": "session",
            },
            "signals": [
                {"title": "Licenças", "value": "0", "detail": "Nenhum grant ativo carregado"},
                {"title": "Chaves", "value": "0", "detail": "Nenhuma credencial portátil detectada"},
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

    status = {"label": "session", "tone": "active"} if authenticated else {"label": "readonly", "tone": "warning"}

    return {
        "connected": True,
        "status": status,
        "surface": {
            "address": address,
            "access_level": "session" if authenticated else "public",
            "source": "session",
        },
        "signals": [
            {"title": "Licenças", "value": "0", "detail": "Nenhum grant ativo carregado"},
            {"title": "Chaves", "value": "0", "detail": "Nenhuma credencial portátil detectada"},
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
