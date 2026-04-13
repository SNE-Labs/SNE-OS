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


def build_radar_overview(active_symbol: Optional[str], authenticated: bool, has_access: bool, timeframe: str = "24H") -> Dict[str, Any]:
    movers = get_radar_snapshot(limit=6)
    featured = next((item for item in movers if item["symbol"] == active_symbol), None) if active_symbol else None
    if featured is None and movers:
        featured = movers[0]

    signal = derive_signal_from_ticker(featured, timeframe) if featured else None

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
            "metrics": [
                {"label": "Pares ativos", "value": f"{len(movers)} ao vivo" if movers else "0 ao vivo"},
                {"label": "Par em foco", "value": featured["symbol"] if featured else (active_symbol or "--")},
                {"label": "Sinal", "value": signal["signal"] if signal else "--"},
            ],
        },
        "market_state": {
            "label": "Ao vivo." if movers else "Sem dados.",
            "access": "completo" if has_access else "prévia",
            "execution": "bloqueada",
        },
        "featured": featured,
        "signal": signal,
        "universe": movers,
        "last_updated": datetime.utcnow().isoformat(),
    }
