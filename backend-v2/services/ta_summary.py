#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Resumo técnico multi-timeframe baseado em indicadores locais"""

from typing import Dict, Any
import pandas as pd
from .indicators import ema, sma, rsi, macd


def summarize(df: pd.DataFrame) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    if df is None or df.empty:
        return {"status": "empty"}

    close = df["close"].astype(float)
    ema8 = ema(close, 8)
    ema21 = ema(close, 21)
    sma200 = sma(close, 200 if len(close) >= 200 else max(20, len(close) // 2))
    rsi14 = rsi(close, 14)
    macd_line, signal_line, hist = macd(close)

    latest = {
        "ema8": float(ema8.iloc[-1]),
        "ema21": float(ema21.iloc[-1]),
        "sma200": float(sma200.iloc[-1]) if not pd.isna(sma200.iloc[-1]) else None,
        "rsi": float(rsi14.iloc[-1]),
        "macd": float(macd_line.iloc[-1]),
        "macd_signal": float(signal_line.iloc[-1]),
        "macd_hist": float(hist.iloc[-1])
    }

    score = 0
    if latest["ema8"] > latest["ema21"]:
        score += 1
    if latest["rsi"] >= 30 and latest["rsi"] <= 70:
        score += 1
    if latest["macd_hist"] > 0:
        score += 1

    if score >= 3:
        summary = "BUY"
    elif score == 2:
        summary = "NEUTRAL"
    else:
        summary = "SELL"

    out.update({"latest": latest, "summary": summary, "score": score})
    return out



