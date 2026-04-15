"""
Radar service for SNE OS.
Builds regime-first market and decision view models for the Radar page.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from .collector_client import get_live_market_snapshot


def _to_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def derive_signal_from_ticker(ticker: Dict[str, Any], timeframe: str = "24H") -> Dict[str, Any]:
    change_pct = _to_float(ticker.get("change24h")) * 100
    abs_change = abs(change_pct)
    signal = "BUY" if change_pct >= 2 else "SELL" if change_pct <= -2 else "HOLD"
    strength = "Strong" if abs_change >= 5 else "Moderate" if abs_change >= 2 else "Weak"
    score = min(int(abs_change * 12), 95)

    return {
        "symbol": ticker["symbol"],
        "signal": signal,
        "strength": strength,
        "timeframe": timeframe,
        "updated": datetime.utcnow().isoformat(),
        "change": f"{change_pct:+.2f}%",
        "score": score,
        "price": ticker["price"],
    }


def get_radar_snapshot(limit: int = 6) -> List[Dict[str, Any]]:
    return get_live_market_snapshot(limit=limit)


def _market_regime(markets: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not markets:
        return {
            "label": "sem dados",
            "tone": "pending",
            "avg_change_24h": 0.0,
            "summary": "O Radar ainda nao tem snapshot suficiente para classificar o mercado.",
        }

    avg_change = sum(_to_float(item.get("change24h")) for item in markets) / len(markets)
    positive = sum(1 for item in markets if _to_float(item.get("change24h")) > 0)
    negative = sum(1 for item in markets if _to_float(item.get("change24h")) < 0)

    if avg_change >= 0.015 and positive >= max(3, len(markets) // 2):
        return {
            "label": "compra dominante",
            "tone": "active",
            "avg_change_24h": avg_change,
            "summary": "Fluxo comprador domina o universo liquido monitorado pelo Radar.",
        }
    if avg_change <= -0.015 and negative >= max(3, len(markets) // 2):
        return {
            "label": "venda dominante",
            "tone": "warning",
            "avg_change_24h": avg_change,
            "summary": "Pressao vendedora domina a janela atual do universo Radar.",
        }
    return {
        "label": "mercado misto",
        "tone": "pending",
        "avg_change_24h": avg_change,
        "summary": "Mercado dividido, sem direcao clara entre compra e venda.",
    }


def _build_rankings(markets: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    base = [
        {
            "symbol": item["symbol"],
            "price": item["price"],
            "change24h": item["change24h"],
            "volume": item["volume"],
            "score": item.get("score", 0),
        }
        for item in markets
    ]

    momentum = sorted(
        base,
        key=lambda item: (abs(_to_float(item.get("change24h"))), _to_float(item.get("score"))),
        reverse=True,
    )[:5]
    liquidity = sorted(
        base,
        key=lambda item: _to_float(item.get("volume")),
        reverse=True,
    )[:5]

    return {
        "momentum": momentum,
        "liquidity": liquidity,
    }


def _confidence_label(score: float) -> Dict[str, str]:
    if score >= 75:
        return {"label": "alta", "tone": "success"}
    if score >= 45:
        return {"label": "moderada", "tone": "active"}
    return {"label": "baixa", "tone": "warning"}


def _liquidity_label(symbol: str, liquidity_rankings: List[Dict[str, Any]]) -> Dict[str, str]:
    rank = next((index + 1 for index, item in enumerate(liquidity_rankings) if item["symbol"] == symbol), None)
    if rank == 1:
        return {"label": "lider", "tone": "success"}
    if rank and rank <= 3:
        return {"label": "forte", "tone": "active"}
    if rank:
        return {"label": "adequada", "tone": "pending"}
    return {"label": "estreita", "tone": "warning"}


def _execution_risk(
    featured: Optional[Dict[str, Any]],
    market_regime: Dict[str, Any],
    rankings: Dict[str, List[Dict[str, Any]]],
    authenticated: bool,
    has_access: bool,
) -> Dict[str, Any]:
    if not featured:
        return {
            "label": "sem dados",
            "tone": "pending",
            "score": 0,
            "summary": "Sem ativo em foco para avaliar risco de execucao.",
            "blockers": ["O Radar nao retornou um ativo em foco nesta janela."],
        }

    change_pct = abs(_to_float(featured.get("change24h")) * 100)
    score = min(int(change_pct * 8), 95)
    liquidity = _liquidity_label(featured["symbol"], rankings["liquidity"])
    blockers: List[str] = []

    if not authenticated:
        score += 15
        blockers.append("Sessao sem wallet autenticada.")
    if not has_access:
        score += 15
        blockers.append("Modo de acesso em previa.")
    if liquidity["label"] in {"adequada", "estreita"}:
        score += 20 if liquidity["label"] == "estreita" else 10
        blockers.append("Liquidez abaixo da lideranca do universo monitorado.")
    if change_pct >= 5:
        score += 20
        blockers.append("Amplitude recente elevada no ativo em foco.")
    elif change_pct >= 2:
        score += 10
    if market_regime.get("label") == "mercado misto":
        score += 15
        blockers.append("Regime sem dominancia clara entre compra e venda.")

    score = min(score, 95)

    if score >= 70:
        return {
            "label": "alto",
            "tone": "warning",
            "score": score,
            "summary": "Execucao com maior risco de slippage, leitura confusa ou continuidade instavel.",
            "blockers": blockers or ["Contexto de execucao ainda exige cautela."],
        }
    if score >= 40:
        return {
            "label": "moderado",
            "tone": "pending",
            "score": score,
            "summary": "Execucao possivel, mas ainda depende de disciplina de rota e confirmacao de contexto.",
            "blockers": blockers or ["Revisar rota e liquidez antes de executar."],
        }
    return {
        "label": "controlado",
        "tone": "success",
        "score": score,
        "summary": "Liquidez e regime estao coerentes para considerar uma execucao com USDT.",
        "blockers": blockers or ["Sem bloqueio material identificado na leitura atual."],
    }


def _build_focus_asset(
    featured: Optional[Dict[str, Any]],
    signal: Optional[Dict[str, Any]],
    rankings: Dict[str, List[Dict[str, Any]]],
) -> Optional[Dict[str, Any]]:
    if not featured:
        return None

    score = int(signal.get("score") or 0) if signal else 0
    confidence = _confidence_label(score)
    liquidity = _liquidity_label(featured["symbol"], rankings["liquidity"])

    return {
        "symbol": featured["symbol"],
        "price": featured["price"],
        "change24h": featured["change24h"],
        "volume": featured["volume"],
        "score": score,
        "confidence": confidence,
        "liquidity": liquidity,
    }


def _build_hero(
    market_regime: Dict[str, Any],
    focus_asset: Optional[Dict[str, Any]],
    execution_risk: Dict[str, Any],
) -> Dict[str, Any]:
    if not focus_asset:
        return {
            "headline": "Regime sem ativo em foco.",
            "summary": "O Radar esta sincronizando o universo monitorado antes de sugerir uma decisao.",
            "metrics": [],
        }

    return {
        "headline": f"{market_regime['label'].capitalize()} com {focus_asset['symbol']} em foco.",
        "summary": "O Radar qualifica o momento antes da execucao: regime, score, confianca, liquidez e risco de rota.",
        "metrics": [
            {
                "label": "Regime",
                "value": market_regime["label"],
                "detail": market_regime["summary"],
                "tone": market_regime["tone"],
            },
            {
                "label": "Ativo em foco",
                "value": focus_asset["symbol"],
                "detail": f"{_to_float(focus_asset['change24h']) * 100:+.2f}% na janela monitorada.",
                "tone": "active",
            },
            {
                "label": "Score",
                "value": str(focus_asset["score"]),
                "detail": "Forca relativa do sinal do ativo em foco.",
                "tone": focus_asset["confidence"]["tone"],
            },
            {
                "label": "Confianca",
                "value": focus_asset["confidence"]["label"],
                "detail": "Conviccao derivada de score e amplitude recente.",
                "tone": focus_asset["confidence"]["tone"],
            },
            {
                "label": "Liquidez",
                "value": focus_asset["liquidity"]["label"],
                "detail": "Posicao relativa no universo monitorado.",
                "tone": focus_asset["liquidity"]["tone"],
            },
            {
                "label": "Risco de execucao",
                "value": execution_risk["label"],
                "detail": execution_risk["summary"],
                "tone": execution_risk["tone"],
            },
        ],
    }


def _build_next_action(
    focus_asset: Optional[Dict[str, Any]],
    execution_risk: Dict[str, Any],
    authenticated: bool,
    has_access: bool,
) -> Dict[str, Any]:
    symbol = focus_asset["symbol"] if focus_asset else "ETHUSDT"
    swaps_href = f"/swaps?mode=trade&origin=radar&symbol={symbol}"
    intel_href = "/intel"
    observe_href = f"/radar/{symbol.lower()}"

    if not authenticated or not has_access:
        state = "intel-first"
        title = "Contexto antes da execucao."
        summary = "Sem wallet autenticada ou sem acesso completo, o Radar prioriza leitura e observacao."
        actions = [
            {"label": "Ler Intel", "href": intel_href, "tone": "accent", "kind": "intel", "recommended": True},
            {"label": "Observar", "href": observe_href, "tone": "neutral", "kind": "observe", "recommended": False},
            {"label": "Executar com USDT", "href": swaps_href, "tone": "neutral", "kind": "execute", "recommended": False},
            {"label": "Evitar execucao agora", "href": observe_href, "tone": "neutral", "kind": "avoid", "recommended": False},
        ]
    elif execution_risk["label"] == "alto":
        state = "avoid"
        title = "Evitar execucao agora."
        summary = "O risco de execucao esta elevado para transformar esta leitura em rota agora."
        actions = [
            {"label": "Evitar execucao agora", "href": observe_href, "tone": "accent", "kind": "avoid", "recommended": True},
            {"label": "Ler Intel", "href": intel_href, "tone": "neutral", "kind": "intel", "recommended": False},
            {"label": "Observar", "href": observe_href, "tone": "neutral", "kind": "observe", "recommended": False},
            {"label": "Executar com USDT", "href": swaps_href, "tone": "neutral", "kind": "execute", "recommended": False},
        ]
    elif execution_risk["label"] == "moderado":
        state = "observe"
        title = "Observar e preparar."
        summary = "Ha contexto para acompanhar, mas a decisao ainda pede confirmacao de liquidez e continuidade."
        actions = [
            {"label": "Observar", "href": observe_href, "tone": "accent", "kind": "observe", "recommended": True},
            {"label": "Ler Intel", "href": intel_href, "tone": "neutral", "kind": "intel", "recommended": False},
            {"label": "Executar com USDT", "href": swaps_href, "tone": "neutral", "kind": "execute", "recommended": False},
            {"label": "Evitar execucao agora", "href": observe_href, "tone": "neutral", "kind": "avoid", "recommended": False},
        ]
    else:
        state = "execute"
        title = "Contexto apto para execucao."
        summary = "Regime, liquidez e score sustentam uma decisao com USDT como unidade base."
        actions = [
            {"label": "Executar com USDT", "href": swaps_href, "tone": "accent", "kind": "execute", "recommended": True},
            {"label": "Ler Intel", "href": intel_href, "tone": "neutral", "kind": "intel", "recommended": False},
            {"label": "Observar", "href": observe_href, "tone": "neutral", "kind": "observe", "recommended": False},
            {"label": "Evitar execucao agora", "href": observe_href, "tone": "neutral", "kind": "avoid", "recommended": False},
        ]

    return {
        "state": state,
        "title": title,
        "summary": summary,
        "actions": actions,
    }


def build_radar_overview(active_symbol: Optional[str], authenticated: bool, has_access: bool, timeframe: str = "24H") -> Dict[str, Any]:
    markets = get_radar_snapshot(limit=12)
    movers = markets[:6]
    featured = next((item for item in movers if item["symbol"] == active_symbol), None) if active_symbol else None
    if featured is None and movers:
        featured = movers[0]

    signal = derive_signal_from_ticker(featured, timeframe) if featured else None
    market_regime = _market_regime(markets)
    rankings = _build_rankings(markets)
    focus_asset = _build_focus_asset(featured, signal, rankings)
    execution_risk = _execution_risk(featured, market_regime, rankings, authenticated, has_access)
    next_action = _build_next_action(focus_asset, execution_risk, authenticated, has_access)

    if not authenticated:
        execution = {"label": "offline", "tone": "pending"}
    elif not has_access:
        execution = {"label": "preview", "tone": "warning"}
    else:
        execution = {"label": "ready", "tone": "active"}

    return {
        "execution": execution,
        "hero": _build_hero(market_regime, focus_asset, execution_risk),
        "market_state": {
            "label": "Ao vivo." if movers else "Sem dados.",
            "access": "completo" if has_access else "previa",
            "execution": next_action["state"],
        },
        "market_regime": market_regime,
        "rankings": rankings,
        "featured": featured,
        "focus_asset": focus_asset,
        "execution_risk": execution_risk,
        "next_action": next_action,
        "universe_summary": {
            "title": "Universo monitorado",
            "summary": "Liquidez viva, regime relativo e selecao rapida do ativo em foco.",
        },
        "signal": signal,
        "universe": movers,
        "last_updated": datetime.utcnow().isoformat(),
    }
