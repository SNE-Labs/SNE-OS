"""
Home service for SNE OS.
Builds the aggregated home view model from session, market, intel and system state.
"""

from datetime import datetime
import os
from typing import Any, Dict, List, Optional

from web3 import Web3


SCROLL_RPC_URL = os.getenv("SCROLL_RPC_URL", "https://rpc.scroll.io")


def get_wallet_state(address: Optional[str]) -> Optional[Dict[str, Any]]:
    if not address:
        return None

    try:
        w3 = Web3(Web3.HTTPProvider(SCROLL_RPC_URL))
        if not w3.is_connected():
            return {
                "address": address,
                "status": "degraded",
                "balance_eth": None,
                "tx_count": None,
                "account_type": None,
                "last_updated": datetime.utcnow().isoformat(),
            }

        balance_wei = w3.eth.get_balance(address)
        tx_count = w3.eth.get_transaction_count(address)
        code = w3.eth.get_code(address)
        balance_eth = float(w3.from_wei(balance_wei, "ether"))

        return {
            "address": address,
            "status": "ready",
            "balance_eth": balance_eth,
            "tx_count": tx_count,
            "account_type": "contract" if code and code != b"" and code.hex() != "0x" else "wallet",
            "last_updated": datetime.utcnow().isoformat(),
        }
    except Exception:
        return {
            "address": address,
            "status": "degraded",
            "balance_eth": None,
            "tx_count": None,
            "account_type": None,
            "last_updated": datetime.utcnow().isoformat(),
        }


def build_brief(session_data: Dict[str, Any], wallet: Optional[Dict[str, Any]], dashboard: Dict[str, Any], market: Dict[str, Any]) -> Dict[str, Any]:
    mover_count = len(market.get("top_movers", []))
    authenticated = session_data.get("authenticated", False)

    if not authenticated:
        return {
            "badge": "public",
            "badge_status": "pending",
            "headline": "Hub pronto.",
            "summary": f"Conecte uma carteira para carregar identidade, capital e acesso. O Radar acompanha {mover_count} mercado(s) ao vivo." if mover_count else "Conecte uma carteira para carregar identidade, capital e acesso.",
        }

    tx_count = wallet.get("tx_count") if wallet else None
    balance_eth = wallet.get("balance_eth") if wallet else None
    has_chain_state = (tx_count or 0) > 0 or (balance_eth or 0) > 0

    if not has_chain_state:
        return {
            "badge": "session active",
            "badge_status": "warning",
            "headline": "Carteira vinculada.",
            "summary": f"Sessão ativa, mas ainda sem atividade on-chain detectada. O Radar acompanha {mover_count} mercado(s)." if mover_count else "Sessão ativa, mas ainda sem atividade on-chain detectada.",
        }

    overall = dashboard.get("status", {}).get("overall_status", "Operational")
    return {
        "badge": "active",
        "badge_status": "active" if overall == "Operational" else "warning",
        "headline": "Hub online.",
        "summary": f"Identidade e capital carregados. O Radar acompanha {mover_count} mercado(s) ao vivo." if mover_count else "Identidade e capital carregados.",
    }


def build_module_states(session_data: Dict[str, Any], wallet: Optional[Dict[str, Any]], market: Dict[str, Any]) -> List[Dict[str, str]]:
    authenticated = session_data.get("authenticated", False)
    mover_count = len(market.get("top_movers", []))
    wallet_ready = wallet is not None and wallet.get("status") == "ready"
    has_chain_state = wallet_ready and (((wallet.get("tx_count") or 0) > 0) or ((wallet.get("balance_eth") or 0) > 0))

    return [
        {
            "title": "Passport",
            "path": "/pass",
            "label": "ativo" if has_chain_state else "pendente" if authenticated else "offline",
            "status": "success" if has_chain_state else "warning" if authenticated else "pending",
        },
        {
            "title": "Vault",
            "path": "/vault",
            "label": "pronto" if wallet_ready else "offline",
            "status": "active" if wallet_ready else "pending",
        },
        {
            "title": "Chaves",
            "path": "/keys",
            "label": "sessão" if authenticated else "inativo",
            "status": "active" if authenticated else "pending",
        },
        {
            "title": "Radar",
            "path": "/radar",
            "label": "ao vivo" if mover_count > 0 else "inativo",
            "status": "active" if mover_count > 0 else "pending",
        },
    ]


def build_brief_signals(session_data: Dict[str, Any], wallet: Optional[Dict[str, Any]], market: Dict[str, Any]) -> List[Dict[str, str]]:
    authenticated = session_data.get("authenticated", False)
    mover_count = len(market.get("top_movers", []))
    wallet_ready = wallet is not None and wallet.get("status") == "ready"
    has_chain_state = wallet_ready and (((wallet.get("tx_count") or 0) > 0) or ((wallet.get("balance_eth") or 0) > 0))
    balance_eth = wallet.get("balance_eth") if wallet else None

    vault_value = "offline"
    if wallet_ready and balance_eth is not None:
        vault_value = f"{balance_eth:.4f} ETH"
    elif authenticated:
        vault_value = "syncing"

    return [
        {
            "label": "Passport",
            "value": "verified" if has_chain_state else "pending" if authenticated else "offline",
        },
        {
            "label": "Vault",
            "value": vault_value,
        },
        {
            "label": "Radar",
            "value": f"{mover_count} live" if mover_count > 0 else "idle",
        },
    ]


def build_system_surface(dashboard: Dict[str, Any]) -> Dict[str, Any]:
    components = dashboard.get("components", [])
    index = {component["name"]: component["status"] for component in components}
    metrics = dashboard.get("metrics", {})

    return {
        "tags": [
            {"label": "API", "value": dashboard.get("status", {}).get("overall_status", "--")},
            {"label": "Database", "value": index.get("Database", "--")},
            {"label": "Cache", "value": index.get("Cache", "--")},
            {"label": "Collector", "value": index.get("Collector", "--")},
        ],
        "workspace": [
            {"label": "Latência", "value": f"{metrics['latency_ms']} ms" if metrics.get("latency_ms") is not None else "--"},
            {"label": "Uptime", "value": f"{metrics['uptime_percentage']}%" if metrics.get("uptime_percentage") is not None else "--"},
            {"label": "Última prova", "value": f"{metrics['last_proof_minutes']}m" if metrics.get("last_proof_minutes") is not None else "--"},
            {"label": "Componentes", "value": str(len(components)) if components is not None else "--"},
        ],
    }
