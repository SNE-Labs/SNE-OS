#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Indicadores técnicos avançados para análise de mercado"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional

def calculate_bollinger_bands(df: pd.DataFrame, window: int = 20, num_std: float = 2) -> Dict[str, float]:
    """Calcula Bollinger Bands (média móvel + bandas superior e inferior)."""
    if df.empty or 'close' not in df.columns or len(df) < window:
        return {"upper": 0.0, "middle": 0.0, "lower": 0.0, "width": 0.0}
    
    close = df['close']
    middle = close.rolling(window=window).mean()
    std = close.rolling(window=window).std()
    
    upper = middle + (std * num_std)
    lower = middle - (std * num_std)
    width = (upper - lower) / middle * 100  # Bandwidth em %
    
    return {
        "upper": upper.iloc[-1] if not upper.empty else 0.0,
        "middle": middle.iloc[-1] if not middle.empty else 0.0,
        "lower": lower.iloc[-1] if not lower.empty else 0.0,
        "width": width.iloc[-1] if not width.empty else 0.0
    }

def calculate_stochastic(df: pd.DataFrame, k_period: int = 14, d_period: int = 3) -> Dict[str, float]:
    """Calcula Stochastic Oscillator (%K e %D)."""
    if df.empty or len(df) < k_period:
        return {"k": 50.0, "d": 50.0, "signal": "neutral"}
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    lowest_low = low.rolling(window=k_period).min()
    highest_high = high.rolling(window=k_period).max()
    
    k_percent = 100 * ((close - lowest_low) / (highest_high - lowest_low))
    d_percent = k_percent.rolling(window=d_period).mean()
    
    k_val = k_percent.iloc[-1] if not k_percent.empty else 50.0
    d_val = d_percent.iloc[-1] if not d_percent.empty else 50.0
    
    # Determinar sinal
    if k_val > 80 and d_val > 80:
        signal = "overbought"
    elif k_val < 20 and d_val < 20:
        signal = "oversold"
    else:
        signal = "neutral"
    
    return {"k": k_val, "d": d_val, "signal": signal}

def calculate_williams_r(df: pd.DataFrame, period: int = 14) -> Dict[str, float]:
    """Calcula Williams %R."""
    if df.empty or len(df) < period:
        return {"value": -50.0, "signal": "neutral"}
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    highest_high = high.rolling(window=period).max()
    lowest_low = low.rolling(window=period).min()
    
    williams_r = -100 * ((highest_high - close) / (highest_high - lowest_low))
    wr_val = williams_r.iloc[-1] if not williams_r.empty else -50.0
    
    # Determinar sinal
    if wr_val > -20:
        signal = "overbought"
    elif wr_val < -80:
        signal = "oversold"
    else:
        signal = "neutral"
    
    return {"value": wr_val, "signal": signal}

def calculate_atr(df: pd.DataFrame, period: int = 14) -> Dict[str, float]:
    """Calcula Average True Range (ATR)."""
    if df.empty or len(df) < period:
        return {"atr": 0.0, "atr_percent": 0.0}
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    # True Range
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    
    true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = true_range.rolling(window=period).mean()
    
    atr_val = atr.iloc[-1] if not atr.empty else 0.0
    atr_percent = (atr_val / close.iloc[-1]) * 100 if not close.empty else 0.0
    
    return {"atr": atr_val, "atr_percent": atr_percent}

def calculate_cci(df: pd.DataFrame, period: int = 20) -> Dict[str, float]:
    """Calcula Commodity Channel Index (CCI)."""
    if df.empty or len(df) < period:
        return {"value": 0.0, "signal": "neutral"}
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    # Typical Price
    tp = (high + low + close) / 3
    
    # Simple Moving Average of TP
    sma_tp = tp.rolling(window=period).mean()
    
    # Mean Deviation
    mean_dev = tp.rolling(window=period).apply(lambda x: np.mean(np.abs(x - x.mean())))
    
    # CCI
    cci = (tp - sma_tp) / (0.015 * mean_dev)
    cci_val = cci.iloc[-1] if not cci.empty else 0.0
    
    # Determinar sinal
    if cci_val > 100:
        signal = "overbought"
    elif cci_val < -100:
        signal = "oversold"
    else:
        signal = "neutral"
    
    return {"value": cci_val, "signal": signal}

def calculate_obv(df: pd.DataFrame) -> Dict[str, float]:
    """Calcula On-Balance Volume (OBV)."""
    if df.empty or 'close' not in df.columns or 'volume' not in df.columns:
        return {"obv": 0.0, "obv_trend": "neutral"}
    
    close = df['close']
    volume = df['volume']
    
    # Calcular mudanças de preço
    price_change = close.diff()
    
    # Calcular OBV
    obv = np.where(price_change > 0, volume, 
                   np.where(price_change < 0, -volume, 0)).cumsum()
    
    obv_series = pd.Series(obv, index=df.index)
    obv_val = obv_series.iloc[-1] if not obv_series.empty else 0.0
    
    # Determinar tendência (últimos 5 períodos)
    if len(obv_series) >= 5:
        recent_obv = obv_series.tail(5)
        if recent_obv.iloc[-1] > recent_obv.iloc[0]:
            trend = "bullish"
        elif recent_obv.iloc[-1] < recent_obv.iloc[0]:
            trend = "bearish"
        else:
            trend = "neutral"
    else:
        trend = "neutral"
    
    return {"obv": obv_val, "obv_trend": trend}

def calculate_adx(df: pd.DataFrame, period: int = 14) -> Dict[str, float]:
    """Calcula Average Directional Index (ADX)."""
    if df.empty or len(df) < period + 1:
        return {"adx": 0.0, "di_plus": 0.0, "di_minus": 0.0, "trend": "neutral"}
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    # True Range
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # Directional Movement
    dm_plus = np.where((high.diff() > low.diff().abs()) & (high.diff() > 0), high.diff(), 0)
    dm_minus = np.where((low.diff().abs() > high.diff()) & (low.diff() < 0), low.diff().abs(), 0)
    
    # Smoothed values
    tr_smooth = tr.rolling(window=period).mean()
    dm_plus_smooth = pd.Series(dm_plus, index=df.index).rolling(window=period).mean()
    dm_minus_smooth = pd.Series(dm_minus, index=df.index).rolling(window=period).mean()
    
    # Directional Indicators
    di_plus = 100 * (dm_plus_smooth / tr_smooth)
    di_minus = 100 * (dm_minus_smooth / tr_smooth)
    
    # ADX
    dx = 100 * abs(di_plus - di_minus) / (di_plus + di_minus)
    adx = dx.rolling(window=period).mean()
    
    adx_val = adx.iloc[-1] if not adx.empty else 0.0
    di_plus_val = di_plus.iloc[-1] if not di_plus.empty else 0.0
    di_minus_val = di_minus.iloc[-1] if not di_minus.empty else 0.0
    
    # Determinar tendência
    if adx_val > 25:
        if di_plus_val > di_minus_val:
            trend = "strong_uptrend"
        else:
            trend = "strong_downtrend"
    elif adx_val > 20:
        if di_plus_val > di_minus_val:
            trend = "weak_uptrend"
        else:
            trend = "weak_downtrend"
    else:
        trend = "sideways"
    
    return {
        "adx": adx_val,
        "di_plus": di_plus_val,
        "di_minus": di_minus_val,
        "trend": trend
    }

def calculate_all_indicators(df: pd.DataFrame) -> Dict[str, any]:
    """Calcula todos os indicadores técnicos avançados."""
    if df.empty:
        return {}
    
    indicators = {}
    
    try:
        indicators["bollinger"] = calculate_bollinger_bands(df)
    except Exception as e:
        indicators["bollinger"] = {"error": str(e)}
    
    try:
        indicators["stochastic"] = calculate_stochastic(df)
    except Exception as e:
        indicators["stochastic"] = {"error": str(e)}
    
    try:
        indicators["williams_r"] = calculate_williams_r(df)
    except Exception as e:
        indicators["williams_r"] = {"error": str(e)}
    
    try:
        indicators["atr"] = calculate_atr(df)
    except Exception as e:
        indicators["atr"] = {"error": str(e)}
    
    try:
        indicators["cci"] = calculate_cci(df)
    except Exception as e:
        indicators["cci"] = {"error": str(e)}
    
    try:
        indicators["obv"] = calculate_obv(df)
    except Exception as e:
        indicators["obv"] = {"error": str(e)}
    
    try:
        indicators["adx"] = calculate_adx(df)
    except Exception as e:
        indicators["adx"] = {"error": str(e)}
    
    return indicators

