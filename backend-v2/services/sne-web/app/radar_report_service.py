"""
Operational Radar report service.

Builds a report-style payload from the current SNE OS data sources without
depending on legacy report scripts or simulated chart helpers.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from .collector_client import get_klines
from .radar_service import build_radar_overview


SUPPORTED_TIMEFRAMES = {"1m", "5m", "15m", "30m", "1h", "4h", "8h", "12h", "1d"}
REPORT_TIMEFRAME_MAP = {
    "1m": ["1m", "5m", "15m"],
    "5m": ["1m", "5m", "15m", "30m"],
    "15m": ["5m", "15m", "30m", "1h"],
    "30m": ["15m", "30m", "1h", "4h"],
    "1h": ["15m", "30m", "1h", "4h"],
    "4h": ["1h", "4h", "12h", "1d"],
    "8h": ["1h", "4h", "8h", "1d"],
    "12h": ["4h", "8h", "12h", "1d"],
    "1d": ["4h", "12h", "1d"],
}
TIMEFRAME_MINUTES = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "4h": 240,
    "8h": 480,
    "12h": 720,
    "1d": 1440,
}


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _pct(value: float) -> float:
    return round(value * 100, 2)


def _normalize_symbol(symbol: str | None) -> str:
    cleaned = str(symbol or "BTCUSDT").upper().replace("/", "").strip()
    if not cleaned:
        return "BTCUSDT"
    if cleaned.endswith("USD") and not cleaned.endswith("USDT"):
        return f"{cleaned}T"
    return cleaned


def _normalize_timeframe(timeframe: str | None) -> str:
    value = str(timeframe or "1h").strip()
    return value if value in SUPPORTED_TIMEFRAMES else "1h"


def _valid_until(timeframe: str) -> str:
    minutes = TIMEFRAME_MINUTES.get(timeframe, 60)
    ttl_minutes = max(15, min(minutes, 240))
    return (datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)).isoformat()


def _normalize_candle(raw: Any) -> Optional[Dict[str, float]]:
    try:
        if isinstance(raw, dict):
            return {
                "timestamp": int(raw.get("timestamp") or raw.get("time") or raw.get("openTime") or 0),
                "open": _to_float(raw.get("open")),
                "high": _to_float(raw.get("high")),
                "low": _to_float(raw.get("low")),
                "close": _to_float(raw.get("close")),
                "volume": _to_float(raw.get("volume")),
            }
        if isinstance(raw, (list, tuple)) and len(raw) >= 6:
            return {
                "timestamp": int(raw[0]),
                "open": _to_float(raw[1]),
                "high": _to_float(raw[2]),
                "low": _to_float(raw[3]),
                "close": _to_float(raw[4]),
                "volume": _to_float(raw[5]),
            }
    except Exception:
        return None
    return None


def _fetch_candles(symbol: str, timeframe: str, limit: int = 160) -> List[Dict[str, float]]:
    try:
        raw = get_klines(symbol, timeframe, limit=limit)
    except Exception:
        return []
    candles = [_normalize_candle(item) for item in raw or []]
    return [item for item in candles if item and item["close"] > 0]


def _sma(values: List[float], period: int) -> Optional[float]:
    if len(values) < period:
        return None
    return sum(values[-period:]) / period


def _ema(values: List[float], period: int) -> Optional[float]:
    if len(values) < period:
        return None
    ema_value = sum(values[:period]) / period
    multiplier = 2 / (period + 1)
    for value in values[period:]:
        ema_value = (value - ema_value) * multiplier + ema_value
    return ema_value


def _rsi(values: List[float], period: int = 14) -> float:
    if len(values) < period + 1:
        return 50.0
    gains: List[float] = []
    losses: List[float] = []
    for previous, current in zip(values[-period - 1:-1], values[-period:]):
        change = current - previous
        gains.append(max(change, 0.0))
        losses.append(abs(min(change, 0.0)))
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def _atr(candles: List[Dict[str, float]], period: int = 14) -> float:
    if len(candles) < period + 1:
        return 0.0
    ranges: List[float] = []
    sample = candles[-period - 1:]
    for index in range(1, len(sample)):
        current = sample[index]
        previous = sample[index - 1]
        true_range = max(
            current["high"] - current["low"],
            abs(current["high"] - previous["close"]),
            abs(current["low"] - previous["close"]),
        )
        ranges.append(true_range)
    return sum(ranges) / len(ranges) if ranges else 0.0


def _volume_ratio(candles: List[Dict[str, float]], period: int = 20) -> float:
    if len(candles) < 2:
        return 0.0
    current = candles[-1]["volume"]
    sample = candles[-period - 1:-1] if len(candles) > period else candles[:-1]
    average = sum(item["volume"] for item in sample) / max(1, len(sample))
    return round(current / average, 2) if average else 0.0


def _distance_pct(price: float, level: float) -> float:
    if price <= 0:
        return 0.0
    return round(((level - price) / price) * 100, 2)


def _trend_label(price: float, ema8: Optional[float], ema21: Optional[float], sma50: Optional[float]) -> str:
    if ema8 and ema21 and price > ema8 > ema21 and (not sma50 or price > sma50):
        return "alta"
    if ema8 and ema21 and price < ema8 < ema21 and (not sma50 or price < sma50):
        return "baixa"
    return "lateral"


def _classify_regime(change_pct: float, trend: str, atr_pct: float) -> str:
    if atr_pct >= 4:
        return "volatil"
    if trend == "alta" and change_pct >= 0:
        return "compra dominante"
    if trend == "baixa" and change_pct <= 0:
        return "venda dominante"
    return "consolidacao"


def _indicators(candles: List[Dict[str, float]]) -> Dict[str, Any]:
    closes = [item["close"] for item in candles]
    price = closes[-1] if closes else 0.0
    ema8 = _ema(closes, 8)
    ema21 = _ema(closes, 21)
    sma50 = _sma(closes, 50)
    atr_value = _atr(candles)
    first_close = closes[0] if closes else price
    change_window = ((price - first_close) / first_close) if first_close else 0.0
    trend = _trend_label(price, ema8, ema21, sma50)
    atr_pct = (atr_value / price) * 100 if price else 0.0

    return {
        "price": round(price, 8),
        "change_window_pct": round(change_window * 100, 2),
        "trend": trend,
        "regime": _classify_regime(change_window, trend, atr_pct),
        "ema8": round(ema8, 8) if ema8 else None,
        "ema21": round(ema21, 8) if ema21 else None,
        "sma50": round(sma50, 8) if sma50 else None,
        "rsi": _rsi(closes),
        "atr": round(atr_value, 8),
        "atr_pct": round(atr_pct, 2),
        "volume_ratio": _volume_ratio(candles),
    }


def _score_timeframe(indicators: Dict[str, Any]) -> int:
    score = 45
    trend = indicators.get("trend")
    rsi = _to_float(indicators.get("rsi"), 50.0)
    volume_ratio = _to_float(indicators.get("volume_ratio"))
    atr_pct = _to_float(indicators.get("atr_pct"))

    if trend in {"alta", "baixa"}:
        score += 15
    if 42 <= rsi <= 68:
        score += 10
    elif rsi >= 75 or rsi <= 25:
        score -= 10
    if volume_ratio >= 1.15:
        score += 10
    elif volume_ratio and volume_ratio < 0.75:
        score -= 8
    if 0.2 <= atr_pct <= 3.5:
        score += 10
    elif atr_pct > 5:
        score -= 10
    return max(0, min(95, score))


def _levels(candles: List[Dict[str, float]], price: float) -> Dict[str, Any]:
    sample = candles[-80:] if len(candles) > 80 else candles
    lows = sorted({round(item["low"], 8) for item in sample if item["low"] < price}, reverse=True)
    highs = sorted({round(item["high"], 8) for item in sample if item["high"] > price})
    support = lows[:3]
    resistance = highs[:3]

    return {
        "supports": [
            {"price": level, "distance_pct": _distance_pct(price, level), "basis": "recent_low"}
            for level in support
        ],
        "resistances": [
            {"price": level, "distance_pct": _distance_pct(price, level), "basis": "recent_high"}
            for level in resistance
        ],
        "pivot": round((sample[-1]["high"] + sample[-1]["low"] + sample[-1]["close"]) / 3, 8) if sample else None,
    }


def _current_candle(candles: List[Dict[str, float]], timeframe: str) -> Dict[str, Any] | None:
    if not candles:
        return None
    candle = candles[-1]
    range_value = candle["high"] - candle["low"]
    body = abs(candle["close"] - candle["open"])
    direction = "alta" if candle["close"] > candle["open"] else "baixa" if candle["close"] < candle["open"] else "neutra"
    return {
        "timeframe": timeframe,
        "timestamp": candle["timestamp"],
        "open": candle["open"],
        "high": candle["high"],
        "low": candle["low"],
        "close": candle["close"],
        "volume": candle["volume"],
        "direction": direction,
        "range": round(range_value, 8),
        "body_pct": round((body / range_value) * 100, 2) if range_value else 0.0,
    }


def _multi_timeframe(symbol: str, primary_timeframe: str) -> Dict[str, Any]:
    frames = REPORT_TIMEFRAME_MAP.get(primary_timeframe, REPORT_TIMEFRAME_MAP["1h"])
    items: List[Dict[str, Any]] = []

    for timeframe in frames:
        candles = _fetch_candles(symbol, timeframe, limit=140)
        if not candles:
            items.append({
                "timeframe": timeframe,
                "status": "unavailable",
                "trend": "sem dados",
                "score": 0,
            })
            continue
        indicators = _indicators(candles)
        items.append({
            "timeframe": timeframe,
            "status": "ready",
            "trend": indicators["trend"],
            "regime": indicators["regime"],
            "score": _score_timeframe(indicators),
            "price": indicators["price"],
            "rsi": indicators["rsi"],
            "volume_ratio": indicators["volume_ratio"],
            "atr_pct": indicators["atr_pct"],
        })

    ready = [item for item in items if item.get("status") == "ready"]
    if not ready:
        return {"items": items, "alignment": "sem dados", "confluence_score": 0}

    trends = [item["trend"] for item in ready]
    dominant = max(set(trends), key=trends.count)
    alignment_count = trends.count(dominant)
    average_score = sum(int(item.get("score") or 0) for item in ready) / len(ready)
    alignment_bonus = (alignment_count / len(ready)) * 15
    confluence_score = int(max(0, min(95, average_score + alignment_bonus - 7)))

    return {
        "items": items,
        "alignment": dominant if alignment_count >= max(2, len(ready) // 2) else "misto",
        "confluence_score": confluence_score,
    }


def _scenario_side(
    side: str,
    price: float,
    atr_value: float,
    levels: Dict[str, Any],
    confluence_score: int,
) -> Dict[str, Any]:
    supports = levels.get("supports") or []
    resistances = levels.get("resistances") or []
    atr_floor = atr_value if atr_value > 0 else price * 0.01

    if side == "long":
        trigger = resistances[0]["price"] if resistances else price + (atr_floor * 0.5)
        stop = supports[0]["price"] if supports else price - atr_floor
        risk = max(trigger - stop, atr_floor * 0.5)
        tp1 = trigger + risk * 1.5
        tp2 = trigger + risk * 2.5
        conditions = [
            "Quebra ou retomada acima do gatilho com candle fechado.",
            "Volume acima da media recente.",
            "RSI sem exaustao extrema no momento da entrada.",
            "Liquidez suficiente para executar sem perseguir preco.",
        ]
    else:
        trigger = supports[0]["price"] if supports else price - (atr_floor * 0.5)
        stop = resistances[0]["price"] if resistances else price + atr_floor
        risk = max(stop - trigger, atr_floor * 0.5)
        tp1 = trigger - risk * 1.5
        tp2 = trigger - risk * 2.5
        conditions = [
            "Perda do suporte/gatilho com candle fechado.",
            "Volume vendedor acima da media recente.",
            "RSI sem sobreextensao que favoreca repique imediato.",
            "Spread e profundidade compativeis com o tamanho da ordem.",
        ]

    approved = confluence_score >= 70
    return {
        "side": side.upper(),
        "status": "watch" if approved else "conditional",
        "trigger": round(trigger, 8),
        "stop": round(stop, 8),
        "tp1": round(tp1, 8),
        "tp2": round(tp2, 8),
        "risk_reward_tp1": 1.5,
        "conditions": conditions,
        "note": "Cenario depende de confirmacao; nao e ordem automatica.",
    }


def _scenarios(price: float, indicators: Dict[str, Any], levels: Dict[str, Any], mtf: Dict[str, Any]) -> Dict[str, Any]:
    confluence_score = int(mtf.get("confluence_score") or 0)
    atr_value = _to_float(indicators.get("atr"))
    return {
        "base": {
            "bias": indicators.get("trend", "lateral"),
            "regime": indicators.get("regime", "consolidacao"),
            "confluence_score": confluence_score,
            "summary": "Aguardar confirmacao se a confluencia nao sustentar direcao operacional.",
        },
        "long": _scenario_side("long", price, atr_value, levels, confluence_score),
        "short": _scenario_side("short", price, atr_value, levels, confluence_score),
    }


def _risk_plan(indicators: Dict[str, Any], mtf: Dict[str, Any], overview: Dict[str, Any]) -> Dict[str, Any]:
    confluence = int(mtf.get("confluence_score") or 0)
    execution_label = ((overview.get("execution_risk") or {}).get("label") or "sem dados").lower()
    atr_pct = _to_float(indicators.get("atr_pct"))
    volume_ratio = _to_float(indicators.get("volume_ratio"))
    blockers: List[str] = []

    if confluence < 60:
        blockers.append("Confluencia multi-timeframe abaixo do nivel operacional.")
    if execution_label == "alto":
        blockers.append("Risco de execucao elevado no Radar.")
    if atr_pct > 5:
        blockers.append("Volatilidade acima da faixa normal do relatorio.")
    if volume_ratio and volume_ratio < 0.75:
        blockers.append("Volume atual abaixo da media recente.")

    if blockers:
        state = "observe"
        size_factor = 0.3
    elif confluence >= 75 and execution_label in {"controlado", "moderado"}:
        state = "ready"
        size_factor = 1.0
    else:
        state = "prepare"
        size_factor = 0.5

    return {
        "state": state,
        "risk_per_trade_pct": 1.0 if state != "ready" else 1.5,
        "position_size_factor": size_factor,
        "blockers": blockers or ["Sem bloqueio material identificado; ainda exigir confirmacao do setup."],
        "invalidation": "Invalidar a leitura se preco romper o lado oposto do range com volume acima da media.",
    }


def _operator_decision(
    symbol: str,
    indicators: Dict[str, Any],
    mtf: Dict[str, Any],
    risk_plan: Dict[str, Any],
) -> Dict[str, Any]:
    state = risk_plan["state"]
    trend = indicators.get("trend", "lateral")
    confluence = int(mtf.get("confluence_score") or 0)

    if state == "ready":
        title = f"{symbol} com contexto operacional preparado."
        summary = f"Tendencia {trend}, confluencia {confluence}/100 e risco sem bloqueio central."
        action = "Preparar execucao apenas apos gatilho confirmado."
    elif state == "prepare":
        title = f"{symbol} pede preparo, nao impulso."
        summary = f"Leitura {trend} com confluencia {confluence}/100; confirmar liquidez antes de rota."
        action = "Manter cenarios prontos e esperar confirmacao."
    else:
        title = f"{symbol} em modo observacao."
        summary = f"Confluencia {confluence}/100 ou risco operacional ainda limitam execucao."
        action = "Observar, atualizar niveis e evitar ordem sem confirmacao."

    return {
        "state": state,
        "title": title,
        "summary": summary,
        "checklist": [
            "Confirmar candle fechado no gatilho.",
            "Validar volume contra media recente.",
            "Checar spread/profundidade antes de enviar ordem.",
            "Respeitar invalidacao definida no relatorio.",
        ],
        "next_action": action,
    }


def _format_price(value: Any) -> str:
    number = _to_float(value)
    if number >= 100:
        return f"{number:,.2f}"
    if number >= 1:
        return f"{number:,.4f}"
    return f"{number:,.6f}"


def _state_label(state: str) -> str:
    labels = {
        "ready": "Ready",
        "prepare": "Prepare",
        "observe": "Observe",
    }
    return labels.get(str(state or "").lower(), str(state or "Observe").capitalize())


def _bias_label(bias: str) -> str:
    labels = {
        "alta": "altista",
        "baixa": "baixista",
        "lateral": "lateral",
        "sem dados": "sem dados",
    }
    return labels.get(str(bias or "").lower(), str(bias or "lateral").lower())


def _thesis_lines(payload: Dict[str, Any]) -> List[str]:
    summary = payload["executive_summary"]
    decision = payload["operator_decision"]
    state = str(decision.get("state") or "observe")
    bias = _bias_label(str(summary.get("bias") or "lateral"))
    confluence = int(summary.get("confluence_score") or 0)

    if state == "ready":
        return [
            f"Viés {bias} com confluência forte e contexto operacional preparado.",
            "Executar apenas após gatilho confirmado; não antecipar a rota.",
        ]
    if state == "prepare":
        quality = "boa" if confluence >= 65 else "moderada"
        return [
            f"Viés {bias} com {quality} confluência, mas ainda sem gatilho validado.",
            "Não perseguir preço. Preparar execução apenas em confirmação.",
        ]
    return [
        f"Viés {bias} ainda sem confluência suficiente para execução.",
        "Preservar capital, atualizar níveis e aguardar confirmação objetiva.",
    ]


def _halo_line(payload: Dict[str, Any]) -> str:
    summary = payload["executive_summary"]
    risk = payload["risk_plan"]
    state = str((payload.get("operator_decision") or {}).get("state") or "observe")
    volume_ratio = _to_float(summary.get("volume_ratio"))
    blockers = risk.get("blockers") or []

    if state == "ready":
        return "Gatilho manda; sem confirmação, sem execução."
    if volume_ratio and volume_ratio < 0.8:
        return "Volume ainda precisa validar a leitura antes da execução."
    if blockers and "liquidez" in " ".join(str(item).lower() for item in blockers):
        return "Liquidez precisa confirmar antes da execução."
    return "Liquidez precisa confirmar antes da execução."


def _report_text(payload: Dict[str, Any]) -> str:
    summary = payload["executive_summary"]
    scenarios = payload["scenarios"]
    risk = payload["risk_plan"]
    decision = payload["operator_decision"]
    levels = payload["technical"]["levels"]

    support = levels["supports"][0]["price"] if levels.get("supports") else "N/A"
    resistance = levels["resistances"][0]["price"] if levels.get("resistances") else "N/A"
    long_scenario = scenarios["long"]
    short_scenario = scenarios["short"]

    return "\n".join([
        f"SNE RADAR  {payload['symbol']} ({payload['timeframe']})",
        "",
        "ESTADO",
        _state_label(str(decision.get("state") or "")),
        "",
        "TESE",
        *_thesis_lines(payload),
        "",
        "NÍVEIS",
        f"Suporte: {_format_price(support)}",
        f"Resistência: {_format_price(resistance)}",
        "",
        "CENÁRIOS",
        f"LONG acima de {_format_price(long_scenario['trigger'])}",
        f"Stop: {_format_price(long_scenario['stop'])}",
        f"TP1: {_format_price(long_scenario['tp1'])}",
        "",
        f"SHORT abaixo de {_format_price(short_scenario['trigger'])}",
        f"Stop: {_format_price(short_scenario['stop'])}",
        f"TP1: {_format_price(short_scenario['tp1'])}",
        "",
        "RISCO",
        f"Confluência: {summary['confluence_score']}/100",
        f"Tamanho: {risk['position_size_factor']}x",
        f"Risco/op: {risk['risk_per_trade_pct']}%",
        "",
        "HALO",
        _halo_line(payload),
    ]).strip()


def build_radar_report(
    symbol: str | None = None,
    timeframe: str | None = None,
    *,
    authenticated: bool = False,
    has_access: bool = False,
) -> Dict[str, Any]:
    normalized_symbol = _normalize_symbol(symbol)
    normalized_timeframe = _normalize_timeframe(timeframe)
    overview = build_radar_overview(normalized_symbol, authenticated, has_access, normalized_timeframe)
    candles = _fetch_candles(normalized_symbol, normalized_timeframe, limit=180)

    data_quality = {
        "candles": "ready" if candles else "unavailable",
        "overview": "ready" if overview.get("market_state") else "unavailable",
        "dom": "not_available",
    }

    if not candles:
        payload = {
            "symbol": normalized_symbol,
            "timeframe": normalized_timeframe,
            "generated_at": _iso_now(),
            "valid_until": _valid_until(normalized_timeframe),
            "status": "degraded",
            "data_quality": data_quality,
            "executive_summary": {
                "headline": f"{normalized_symbol} sem candles suficientes para relatorio operacional.",
                "summary": "O Radar tem snapshot de mercado, mas nao recebeu OHLCV suficiente para cenarios.",
                "bias": "sem dados",
                "confluence_score": 0,
            },
            "market_context": overview,
            "technical": {"current_candle": None, "indicators": {}, "levels": {"supports": [], "resistances": []}},
            "multi_timeframe": {"items": [], "alignment": "sem dados", "confluence_score": 0},
            "scenarios": {},
            "risk_plan": {"state": "observe", "blockers": ["Candles indisponiveis."]},
            "operator_decision": {
                "state": "observe",
                "title": "Aguardar dados.",
                "summary": "Sem OHLCV suficiente para montar cenarios.",
                "checklist": [],
                "next_action": "Reprocessar quando o collector responder.",
            },
            "report_text": "",
        }
        payload["report_text"] = _report_text(payload) if payload["scenarios"] else payload["executive_summary"]["summary"]
        return payload

    indicators = _indicators(candles)
    price = _to_float(indicators.get("price"))
    levels = _levels(candles, price)
    mtf = _multi_timeframe(normalized_symbol, normalized_timeframe)
    scenarios = _scenarios(price, indicators, levels, mtf)
    risk = _risk_plan(indicators, mtf, overview)
    decision = _operator_decision(normalized_symbol, indicators, mtf, risk)
    confluence_score = int(mtf.get("confluence_score") or 0)

    payload = {
        "symbol": normalized_symbol,
        "timeframe": normalized_timeframe,
        "generated_at": _iso_now(),
        "valid_until": _valid_until(normalized_timeframe),
        "status": "ready",
        "data_quality": data_quality,
        "executive_summary": {
            "headline": decision["title"],
            "summary": decision["summary"],
            "bias": indicators["trend"],
            "regime": indicators["regime"],
            "confluence_score": confluence_score,
            "price": indicators["price"],
            "rsi": indicators["rsi"],
            "atr_pct": indicators["atr_pct"],
            "volume_ratio": indicators["volume_ratio"],
        },
        "market_context": {
            "regime": overview.get("market_regime"),
            "focus_asset": overview.get("focus_asset"),
            "execution_risk": overview.get("execution_risk"),
            "rankings": overview.get("rankings"),
            "last_updated": overview.get("last_updated"),
        },
        "technical": {
            "current_candle": _current_candle(candles, normalized_timeframe),
            "indicators": indicators,
            "levels": levels,
        },
        "multi_timeframe": mtf,
        "scenarios": scenarios,
        "risk_plan": risk,
        "operator_decision": decision,
        "report_text": "",
    }
    payload["report_text"] = _report_text(payload)
    return payload
