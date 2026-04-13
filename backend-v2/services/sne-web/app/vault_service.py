"""
Vault service for SNE OS.
Builds capital and protection view models from wallet state.
"""

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional

from .networks import get_public_network_metadata, list_enabled_network_keys, normalize_evm_address, with_evm_provider

logger = logging.getLogger(__name__)


def _format_gwei(value_wei: int) -> str:
    gwei = value_wei / 1e9
    if gwei >= 100:
        return f"{gwei:.0f} gwei"
    if gwei >= 10:
        return f"{gwei:.1f} gwei"
    return f"{gwei:.2f} gwei"


def _empty_network_entry(network_key: str, address: str) -> Dict[str, Any]:
    network = get_public_network_metadata(network_key)
    return {
        "network": network,
        "address": address,
        "status": "unavailable",
        "balance_native": None,
        "balance_formatted": None,
        "gas": None,
        "tx_count": None,
        "account_type": None,
        "has_activity": False,
        "source": f"{network_key}-rpc",
    }


def build_network_position(address: str, network_key: str) -> Dict[str, Any]:
    checksum_address = normalize_evm_address(address)
    position = _empty_network_entry(network_key, address)
    network = position["network"]
    try:
        def _load_position(w3):
            balance_wei = w3.eth.get_balance(checksum_address)
            balance_native = float(w3.from_wei(balance_wei, "ether"))
            tx_count = w3.eth.get_transaction_count(checksum_address)
            code = w3.eth.get_code(checksum_address)
            gas_price_wei = int(w3.eth.gas_price)
            return balance_wei, balance_native, tx_count, code, gas_price_wei

        _, balance_native, tx_count, code, gas_price_wei = with_evm_provider(network_key, _load_position)
        account_type = "contract" if code and code != b"" and code.hex() != "0x" else "wallet"
        has_activity = tx_count > 0 or balance_native > 0

        position.update({
            "status": "active" if has_activity else "idle",
            "balance_native": balance_native,
            "balance_formatted": f"{balance_native:.6f} {network['native_asset']}",
            "gas": _format_gwei(gas_price_wei),
            "tx_count": tx_count,
            "account_type": account_type,
            "has_activity": has_activity,
        })
    except Exception as exc:
        logger.warning("Vault network position failed for %s on %s: %s", address, network_key, exc)
        position["status"] = "degraded"
    return position


def build_network_positions(address: str) -> List[Dict[str, Any]]:
    return [
        build_network_position(address, network_key)
        for network_key in list_enabled_network_keys(family="evm", readable_only=True)
    ]


def build_aggregate(position: Optional[Dict[str, Any]], positions: List[Dict[str, Any]]) -> Dict[str, Any]:
    active_networks = [item for item in positions if item["status"] == "active"]
    total_visible_positions = sum(1 for item in positions if item["status"] != "unavailable")

    return {
        "active_networks": len(active_networks),
        "visible_networks": total_visible_positions,
        "primary_network": position["network"] if position else None,
        "total_value_display": position["balance_formatted"] if position and position.get("balance_formatted") else "--",
    }


def build_vault_overview(address: Optional[str], network_key: Optional[str] = None) -> Dict[str, Any]:
    network = get_public_network_metadata(network_key or "scroll")

    if not address:
        return {
            "connected": False,
            "status": {"label": "offline", "tone": "pending"},
            "surface": {
                "address": None,
                "network": network["label"],
                "source": "registry",
            },
            "network_meta": network,
            "aggregate": {
                "active_networks": 0,
                "visible_networks": 0,
                "primary_network": network,
                "total_value_display": "--",
            },
            "by_network": [],
            "signals": [
                {"title": "Estado do capital", "value": "--", "detail": "Conecte uma carteira para carregar o capital"},
                {"title": "Superfície de acesso", "value": "0 chaves", "detail": "Nenhuma chave vinculada ainda"},
                {"title": "Camada de proteção", "value": "0 dispositivos", "detail": "Nenhum dispositivo registrado"},
            ],
            "capital_cards": [],
            "posture": [],
            "protection": {
                "state": "Visibilidade de capital indisponível até a conexão de uma carteira.",
                "boundary": "Chaves e Dispositivos continuam sendo a fronteira de proteção do Vault.",
            },
            "readiness": {
                "custody": "Não custodial. O capital permanece na carteira conectada.",
                "staking": "Nenhuma rota de staking disponível para esta conta.",
                "provisioning": "Provisionamento de hardware requer um dispositivo SNE Vault vinculado.",
            },
            "last_updated": datetime.utcnow().isoformat(),
        }

    primary_position = build_network_position(address, network["key"])
    positions = build_network_positions(address)
    balance_eth = primary_position["balance_native"] or 0
    tx_count = primary_position["tx_count"] or 0
    account_type = primary_position["account_type"] or "wallet"
    has_activity = bool(primary_position["has_activity"])

    status = {"label": "capital online", "tone": "active"} if has_activity else {"label": "idle", "tone": "warning"}

    capital = primary_position["balance_formatted"] or f"0.000000 {network['native_asset']}"
    gas = primary_position["gas"] or "--"

    return {
        "connected": True,
        "status": status,
        "surface": {
            "address": address,
            "network": network["label"],
            "source": "rpc",
        },
        "network_meta": network,
        "aggregate": build_aggregate(primary_position, positions),
        "by_network": positions,
        "signals": [
            {"title": "Estado do capital", "value": capital, "detail": "Saldo ao vivo da carteira"},
            {"title": "Redes ativas", "value": str(sum(1 for item in positions if item["status"] == "active")), "detail": "Networks com atividade ou saldo visível"},
            {"title": "Camada de proteção", "value": "0 dispositivos", "detail": "Nenhum dispositivo registrado"},
        ],
        "capital_cards": [
            {"label": "Saldo", "value": capital, "hint": f"{balance_eth:.6f} {network['native_asset']}", "icon": "wallet"},
            {"label": "Gas", "value": gas, "hint": f"{network['label']} RPC", "icon": "zap"},
            {"label": "Conta", "value": account_type, "hint": f"{tx_count} tx" if has_activity else "Sem atividade visível", "icon": "shield"},
            {"label": "Proteção", "value": "sem dispositivos", "hint": "Nenhum dispositivo confiável", "icon": "box"},
        ],
        "posture": [
            {"label": "Tipo", "value": account_type},
            {"label": "Transações", "value": str(tx_count)},
            {"label": "Chaves", "value": "0"},
            {"label": "Dispositivos", "value": "0"},
        ],
        "protection": {
            "state": "Visibilidade de capital ativa. Rotas de staking e provisionamento de hardware ainda não estão disponíveis para esta conta.",
            "boundary": "Chaves e Dispositivos são primitivos de proteção. Gerenciamento de grants fica em Chaves; execução fica no Radar.",
        },
        "readiness": {
            "custody": "Não custodial. O capital permanece na carteira conectada.",
            "staking": "Nenhuma rota de staking disponível para esta conta.",
            "provisioning": "Provisionamento de hardware requer um dispositivo SNE Vault vinculado.",
        },
        "last_updated": datetime.utcnow().isoformat(),
    }
