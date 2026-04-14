"""
Radar service for SNE OS.
Builds curated market and signal view models for the Radar page.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from .collector_client import get_live_market_snapshot


def derive_signal_from_ticker(ticker: Dict[str, Any], timeframe: str = "24H") -> Dict[str, Any]:
    change_pct = float(ticker["change24h"]) * 100
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

    avg_change = sum(float(item.get("change24h", 0) or 0) for item in markets) / len(markets)
    positive = sum(1 for item in markets if float(item.get("change24h", 0) or 0) > 0)
    negative = sum(1 for item in markets if float(item.get("change24h", 0) or 0) < 0)

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
        key=lambda item: (abs(float(item.get("change24h", 0) or 0)), float(item.get("score", 0) or 0)),
        reverse=True,
    )[:5]
    liquidity = sorted(
        base,
        key=lambda item: float(item.get("volume", 0) or 0),
        reverse=True,
    )[:5]

    return {
        "momentum": momentum,
        "liquidity": liquidity,
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

    if not authenticated:
        execution = {"label": "offline", "tone": "pending"}
    elif not has_access:
        execution = {"label": "preview", "tone": "warning"}
    else:
        execution = {"label": "ready", "tone": "active"}

    return {
        "execution": execution,
        "hero": {
            "headline": "Mercados líquidos. Sinais em tempo real.",
            "summary": "Acompanhe os pares mais ativos do universo SNE e leia sinais direcionais antes de executar.",
            "metrics": [],
        },
        "market_state": {
            "label": "Ao vivo." if movers else "Sem dados.",
            "access": "completo" if has_access else "prévia",
            "execution": "bloqueada",
        },
        "market_regime": market_regime,
        "rankings": rankings,
        "featured": featured,
        "signal": signal,
        "universe": movers,
        "last_updated": datetime.utcnow().isoformat(),
    }
