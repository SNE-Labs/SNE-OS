#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Indicadores profissionais: Ichimoku, Fibonacci, Pivot Points"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional

def calculate_ichimoku(df: pd.DataFrame, tenkan_period: int = 9, kijun_period: int = 26, 
                      senkou_span_b_period: int = 52, displacement: int = 26) -> Dict[str, any]:
    """Calcula Ichimoku Cloud (Nuvem de Ichimoku)."""
    if df.empty or len(df) < max(tenkan_period, kijun_period, senkou_span_b_period):
        return {"error": "Dados insuficientes para Ichimoku"}
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    # Tenkan-sen (Linha de Conversão)
    tenkan_high = high.rolling(window=tenkan_period).max()
    tenkan_low = low.rolling(window=tenkan_period).min()
    tenkan_sen = (tenkan_high + tenkan_low) / 2
    
    # Kijun-sen (Linha de Base)
    kijun_high = high.rolling(window=kijun_period).max()
    kijun_low = low.rolling(window=kijun_period).min()
    kijun_sen = (kijun_high + kijun_low) / 2
    
    # Senkou Span A (Primeira Linha da Nuvem)
    senkou_span_a = ((tenkan_sen + kijun_sen) / 2).shift(displacement)
    
    # Senkou Span B (Segunda Linha da Nuvem)
    senkou_span_b_high = high.rolling(window=senkou_span_b_period).max()
    senkou_span_b_low = low.rolling(window=senkou_span_b_period).min()
    senkou_span_b = ((senkou_span_b_high + senkou_span_b_low) / 2).shift(displacement)
    
    # Chikou Span (Linha de Atraso)
    chikou_span = close.shift(-displacement)
    
    # Valores atuais
    current_price = close.iloc[-1]
    current_tenkan = tenkan_sen.iloc[-1] if not tenkan_sen.empty else 0
    current_kijun = kijun_sen.iloc[-1] if not kijun_sen.empty else 0
    current_senkou_a = senkou_span_a.iloc[-1] if not senkou_span_a.empty else 0
    current_senkou_b = senkou_span_b.iloc[-1] if not senkou_span_b.empty else 0
    current_chikou = chikou_span.iloc[-1] if not chikou_span.empty else 0
    
    # Determinar posição em relação à nuvem
    cloud_top = max(current_senkou_a, current_senkou_b)
    cloud_bottom = min(current_senkou_a, current_senkou_b)
    
    if current_price > cloud_top:
        cloud_position = "above_cloud"
        cloud_signal = "bullish"
    elif current_price < cloud_bottom:
        cloud_position = "below_cloud"
        cloud_signal = "bearish"
    else:
        cloud_position = "inside_cloud"
        cloud_signal = "neutral"
    
    # Sinal de cruzamento Tenkan/Kijun
    if current_tenkan > current_kijun:
        tk_signal = "bullish"
    elif current_tenkan < current_kijun:
        tk_signal = "bearish"
    else:
        tk_signal = "neutral"
    
    return {
        "tenkan_sen": current_tenkan,
        "kijun_sen": current_kijun,
        "senkou_span_a": current_senkou_a,
        "senkou_span_b": current_senkou_b,
        "chikou_span": current_chikou,
        "cloud_position": cloud_position,
        "cloud_signal": cloud_signal,
        "tk_signal": tk_signal,
        "cloud_thickness": abs(current_senkou_a - current_senkou_b)
    }

def calculate_fibonacci_retracements(df: pd.DataFrame, lookback_period: int = 50) -> Dict[str, any]:
    """Calcula níveis de Fibonacci baseados em swing high/low."""
    if df.empty or len(df) < lookback_period:
        return {"error": "Dados insuficientes para Fibonacci"}
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    # Encontrar swing high e swing low no período
    recent_high = high.tail(lookback_period).max()
    recent_low = low.tail(lookback_period).min()
    
    # Calcular diferença
    diff = recent_high - recent_low
    
    # Níveis de Fibonacci
    fib_levels = {
        "0%": recent_high,
        "23.6%": recent_high - (diff * 0.236),
        "38.2%": recent_high - (diff * 0.382),
        "50%": recent_high - (diff * 0.5),
        "61.8%": recent_high - (diff * 0.618),
        "78.6%": recent_high - (diff * 0.786),
        "100%": recent_low
    }
    
    current_price = close.iloc[-1]
    
    # Determinar qual nível de Fibonacci está mais próximo
    closest_level = None
    min_distance = float('inf')
    
    for level, price in fib_levels.items():
        distance = abs(current_price - price)
        if distance < min_distance:
            min_distance = distance
            closest_level = level
    
    # Determinar direção da tendência
    if current_price > (recent_high + recent_low) / 2:
        trend = "uptrend"
    else:
        trend = "downtrend"
    
    # Calcular extensões de Fibonacci (para projeções)
    fib_extensions = {
        "127.2%": recent_low + (diff * 1.272),
        "161.8%": recent_low + (diff * 1.618),
        "200%": recent_low + (diff * 2.0),
        "261.8%": recent_low + (diff * 2.618)
    }
    
    return {
        "swing_high": recent_high,
        "swing_low": recent_low,
        "current_price": current_price,
        "trend": trend,
        "closest_level": closest_level,
        "retracements": fib_levels,
        "extensions": fib_extensions,
        "range": diff
    }

def calculate_pivot_points(df: pd.DataFrame, method: str = "standard") -> Dict[str, any]:
    """Calcula Pivot Points (Standard, Fibonacci, Camarilla, Woodie)."""
    if df.empty:
        return {"error": "Dados insuficientes para Pivot Points"}
    
    # Usar dados do dia anterior (última vela)
    prev_high = df['high'].iloc[-1]
    prev_low = df['low'].iloc[-1]
    prev_close = df['close'].iloc[-1]
    
    # Pivot Point base
    pivot = (prev_high + prev_low + prev_close) / 3
    
    if method == "standard":
        # Standard Pivot Points
        r1 = (2 * pivot) - prev_low
        s1 = (2 * pivot) - prev_high
        r2 = pivot + (prev_high - prev_low)
        s2 = pivot - (prev_high - prev_low)
        r3 = prev_high + 2 * (pivot - prev_low)
        s3 = prev_low - 2 * (prev_high - pivot)
        
        levels = {
            "r3": r3, "r2": r2, "r1": r1,
            "pivot": pivot,
            "s1": s1, "s2": s2, "s3": s3
        }
        
    elif method == "fibonacci":
        # Fibonacci Pivot Points
        diff = prev_high - prev_low
        r1 = pivot + (0.382 * diff)
        r2 = pivot + (0.618 * diff)
        r3 = pivot + (1.000 * diff)
        s1 = pivot - (0.382 * diff)
        s2 = pivot - (0.618 * diff)
        s3 = pivot - (1.000 * diff)
        
        levels = {
            "r3": r3, "r2": r2, "r1": r1,
            "pivot": pivot,
            "s1": s1, "s2": s2, "s3": s3
        }
        
    elif method == "camarilla":
        # Camarilla Pivot Points
        r1 = prev_close + (1.1 * (prev_high - prev_low) / 12)
        r2 = prev_close + (1.1 * (prev_high - prev_low) / 6)
        r3 = prev_close + (1.1 * (prev_high - prev_low) / 4)
        r4 = prev_close + (1.1 * (prev_high - prev_low) / 2)
        s1 = prev_close - (1.1 * (prev_high - prev_low) / 12)
        s2 = prev_close - (1.1 * (prev_high - prev_low) / 6)
        s3 = prev_close - (1.1 * (prev_high - prev_low) / 4)
        s4 = prev_close - (1.1 * (prev_high - prev_low) / 2)
        
        levels = {
            "r4": r4, "r3": r3, "r2": r2, "r1": r1,
            "pivot": prev_close,
            "s1": s1, "s2": s2, "s3": s3, "s4": s4
        }
        
    elif method == "woodie":
        # Woodie Pivot Points
        pivot = (prev_high + prev_low + 2 * prev_close) / 4
        r1 = (2 * pivot) - prev_low
        s1 = (2 * pivot) - prev_high
        r2 = pivot + (prev_high - prev_low)
        s2 = pivot - (prev_high - prev_low)
        
        levels = {
            "r2": r2, "r1": r1,
            "pivot": pivot,
            "s1": s1, "s2": s2
        }
    
    current_price = df['close'].iloc[-1]
    
    # Determinar zona atual
    if current_price > levels.get("r1", pivot):
        zone = "resistance_zone"
    elif current_price < levels.get("s1", pivot):
        zone = "support_zone"
    else:
        zone = "neutral_zone"
    
    return {
        "method": method,
        "current_price": current_price,
        "zone": zone,
        "levels": levels,
        "prev_high": prev_high,
        "prev_low": prev_low,
        "prev_close": prev_close
    }

def calculate_volume_profile(df: pd.DataFrame, bins: int = 20) -> Dict[str, any]:
    """Calcula Volume Profile (perfil de volume)."""
    if df.empty or 'volume' not in df.columns:
        return {"error": "Dados de volume insuficientes"}
    
    high = df['high']
    low = df['low']
    volume = df['volume']
    
    # Calcular range de preços
    price_min = low.min()
    price_max = high.max()
    price_range = price_max - price_min
    
    if price_range == 0:
        return {"error": "Range de preços inválido"}
    
    # Criar bins de preço
    bin_size = price_range / bins
    price_bins = [price_min + i * bin_size for i in range(bins + 1)]
    
    # Calcular volume por bin
    volume_by_bin = {}
    for i in range(len(price_bins) - 1):
        bin_low = price_bins[i]
        bin_high = price_bins[i + 1]
        bin_volume = 0
        
        for idx, row in df.iterrows():
            # Volume proporcional se a vela cruza múltiplos bins
            if row['low'] < bin_high and row['high'] > bin_low:
                overlap_low = max(row['low'], bin_low)
                overlap_high = min(row['high'], bin_high)
                overlap_ratio = (overlap_high - overlap_low) / (row['high'] - row['low'])
                bin_volume += row['volume'] * overlap_ratio
        
        volume_by_bin[f"{bin_low:.2f}-{bin_high:.2f}"] = bin_volume
    
    # Encontrar POC (Point of Control) - bin com maior volume
    poc_bin = max(volume_by_bin, key=volume_by_bin.get)
    poc_volume = volume_by_bin[poc_bin]
    
    # Calcular VAH (Value Area High) e VAL (Value Area Low)
    total_volume = sum(volume_by_bin.values())
    value_area_volume = total_volume * 0.7  # 70% do volume total
    
    sorted_bins = sorted(volume_by_bin.items(), key=lambda x: x[1], reverse=True)
    cumulative_volume = 0
    value_area_bins = []
    
    for bin_name, vol in sorted_bins:
        cumulative_volume += vol
        value_area_bins.append(bin_name)
        if cumulative_volume >= value_area_volume:
            break
    
    return {
        "poc": poc_bin,
        "poc_volume": poc_volume,
        "value_area_bins": value_area_bins,
        "total_volume": total_volume,
        "volume_by_bin": volume_by_bin,
        "price_range": {"min": price_min, "max": price_max}
    }

def calculate_market_structure(df: pd.DataFrame, lookback: int = 20) -> Dict[str, any]:
    """Analisa estrutura de mercado (Higher Highs, Lower Lows, etc.)."""
    if df.empty or len(df) < lookback:
        return {"error": "Dados insuficientes para análise de estrutura"}
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    # Encontrar swing highs e lows
    recent_highs = high.tail(lookback)
    recent_lows = low.tail(lookback)
    
    # Identificar padrões de estrutura
    current_price = close.iloc[-1]
    
    # Higher Highs / Lower Highs
    if len(recent_highs) >= 2:
        if recent_highs.iloc[-1] > recent_highs.iloc[-2]:
            high_structure = "higher_high"
        elif recent_highs.iloc[-1] < recent_highs.iloc[-2]:
            high_structure = "lower_high"
        else:
            high_structure = "equal_high"
    else:
        high_structure = "insufficient_data"
    
    # Higher Lows / Lower Lows
    if len(recent_lows) >= 2:
        if recent_lows.iloc[-1] > recent_lows.iloc[-2]:
            low_structure = "higher_low"
        elif recent_lows.iloc[-1] < recent_lows.iloc[-2]:
            low_structure = "lower_low"
        else:
            low_structure = "equal_low"
    else:
        low_structure = "insufficient_data"
    
    # Determinar tendência geral
    if high_structure == "higher_high" and low_structure == "higher_low":
        trend_structure = "bullish"
    elif high_structure == "lower_high" and low_structure == "lower_low":
        trend_structure = "bearish"
    elif high_structure == "higher_high" and low_structure == "lower_low":
        trend_structure = "mixed_bullish"
    elif high_structure == "lower_high" and low_structure == "higher_low":
        trend_structure = "mixed_bearish"
    else:
        trend_structure = "sideways"
    
    # Calcular força da tendência
    price_change = (current_price - close.iloc[-lookback]) / close.iloc[-lookback] * 100
    
    return {
        "high_structure": high_structure,
        "low_structure": low_structure,
        "trend_structure": trend_structure,
        "trend_strength": abs(price_change),
        "current_price": current_price,
        "lookback_period": lookback
    }

def calculate_all_professional_indicators(df: pd.DataFrame) -> Dict[str, any]:
    """Calcula todos os indicadores profissionais."""
    if df.empty:
        return {}
    
    indicators = {}
    
    try:
        indicators["ichimoku"] = calculate_ichimoku(df)
    except Exception as e:
        indicators["ichimoku"] = {"error": str(e)}
    
    try:
        indicators["fibonacci"] = calculate_fibonacci_retracements(df)
    except Exception as e:
        indicators["fibonacci"] = {"error": str(e)}
    
    try:
        indicators["pivot_standard"] = calculate_pivot_points(df, "standard")
    except Exception as e:
        indicators["pivot_standard"] = {"error": str(e)}
    
    try:
        indicators["pivot_fibonacci"] = calculate_pivot_points(df, "fibonacci")
    except Exception as e:
        indicators["pivot_fibonacci"] = {"error": str(e)}
    
    try:
        indicators["pivot_camarilla"] = calculate_pivot_points(df, "camarilla")
    except Exception as e:
        indicators["pivot_camarilla"] = {"error": str(e)}
    
    try:
        indicators["volume_profile"] = calculate_volume_profile(df)
    except Exception as e:
        indicators["volume_profile"] = {"error": str(e)}
    
    try:
        indicators["market_structure"] = calculate_market_structure(df)
    except Exception as e:
        indicators["market_structure"] = {"error": str(e)}
    
    return indicators



