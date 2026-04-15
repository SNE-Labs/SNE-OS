"""
Vault service for SNE OS.
Builds capital and protection view models from wallet state.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from .networks import get_public_network_metadata, list_enabled_network_keys, normalize_evm_address, with_evm_provider

logger = logging.getLogger(__name__)


ERC20_BALANCE_OF_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "payable": False,
        "stateMutability": "view",
        "type": "function",
    }
]

USDT_TOKEN_BY_NETWORK: Dict[str, Dict[str, Any]] = {
    "ethereum": {
        "symbol": "USDT",
        "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "decimals": 6,
    },
    "arbitrum": {
        "symbol": "USDT",
        "address": "0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9",
        "decimals": 6,
    },
    "optimism": {
        "symbol": "USDT",
        "address": "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
        "decimals": 6,
    },
    "polygon": {
        "symbol": "USDT",
        "address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "decimals": 6,
    },
    "base": {
        "symbol": "USDT",
        "address": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        "decimals": 6,
    },
}


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
        "token_symbol": "USDT",
        "token_balance": None,
        "balance_native": None,
        "balance_formatted": None,
        "gas_balance_formatted": None,
        "gas": None,
        "tx_count": None,
        "account_type": None,
        "has_activity": False,
        "source": f"{network_key}-rpc",
    }


def _format_token_balance(value: float, symbol: str) -> str:
    return f"{value:.2f} {symbol}" if value >= 1 else f"{value:.6f} {symbol}"


def _tone_for_level(level: str) -> str:
    if level == "ready":
        return "success"
    if level == "attention":
        return "warning"
    if level == "blocked":
        return "pending"
    return "pending"


def _load_usdt_balance(w3: Any, network_key: str, checksum_address: str) -> tuple[float, str]:
    token = USDT_TOKEN_BY_NETWORK.get(network_key)
    if not token:
        return 0.0, "USDT"

    contract = w3.eth.contract(address=w3.to_checksum_address(token["address"]), abi=ERC20_BALANCE_OF_ABI)
    raw_balance = int(contract.functions.balanceOf(checksum_address).call())
    decimals = int(token.get("decimals") or 6)
    return raw_balance / (10 ** decimals), str(token.get("symbol") or "USDT")


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
            token_balance, token_symbol = _load_usdt_balance(w3, network_key, checksum_address)
            return balance_wei, balance_native, tx_count, code, gas_price_wei, token_balance, token_symbol

        _, balance_native, tx_count, code, gas_price_wei, token_balance, token_symbol = with_evm_provider(network_key, _load_position)
        account_type = "contract" if code and code != b"" and code.hex() != "0x" else "wallet"
        has_activity = tx_count > 0 or balance_native > 0 or token_balance > 0

        position.update({
            "status": "active" if has_activity else "idle",
            "token_symbol": token_symbol,
            "token_balance": token_balance,
            "balance_native": balance_native,
            "balance_formatted": _format_token_balance(token_balance, token_symbol),
            "gas_balance_formatted": f"{balance_native:.6f} {network['native_asset']}",
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


def _position_sort_key(position: Dict[str, Any]) -> tuple[int, float, float, int]:
    status_rank = {
        "active": 3,
        "idle": 2,
        "degraded": 1,
        "unavailable": 0,
    }
    return (
        status_rank.get(position.get("status", "unavailable"), 0),
        float(position.get("token_balance") or 0),
        float(position.get("balance_native") or 0),
        int(position.get("tx_count") or 0),
    )


def select_primary_position(
    requested_network_key: Optional[str],
    requested_position: Optional[Dict[str, Any]],
    positions: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if requested_network_key:
        requested_match = next(
            (item for item in positions if item.get("network", {}).get("key") == requested_network_key),
            requested_position,
        )
        if requested_match:
            return requested_match

    active_positions = [item for item in positions if item.get("status") == "active"]
    if active_positions:
        return max(active_positions, key=_position_sort_key)

    visible_positions = [item for item in positions if item.get("status") in {"idle", "degraded"}]
    if visible_positions:
        return max(visible_positions, key=_position_sort_key)

    return requested_position or (positions[0] if positions else None)


def build_aggregate(position: Optional[Dict[str, Any]], positions: List[Dict[str, Any]]) -> Dict[str, Any]:
    active_networks = [item for item in positions if item["status"] == "active"]
    total_visible_positions = sum(1 for item in positions if item["status"] != "unavailable")
    total_usdt = sum(float(item.get("token_balance") or 0) for item in positions)

    return {
        "active_networks": len(active_networks),
        "visible_networks": total_visible_positions,
        "primary_network": position["network"] if position else None,
        "total_value_display": _format_token_balance(total_usdt, "USDT"),
    }


def _build_hero(aggregate: Dict[str, Any], readiness: Dict[str, Any]) -> Dict[str, Any]:
    active_networks = int(aggregate.get("active_networks") or 0)

    return {
        "eyebrow": "Conta USDT-first",
        "title": readiness["title"],
        "summary": "O saldo permanece na wallet. O OS so le, organiza e qualifica saldo-base, gas e prontidao para execucao.",
        "metrics": [
            {
                "label": "Saldo-base",
                "value": aggregate.get("total_value_display") or "--",
                "detail": "USDT visivel na conta conectada",
                "tone": "success" if aggregate.get("total_value_display") not in {None, "--", "0.000000 USDT"} else "pending",
            },
            {
                "label": "Redes ativas",
                "value": str(active_networks),
                "detail": "Redes com saldo, gas ou atividade detectavel",
                "tone": "active" if active_networks > 0 else "pending",
            },
            {
                "label": "Prontidao de execucao",
                "value": readiness["label"],
                "detail": readiness["summary"],
                "tone": readiness["tone"],
            },
        ],
    }


def _build_readiness(positions: List[Dict[str, Any]], aggregate: Dict[str, Any]) -> Dict[str, Any]:
    total_usdt = sum(float(item.get("token_balance") or 0) for item in positions)
    gas_ready_positions = [item for item in positions if float(item.get("balance_native") or 0) > 0]
    usdt_ready_positions = [item for item in positions if float(item.get("token_balance") or 0) > 0]
    active_networks = int(aggregate.get("active_networks") or 0)

    if total_usdt <= 0:
        level = "blocked"
        label = "preparar saldo"
        title = "Conta conectada, sem saldo-base visivel."
        summary = "Nao ha USDT suficiente nas redes lidas para abrir uma execucao agora."
    elif not gas_ready_positions:
        level = "attention"
        label = "gas ausente"
        title = "Saldo-base visivel, mas a execucao ainda depende de gas."
        summary = "USDT foi detectado, mas nao ha gas suficiente nas redes lidas para operar com conforto."
    elif active_networks <= 0:
        level = "attention"
        label = "revisar conta"
        title = "Saldo-base visivel, com baixa atividade operacional."
        summary = "A conta foi detectada, mas ainda precisa confirmar rede ativa e rota antes de executar."
    else:
        level = "ready"
        label = "pronta"
        title = "Saldo-base pronto para decisao."
        summary = "USDT e gas foram encontrados em uma superficie legivel pelo OS."

    tone = _tone_for_level(level)

    return {
        "level": level,
        "label": label,
        "tone": tone,
        "title": title,
        "summary": summary,
        "items": [
            {
                "label": "Custodia",
                "value": "somente leitura",
                "detail": "O Vault nao assina nem envia transacoes. O saldo permanece na wallet conectada.",
                "tone": "active",
            },
            {
                "label": "Saldo-base",
                "value": aggregate.get("total_value_display") or "--",
                "detail": f"{len(usdt_ready_positions)} rede(s) com USDT visivel.",
                "tone": "success" if usdt_ready_positions else "pending",
            },
            {
                "label": "Gas",
                "value": "ok" if gas_ready_positions else "insuficiente",
                "detail": f"{len(gas_ready_positions)} rede(s) com gas disponivel.",
                "tone": "success" if gas_ready_positions else "warning",
            },
            {
                "label": "Execucao",
                "value": label,
                "detail": summary,
                "tone": tone,
            },
        ],
    }


def _build_balances(
    positions: List[Dict[str, Any]],
    aggregate: Dict[str, Any],
    primary_position: Optional[Dict[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    total_usdt = sum(float(item.get("token_balance") or 0) for item in positions)
    usdt_ready_positions = [item for item in positions if float(item.get("token_balance") or 0) > 0]
    gas_ready_positions = [item for item in positions if float(item.get("balance_native") or 0) > 0]
    primary_network = primary_position.get("network", {}) if primary_position else {}
    primary_native_asset = primary_network.get("native_asset") or "gas"
    primary_gas_balance = (
        primary_position.get("gas_balance_formatted")
        if primary_position and primary_position.get("gas_balance_formatted")
        else f"0.000000 {primary_native_asset}"
    )

    return {
        "usdt": {
            "label": "USDT",
            "value": aggregate.get("total_value_display") or "--",
            "detail": (
                f"{len(usdt_ready_positions)} rede(s) com saldo-base visivel."
                if total_usdt > 0
                else "Nenhum saldo-base USDT apareceu nas redes lidas."
            ),
            "tone": "success" if total_usdt > 0 else "warning",
        },
        "gas": {
            "label": "Gas",
            "value": primary_gas_balance,
            "detail": (
                f"{len(gas_ready_positions)} rede(s) com gas disponivel."
                if gas_ready_positions
                else "Adicione gas na rede operacional antes de mover USDT."
            ),
            "tone": "success" if gas_ready_positions else "warning",
        },
        "other_assets": {
            "label": "Outros ativos",
            "value": "leitura USDT-first",
            "detail": "Nesta fase o Vault organiza USDT e gas. Outros ativos ainda nao entram no saldo-base consolidado.",
            "tone": "pending",
        },
    }


def _build_next_action(readiness: Dict[str, Any]) -> Dict[str, Any]:
    if readiness["level"] == "ready":
        reason = "A conta ja tem saldo-base e gas suficiente para abrir o rail de execucao."
        actions = [
            {"label": "Mover USDT", "href": "/swaps?mode=move", "tone": "accent"},
            {"label": "Abrir Radar", "href": "/radar", "tone": "neutral"},
        ]
    elif readiness["level"] == "attention":
        reason = "Existe saldo-base, mas ainda falta gas ou confirmacao de superficie para operar."
        actions = [
            {"label": "Preparar saldo", "href": "/swaps?mode=move", "tone": "accent"},
            {"label": "Abrir Radar", "href": "/radar", "tone": "neutral"},
        ]
    else:
        reason = "Sem saldo-base visivel. O proximo passo e preparar USDT antes de tentar executar."
        actions = [
            {"label": "Preparar saldo", "href": "/swaps?mode=move", "tone": "accent"},
            {"label": "Abrir Radar", "href": "/radar", "tone": "neutral"},
        ]

    return {
        "reason": reason,
        "actions": actions,
    }


def _build_empty_state(readiness: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if readiness["level"] != "blocked":
        return None

    return {
        "title": "Nenhum saldo-base visivel ainda.",
        "description": "Conecte a wallet operacional correta ou envie USDT antes de abrir uma execucao.",
        "steps": [
            "Confirme se esta wallet e a conta operacional certa.",
            "Envie ou consolide USDT na rede que voce pretende usar.",
            "Garanta gas minimo antes de abrir o rail de execucao.",
        ],
    }


def build_vault_overview(address: Optional[str], network_key: Optional[str] = None) -> Dict[str, Any]:
    network = get_public_network_metadata(network_key or "scroll")

    if not address:
        disconnected_readiness = {
            "level": "disconnected",
            "label": "conectar carteira",
            "tone": "pending",
            "title": "Conecte uma wallet para abrir sua conta USDT-first.",
            "summary": "Sem wallet conectada o OS nao consegue ler saldo-base, gas e prontidao operacional.",
            "items": [
                {
                    "label": "Custodia",
                    "value": "wallet desconectada",
                    "detail": "O saldo permanece na wallet. Conecte uma wallet para o OS conseguir ler o estado da conta.",
                    "tone": "pending",
                },
                {
                    "label": "Saldo-base",
                    "value": "--",
                    "detail": "Nenhum USDT visivel enquanto a conta nao for conectada.",
                    "tone": "pending",
                },
                {
                    "label": "Gas",
                    "value": "--",
                    "detail": "Sem leitura de rede enquanto a conta estiver desconectada.",
                    "tone": "pending",
                },
                {
                    "label": "Execucao",
                    "value": "aguardando conexao",
                    "detail": "Conecte a wallet para carregar a conta operacional.",
                    "tone": "pending",
                },
            ],
        }
        aggregate = {
            "active_networks": 0,
            "visible_networks": 0,
            "primary_network": network,
            "total_value_display": "--",
        }
        return {
            "connected": False,
            "status": {"label": "offline", "tone": "pending"},
            "surface": {
                "address": None,
                "network": network["label"],
                "source": "registry",
                "mode": "read-only",
            },
            "network_meta": network,
            "aggregate": aggregate,
            "by_network": [],
            "hero": _build_hero(aggregate, disconnected_readiness),
            "balances": {
                "usdt": {
                    "label": "USDT",
                    "value": "--",
                    "detail": "Conecte uma wallet para ver o saldo-base.",
                    "tone": "pending",
                },
                "gas": {
                    "label": "Gas",
                    "value": "--",
                    "detail": "Conecte uma wallet para ver redes ativas e gas.",
                    "tone": "pending",
                },
                "other_assets": {
                    "label": "Outros ativos",
                    "value": "leitura USDT-first",
                    "detail": "O Vault prioriza USDT e gas na conta operacional.",
                    "tone": "pending",
                },
            },
            "posture": [],
            "protection": {
                "state": "A leitura USDT fica indisponivel ate a conexao de uma wallet.",
                "boundary": "Chaves e dispositivos continuam sendo a fronteira de protecao do Vault.",
            },
            "readiness": disconnected_readiness,
            "next_action": {
                "reason": "Conecte a wallet para carregar a conta operacional.",
                "actions": [
                    {"label": "Abrir Radar", "href": "/radar", "tone": "neutral"},
                ],
            },
            "empty_state": None,
            "source_of_truth": {
                "title": "Leitura organizada, sem custodia",
                "description": "O saldo permanece na wallet. O OS so le e organiza a conta operacional.",
            },
            "last_updated": datetime.utcnow().isoformat(),
        }

    positions = build_network_positions(address)
    requested_position = build_network_position(address, network["key"]) if network_key else None
    primary_position = select_primary_position(network_key, requested_position, positions)
    primary_network = primary_position["network"] if primary_position else network
    tx_count = primary_position["tx_count"] or 0
    account_type = primary_position["account_type"] or "wallet"
    has_activity = bool(primary_position["has_activity"])

    status = {"label": "capital online", "tone": "active"} if has_activity else {"label": "idle", "tone": "warning"}

    aggregate = build_aggregate(primary_position, positions)
    readiness = _build_readiness(positions, aggregate)
    balances = _build_balances(positions, aggregate, primary_position)
    next_action = _build_next_action(readiness)
    empty_state = _build_empty_state(readiness)

    return {
        "connected": True,
        "status": status,
        "surface": {
            "address": address,
            "network": primary_network["label"],
            "source": f"{primary_network['key']}-rpc",
            "mode": "read-only",
        },
        "network_meta": primary_network,
        "aggregate": aggregate,
        "by_network": positions,
        "hero": _build_hero(aggregate, readiness),
        "balances": balances,
        "posture": [
            {"label": "Tipo", "value": account_type},
            {"label": "Transações", "value": str(tx_count)},
            {"label": "Chaves", "value": "0"},
            {"label": "Dispositivos", "value": "0"},
        ],
        "protection": {
            "state": "A leitura USDT da wallet esta ativa. O Vault continua somente leitura e nao executa rotas.",
            "boundary": "Chaves e dispositivos seguem como fronteira de protecao. Leitura fica no Vault; execucao fica em Swaps.",
        },
        "readiness": readiness,
        "next_action": next_action,
        "empty_state": empty_state,
        "source_of_truth": {
            "title": "Leitura organizada, sem custodia",
            "description": "O saldo permanece na wallet. O OS so le, organiza e qualifica a conta operacional.",
        },
        "last_updated": datetime.utcnow().isoformat(),
    }
