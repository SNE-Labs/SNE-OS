"""
Home service for SNE OS.
Builds the aggregated home view model from session, market, intel and system state.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from .networks import get_default_network_metadata, get_public_network_metadata, list_networks, normalize_evm_address, with_evm_provider


def get_wallet_state(address: Optional[str], network_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if not address:
        return None

    checksum_address = normalize_evm_address(address)
    network = get_public_network_metadata(network_key or "scroll")

    try:
        def _load_wallet(w3):
            balance_wei = w3.eth.get_balance(checksum_address)
            tx_count = w3.eth.get_transaction_count(checksum_address)
            code = w3.eth.get_code(checksum_address)
            balance_eth = float(w3.from_wei(balance_wei, "ether"))
            return balance_wei, tx_count, code, balance_eth

        _, tx_count, code, balance_eth = with_evm_provider(network["key"], _load_wallet)

        return {
            "address": address,
            "status": "ready",
            "network": network,
            "balance_eth": balance_eth,
            "tx_count": tx_count,
            "account_type": "contract" if code and code != b"" and code.hex() != "0x" else "wallet",
            "last_updated": datetime.utcnow().isoformat(),
        }
    except Exception:
        return {
            "address": address,
            "status": "degraded",
            "network": network,
            "balance_eth": None,
            "tx_count": None,
            "account_type": None,
            "last_updated": datetime.utcnow().isoformat(),
        }


def build_home_networks() -> Dict[str, Any]:
    return {
        "default": get_default_network_metadata(),
        "items": list_networks(),
    }


def build_identity_snapshot(passport_overview: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not passport_overview:
        return {
            "status": {"label": "offline", "tone": "pending"},
            "primary_account": None,
            "linked_accounts_count": 0,
            "active_networks": 0,
            "network_scope": [],
        }

    linked_accounts = passport_overview.get("linked_accounts", [])
    active_networks = sum(1 for account in linked_accounts if account.get("status") == "active")

    return {
        "status": passport_overview.get("status", {"label": "offline", "tone": "pending"}),
        "primary_account": passport_overview.get("primary_account"),
        "linked_accounts_count": len(linked_accounts),
        "active_networks": active_networks,
        "network_scope": passport_overview.get("network_scope", []),
    }


def build_capital_snapshot(vault_overview: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not vault_overview:
        return {
            "status": {"label": "offline", "tone": "pending"},
            "aggregate": {
                "active_networks": 0,
                "visible_networks": 0,
                "primary_network": None,
                "total_value_display": "--",
            },
            "by_network": [],
        }

    return {
        "status": vault_overview.get("status", {"label": "offline", "tone": "pending"}),
        "aggregate": vault_overview.get("aggregate", {}),
        "by_network": vault_overview.get("by_network", []),
    }


def build_secrets_snapshot(secrets_overview: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not secrets_overview:
        return {
            "status": {"label": "offline", "tone": "pending"},
            "item_count": 0,
            "ready_vaults": 0,
            "updated_at": None,
            "recent_items": [],
            "sync": {
                "backend": "disabled",
                "configured": False,
                "mode": "client-side-encrypted",
            },
            "storage": {
                "backend": "disabled",
                "configured": False,
            },
        }

    vaults = secrets_overview.get("vaults", [])
    ready_vaults = sum(1 for vault in vaults if vault.get("count", 0) > 0)

    return {
        "status": secrets_overview.get("status", {"label": "offline", "tone": "pending"}),
        "item_count": secrets_overview.get("item_count", 0),
        "ready_vaults": ready_vaults,
        "updated_at": secrets_overview.get("updated_at"),
        "recent_items": secrets_overview.get("recent_items", []),
        "sync": {
            "backend": secrets_overview.get("sync", {}).get("backend"),
            "configured": bool(secrets_overview.get("sync", {}).get("configured")),
            "mode": secrets_overview.get("sync", {}).get("mode"),
        },
        "storage": {
            "backend": secrets_overview.get("storage", {}).get("backend"),
            "configured": bool(secrets_overview.get("storage", {}).get("configured")),
        },
    }


def build_brief(
    session_data: Dict[str, Any],
    wallet: Optional[Dict[str, Any]],
    dashboard: Dict[str, Any],
    market: Dict[str, Any],
    identity: Optional[Dict[str, Any]] = None,
    capital: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    mover_count = len(market.get("top_movers", []))
    authenticated = session_data.get("authenticated", False)
    network_label = wallet.get("network", {}).get("label", "network") if wallet else "network"
    linked_accounts = identity.get("linked_accounts_count", 0) if identity else 0
    active_networks = capital.get("aggregate", {}).get("active_networks", 0) if capital else 0

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
            "summary": f"Sessão ativa em {network_label}, mas ainda sem atividade on-chain detectada. O Radar acompanha {mover_count} mercado(s)." if mover_count else f"Sessão ativa em {network_label}, mas ainda sem atividade on-chain detectada.",
        }

    overall = dashboard.get("status", {}).get("overall_status", "Operational")
    return {
        "badge": "active",
        "badge_status": "active" if overall == "Operational" else "warning",
        "headline": "Hub online.",
        "summary": (
            f"Identidade e capital carregados em {network_label}. "
            f"{linked_accounts} conta(s) ligadas, {active_networks} network(s) ativas e {mover_count} mercado(s) no Radar."
            if mover_count
            else f"Identidade e capital carregados em {network_label}. {linked_accounts} conta(s) ligadas e {active_networks} network(s) ativas."
        ),
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


def build_brief_signals(
    session_data: Dict[str, Any],
    wallet: Optional[Dict[str, Any]],
    market: Dict[str, Any],
    identity: Optional[Dict[str, Any]] = None,
    capital: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, str]]:
    authenticated = session_data.get("authenticated", False)
    mover_count = len(market.get("top_movers", []))
    wallet_ready = wallet is not None and wallet.get("status") == "ready"
    has_chain_state = wallet_ready and (((wallet.get("tx_count") or 0) > 0) or ((wallet.get("balance_eth") or 0) > 0))
    capital_display = capital.get("aggregate", {}).get("total_value_display") if capital else None
    active_networks = capital.get("aggregate", {}).get("active_networks") if capital else 0
    linked_accounts = identity.get("linked_accounts_count") if identity else 0

    vault_value = "offline"
    if capital_display:
        vault_value = capital_display
    elif authenticated:
        vault_value = "syncing"

    return [
        {
            "label": "Passport",
            "value": f"{linked_accounts} linked" if linked_accounts else "verified" if has_chain_state else "pending" if authenticated else "offline",
        },
        {
            "label": "Vault",
            "value": vault_value,
        },
        {
            "label": "Radar",
            "value": f"{mover_count} live / {active_networks} nets" if mover_count > 0 else f"{active_networks} nets" if active_networks else "idle",
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
