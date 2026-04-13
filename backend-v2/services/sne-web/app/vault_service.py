"""
Vault service for SNE OS.
Builds capital and protection view models from wallet state.
"""

from datetime import datetime
import os
from typing import Any, Dict, Optional

from web3 import Web3


SCROLL_RPC_URL = os.getenv("SCROLL_RPC_URL", "https://rpc.scroll.io")
SCROLL_CHAIN_ID = int(os.getenv("SCROLL_CHAIN_ID", "534352"))


def _get_web3() -> Web3:
    return Web3(Web3.HTTPProvider(SCROLL_RPC_URL))


def _format_gwei(value_wei: int) -> str:
    gwei = value_wei / 1e9
    if gwei >= 100:
        return f"{gwei:.0f} gwei"
    if gwei >= 10:
        return f"{gwei:.1f} gwei"
    return f"{gwei:.2f} gwei"


def build_vault_overview(address: Optional[str]) -> Dict[str, Any]:
    if not address:
        return {
            "connected": False,
            "status": {"label": "offline", "tone": "pending"},
            "surface": {
                "address": None,
                "network": str(SCROLL_CHAIN_ID),
                "source": "rpc",
            },
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

    w3 = _get_web3()
    if not w3.is_connected():
        return {
            "connected": True,
            "status": {"label": "degraded", "tone": "warning"},
            "surface": {
                "address": address,
                "network": str(SCROLL_CHAIN_ID),
                "source": "rpc",
            },
            "signals": [
                {"title": "Estado do capital", "value": "--", "detail": "RPC indisponível no momento"},
                {"title": "Superfície de acesso", "value": "0 chaves", "detail": "Nenhuma chave vinculada ainda"},
                {"title": "Camada de proteção", "value": "0 dispositivos", "detail": "Nenhum dispositivo registrado"},
            ],
            "capital_cards": [],
            "posture": [],
            "protection": {
                "state": "RPC indisponível para leitura de capital.",
                "boundary": "Chaves e Dispositivos continuam sendo a fronteira de proteção do Vault.",
            },
            "readiness": {
                "custody": "Não custodial. O capital permanece na carteira conectada.",
                "staking": "Nenhuma rota de staking disponível para esta conta.",
                "provisioning": "Provisionamento de hardware requer um dispositivo SNE Vault vinculado.",
            },
            "last_updated": datetime.utcnow().isoformat(),
        }

    balance_wei = w3.eth.get_balance(address)
    balance_eth = float(w3.from_wei(balance_wei, "ether"))
    tx_count = w3.eth.get_transaction_count(address)
    code = w3.eth.get_code(address)
    gas_price_wei = int(w3.eth.gas_price)
    account_type = "contract" if code and code != b"" and code.hex() != "0x" else "wallet"
    has_activity = tx_count > 0 or balance_eth > 0

    status = {"label": "capital online", "tone": "active"} if has_activity else {"label": "idle", "tone": "warning"}

    capital = f"{balance_eth:.6f} ETH"
    gas = _format_gwei(gas_price_wei)

    return {
        "connected": True,
        "status": status,
        "surface": {
            "address": address,
            "network": str(SCROLL_CHAIN_ID),
            "source": "rpc",
        },
        "signals": [
            {"title": "Estado do capital", "value": capital, "detail": "Saldo ao vivo da carteira"},
            {"title": "Superfície de acesso", "value": "0 chaves", "detail": "Nenhuma chave vinculada ainda"},
            {"title": "Camada de proteção", "value": "0 dispositivos", "detail": "Nenhum dispositivo registrado"},
        ],
        "capital_cards": [
            {"label": "Saldo", "value": capital, "hint": f"{balance_eth:.6f} ETH", "icon": "wallet"},
            {"label": "Gas", "value": gas, "hint": "Scroll RPC", "icon": "zap"},
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
